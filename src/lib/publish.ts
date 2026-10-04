import type { Post } from "@prisma/client";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

function publicUrl(key: string) {
  const base = process.env.S3_PUBLIC_URL;
  if (!base) throw new Error("S3_PUBLIC_URL is not set");
  return `${base.replace(/\/$/, "")}/${key}`;
}

// Posts to the user's first connected Facebook Page: text, one photo or one video.
async function postToFacebook(userId: string, text: string, mediaKey?: string) {
  const page = await prisma.socialAccount.findFirst({
    where: { userId, platform: "FACEBOOK" },
    orderBy: { id: "asc" },
  });
  if (!page) throw new Error("No Facebook Page connected");

  const params = new URLSearchParams({ access_token: decrypt(page.accessToken) });
  let path = "feed";
  if (mediaKey) {
    const isVideo = /\.mp4$/i.test(mediaKey);
    path = isVideo ? "videos" : "photos";
    params.set(isVideo ? "file_url" : "url", publicUrl(mediaKey));
    params.set(isVideo ? "description" : "caption", text);
  } else {
    params.set("message", text);
  }

  const res = await fetch(`${GRAPH}/${page.externalId}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Facebook error");
  return data.id as string;
}

export async function publishPost(post: Post): Promise<{ ok: boolean; error?: string }> {
  const errors: string[] = [];
  for (const platform of post.platforms) {
    try {
      if (platform === "FACEBOOK") await postToFacebook(post.userId, post.text, post.mediaKeys[0]);
      else throw new Error("publishing is not built yet");
    } catch (e) {
      errors.push(`${platform}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  return errors.length ? { ok: false, error: errors.join("; ").slice(0, 500) } : { ok: true };
}
