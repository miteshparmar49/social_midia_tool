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

// Posts one JPG photo to the user's Instagram professional account.
async function postToInstagram(userId: string, text: string, mediaKey?: string) {
  if (!mediaKey) throw new Error("Instagram needs a photo");
  if (!/\.jpe?g$/i.test(mediaKey)) throw new Error("Instagram needs a JPG photo (video is not supported yet)");
  const acct = await prisma.socialAccount.findFirst({ where: { userId, platform: "INSTAGRAM" }, orderBy: { id: "asc" } });
  if (!acct) throw new Error("No Instagram account connected");
  if (acct.expiresAt && acct.expiresAt < new Date()) throw new Error("Instagram connection expired. Please reconnect.");

  const token = decrypt(acct.accessToken);
  const call = async (path: string, body: Record<string, string>) => {
    const res = await fetch(`https://graph.instagram.com/v21.0/${acct.externalId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` },
      body: new URLSearchParams(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? "Instagram error");
    return data;
  };

  const container = await call("media", { image_url: publicUrl(mediaKey), caption: text.slice(0, 2200) });
  await new Promise((r) => setTimeout(r, 2000)); // let Instagram finish reading the image
  const published = await call("media_publish", { creation_id: container.id });
  return published.id as string;
}

export async function publishPost(post: Post): Promise<{ ok: boolean; error?: string }> {
  const errors: string[] = [];
  for (const platform of post.platforms) {
    try {
      if (platform === "FACEBOOK") await postToFacebook(post.userId, post.text, post.mediaKeys[0]);
      else if (platform === "INSTAGRAM") await postToInstagram(post.userId, post.text, post.mediaKeys[0]);
      else throw new Error("publishing is not built yet");
    } catch (e) {
      errors.push(`${platform}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  return errors.length ? { ok: false, error: errors.join("; ").slice(0, 500) } : { ok: true };
}
