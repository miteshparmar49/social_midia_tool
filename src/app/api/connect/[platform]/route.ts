import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { Platform } from "@prisma/client";
import { getOAuth, isOAuthPlatform } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { encrypt } from "@/lib/crypto";

type Ctx = { params: Promise<{ platform: string }> };

// Start OAuth (Instagram / Facebook / LinkedIn)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { platform } = await params;
  if (!isOAuthPlatform(platform)) return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  const o = getOAuth(platform);
  const state = randomBytes(16).toString("hex");
  const url = new URL(o.authUrl);
  url.search = new URLSearchParams({
    client_id: o.id,
    redirect_uri: `${process.env.APP_URL}/api/connect/${platform}/callback`,
    scope: o.scope,
    response_type: "code",
    state,
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, { httpOnly: true, maxAge: 600, sameSite: "lax", path: "/" });
  return res;
}

// WhatsApp has no OAuth here: send { phoneNumberId, token } from Meta WhatsApp Cloud API
const waSchema = z.object({ phoneNumberId: z.string().min(5), token: z.string().min(20) });

export async function POST(req: NextRequest, { params }: Ctx) {
  const { platform } = await params;
  if (platform !== "whatsapp") return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  const body = waSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const userId = await getUserId();
  await prisma.socialAccount.upsert({
    where: { userId_platform_externalId: { userId, platform: "WHATSAPP", externalId: body.data.phoneNumberId } },
    update: { accessToken: encrypt(body.data.token) },
    create: { userId, platform: "WHATSAPP", externalId: body.data.phoneNumberId, handle: body.data.phoneNumberId, accessToken: encrypt(body.data.token) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { platform } = await params;
  const userId = await getUserId();
  await prisma.socialAccount.deleteMany({ where: { userId, platform: platform.toUpperCase() as Platform } });
  return NextResponse.json({ ok: true });
}
