import type { Post } from "@prisma/client";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

// Posts to the user's first connected Facebook Page (text only for now).
async function postToFacebook(userId: string, text: string) {
  const page = await prisma.socialAccount.findFirst({
    where: { userId, platform: "FACEBOOK" },
    orderBy: { id: "asc" },
  });
  if (!page) throw new Error("No Facebook Page connected");
  const res = await fetch(`${GRAPH}/${page.externalId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message: text, access_token: decrypt(page.accessToken) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Facebook error");
  return data.id as string;
}

export async function publishPost(post: Post): Promise<{ ok: boolean; error?: string }> {
  const errors: string[] = [];
  for (const platform of post.platforms) {
    try {
      if (platform === "FACEBOOK") await postToFacebook(post.userId, post.text);
      else throw new Error("publishing is not built yet");
    } catch (e) {
      errors.push(`${platform}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  return errors.length ? { ok: false, error: errors.join("; ").slice(0, 500) } : { ok: true };
}
