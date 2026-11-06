// src/app/api/ai/generate/route.ts
// Writes platform-wise post text ("generate") and improves existing text ("refine") using the Claude API.
// The API key stays on the server (ANTHROPIC_API_KEY in .env / Vercel), never in the browser.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/user";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

// ---------------------------------------------------------------
// Monthly AI limit for each plan (every Generate / button click = 1 use)
// Change these numbers any time.
// ---------------------------------------------------------------
const AI_LIMITS: Record<string, number> = {
  FREE: 11,
  PRO: 300,
  BUSINESS: 1500,
};

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

async function getUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan ?? "FREE";
  const limit = AI_LIMITS[plan] ?? AI_LIMITS.FREE;

  const used = await prisma.aiUsage.count({
    where: { userId, createdAt: { gte: monthStart() } },
  });

  return { plan, limit, used };
}

const planLabel = (plan: string) => plan.charAt(0) + plan.slice(1).toLowerCase();

// Shows "used / limit" in the composer
export async function GET() {
  try {
    const userId = await getUserId();
    return NextResponse.json(await getUsage(userId));
  } catch {
    return NextResponse.json({ error: "Could not load AI usage" }, { status: 500 });
  }
}

const PLATFORMS = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP", "YOUTUBE"] as const;
type Platform = (typeof PLATFORMS)[number];

const LANGUAGES = ["English", "Gujarati", "Hindi"] as const;

const generateSchema = z.object({
  mode: z.literal("generate"),
  idea: z.string().min(3).max(1000),
  platforms: z.array(z.enum(PLATFORMS)).min(1),
  tone: z.string().max(30).default("Professional"),
  language: z.enum(LANGUAGES).default("English"),
  length: z.enum(["Short", "Medium", "Long"]).default("Medium"),
});

const REFINE_ACTIONS = {
  shorter: "Make the text shorter and tighter. Keep the key message.",
  longer: "Expand the text with a little more useful detail. Do not add made-up facts.",
  grammar: "Fix spelling and grammar only. Keep the wording, tone and language as they are.",
  catchy: "Rewrite it to be more catchy and engaging, with a strong first line.",
  emojis: "Add a few fitting emojis in natural places. Do not change the wording much.",
  hashtags: "Keep the text and add 5 to 8 relevant hashtags at the end.",
  translate_gu: "Translate the text into Gujarati. Keep emojis and hashtags.",
  translate_en: "Translate the text into English. Keep emojis and hashtags.",
  translate_hi: "Translate the text into Hindi. Keep emojis and hashtags.",
} as const;

const refineSchema = z.object({
  mode: z.literal("refine"),
  action: z.enum(Object.keys(REFINE_ACTIONS) as [keyof typeof REFINE_ACTIONS, ...(keyof typeof REFINE_ACTIONS)[]]),
  text: z.string().min(1).max(3000),
  platform: z.enum(PLATFORMS).optional(),
});

const schema = z.discriminatedUnion("mode", [generateSchema, refineSchema]);

// Style rules for each network
const PLATFORM_RULES: Record<Platform, string> = {
  INSTAGRAM:
    "Instagram caption: a strong first line, friendly and visual, a few emojis, then 5 to 10 relevant hashtags at the end. Under 2200 characters.",
  FACEBOOK:
    "Facebook post: conversational and warm, 1 to 3 short paragraphs, a few emojis, at most 3 hashtags.",
  LINKEDIN:
    "LinkedIn post: professional but human, a hook in the first line, short paragraphs with line breaks, minimal emojis, 3 to 5 hashtags at the end.",
  YOUTUBE:
    "YouTube: the FIRST LINE is the video title (max 100 characters, no emojis, no hashtags). Then a blank line, then the description: a hook, 2 to 4 key points, a call to action, and 3 to 5 hashtags at the end.",
  WHATSAPP:
    "WhatsApp message: short, direct and friendly, at most 3 lines, one or two emojis, no hashtags.",
};

const LENGTH_HINT: Record<string, string> = {
  Short: "Keep each text short (about 1 to 3 lines, under 300 characters).",
  Medium: "Keep each text medium length (about 400 to 700 characters).",
  Long: "Make each text detailed (about 900 to 1500 characters) while staying within the platform limits.",
};

const COMMON_RULES = [
  "Write plain text only. Never use markdown: no ** bold, no # headings, no bullet symbols like * or -. Use line breaks and emojis instead.",
  "Do not invent facts, prices, offers, dates or statistics that the user did not give.",
  "Return only what was asked for, with no introduction or explanation.",
].join(" ");

// ---------------------------------------------------------------
// Claude API call
// ---------------------------------------------------------------
async function askClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    throw new Error("AI is not configured yet (ANTHROPIC_API_KEY is missing).");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Claude API error:", res.status, JSON.stringify(data?.error));
    throw new Error(data?.error?.message || `AI request failed (status ${res.status})`);
  }

  // Shows in the server logs which model answered and how many tokens it used
  console.log("AI model used:", data?.model, "tokens:", JSON.stringify(data?.usage));

  // Keep only the text blocks
  const text = ((data?.content ?? []) as { type: string; text?: string }[])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("AI returned an empty answer. Please try again.");
  }

  return text;
}

// Remove markdown that social networks do not render (**bold**, # headings)
function cleanText(t: string): string {
  return t
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^```[a-z]*\n?|```$/gim, "")
    .trim();
}

function parseJson(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(stripped);
  } catch {
    // Try to pick out the JSON object if the model added extra words
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error("Could not read the AI answer. Please try again.");
  }
}

// ---------------------------------------------------------------
// Route
// ---------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // Only logged-in users can use AI (this also protects your API credit)
    const userId = await getUserId();

    const body = schema.safeParse(await req.json());

    if (!body.success) {
      return NextResponse.json({ error: "Please check your input and try again." }, { status: 400 });
    }

    const data = body.data;

    // ---- Monthly limit of the user's plan ----
    const usage = await getUsage(userId);

    if (usage.used >= usage.limit) {
      return NextResponse.json(
        {
          error: `You have used all ${usage.limit} AI uses of the ${planLabel(usage.plan)} plan this month. Upgrade your plan to continue.`,
          code: "LIMIT",
          usage,
        },
        { status: 429 }
      );
    }

    // ---- Write a post for every selected platform ----
    if (data.mode === "generate") {
      const platforms = Array.from(new Set(data.platforms));

      const system = [
        "You are an expert social media copywriter for small businesses.",
        COMMON_RULES,
        `Write in ${data.language}. Tone: ${data.tone}.`,
        LENGTH_HINT[data.length],
      ].join(" ");

      const user = [
        `Post idea: ${data.idea}`,
        "",
        "Write a separate post for each platform below, following that platform's style:",
        ...platforms.map((p) => `- ${p}: ${PLATFORM_RULES[p]}`),
        "",
        `Return ONLY a JSON object with the keys ${platforms.map((p) => `"${p}"`).join(", ")} and the finished post text as each value. No other text.`,
      ].join("\n");

      const raw = await askClaude(system, user, 3000);
      const parsed = parseJson(raw);

      const texts: Record<string, string> = {};
      for (const p of platforms) {
        const value = parsed[p];
        if (typeof value === "string" && value.trim()) {
          texts[p] = cleanText(value).slice(0, 3000);
        }
      }

      if (!Object.keys(texts).length) {
        throw new Error("AI could not write the post. Please try again.");
      }

      // Count the use only after the AI answered successfully
      await prisma.aiUsage.create({ data: { userId, kind: "generate" } });

      return NextResponse.json({ texts, usage: { ...usage, used: usage.used + 1 } });
    }

    // ---- Improve one existing text ----
    const system = [
      "You are an expert social media editor.",
      COMMON_RULES,
      data.platform ? `The text is for ${data.platform}. ${PLATFORM_RULES[data.platform]}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const user = [
      `Task: ${REFINE_ACTIONS[data.action]}`,
      "",
      "Text:",
      data.text,
      "",
      "Return ONLY the final text.",
    ].join("\n");

    const out = await askClaude(system, user, 2000);

    await prisma.aiUsage.create({ data: { userId, kind: "refine" } });

    return NextResponse.json({
      text: cleanText(out).slice(0, 3000),
      usage: { ...usage, used: usage.used + 1 },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI request failed";
    console.error("AI GENERATE ERROR:", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}