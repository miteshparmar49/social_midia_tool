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

// Posts one JPG photo or one MP4 video (published as a Reel) to the user's Instagram professional account.
async function postToInstagram(userId: string, text: string, mediaKey?: string) {
  if (!mediaKey) throw new Error("Instagram needs a photo or video");
  const isVideo = /\.mp4$/i.test(mediaKey);
  if (!isVideo && !/\.jpe?g$/i.test(mediaKey)) throw new Error("Instagram needs a JPG photo or an MP4 video");

  const acct = await prisma.socialAccount.findFirst({ where: { userId, platform: "INSTAGRAM" }, orderBy: { id: "asc" } });
  if (!acct) throw new Error("No Instagram account connected");
  if (acct.expiresAt && acct.expiresAt < new Date()) throw new Error("Instagram connection expired. Please reconnect.");

  const token = decrypt(acct.accessToken);
  const auth = { Authorization: `Bearer ${token}` };
  const call = async (path: string, body: Record<string, string>) => {
    const res = await fetch(`https://graph.instagram.com/v21.0/${acct.externalId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", ...auth },
      body: new URLSearchParams(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? "Instagram error");
    return data;
  };

  const caption = text.slice(0, 2200);
  const container = await call(
    "media",
    isVideo
      ? { media_type: "REELS", video_url: publicUrl(mediaKey), caption }
      : { image_url: publicUrl(mediaKey), caption }
  );

  if (isVideo) {
    // Instagram processes a video in the background, so wait until it is ready.
    const deadline = Date.now() + 50_000;
    for (;;) {
      const st = await (
        await fetch(`https://graph.instagram.com/v21.0/${container.id}?fields=status_code`, { headers: auth })
      ).json();
      if (st.status_code === "FINISHED") break;
      if (st.status_code === "ERROR" || st.status_code === "EXPIRED") throw new Error("Instagram could not process the video");
      if (Date.now() > deadline) throw new Error("Instagram is still processing the video. Please schedule it again.");
      await new Promise((r) => setTimeout(r, 3000));
    }
  } else {
    await new Promise((r) => setTimeout(r, 2000));
  }

  const published = await call("media_publish", { creation_id: container.id });
  return published.id as string;
}

const LI_VERSION = process.env.LINKEDIN_API_VERSION ?? "202609";

// LinkedIn treats these characters as formatting, so escape them to show the text as typed.
const liEscape = (t: string) => t.replace(/[\\|{}@\[\]()<>*_~]/g, (c) => `\\${c}`);

// Posts text, or text with one JPG/PNG photo, to the member's own LinkedIn profile.
async function postToLinkedIn(userId: string, text: string, mediaKey?: string) {
  const acct = await prisma.socialAccount.findFirst({ where: { userId, platform: "LINKEDIN" }, orderBy: { id: "asc" } });
  if (!acct) throw new Error("No LinkedIn account connected");
  if (acct.expiresAt && acct.expiresAt < new Date()) throw new Error("LinkedIn connection expired. Please reconnect.");
  if (mediaKey && /\.mp4$/i.test(mediaKey)) throw new Error("LinkedIn video is not supported yet");
  if (mediaKey && !/\.(jpe?g|png)$/i.test(mediaKey)) throw new Error("LinkedIn needs a JPG or PNG photo");

  const token = decrypt(acct.accessToken);
  const author = `urn:li:person:${acct.externalId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "LinkedIn-Version": LI_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };

  let content: { media: { id: string; altText: string } } | undefined;
  if (mediaKey) {
    const init = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
      method: "POST",
      headers,
      body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    });
    const initData = await init.json().catch(() => ({}));
    if (!init.ok) throw new Error(initData?.message ?? `LinkedIn image upload failed (${init.status})`);
    const file = await fetch(publicUrl(mediaKey));
    if (!file.ok) throw new Error("Could not read the uploaded photo");
    const put = await fetch(initData.value.uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: await file.blob(),
    });
    if (!put.ok) throw new Error(`LinkedIn image upload failed (${put.status})`);
    content = { media: { id: initData.value.image, altText: text.slice(0, 120) } };
  }

  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      author,
      commentary: liEscape(text).slice(0, 3000),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      ...(content ? { content } : {}),
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.message ?? `LinkedIn error ${res.status}`);
  }
  return res.headers.get("x-restli-id") ?? "";
}


async function postToYouTube(
  userId: string,
  text: string,
  mediaKey?: string
) {
  if (!mediaKey) {
    throw new Error("YouTube needs an MP4 video");
  }

  if (!/\.mp4$/i.test(mediaKey)) {
    throw new Error("YouTube currently supports MP4 videos only");
  }

  const acct = await prisma.socialAccount.findFirst({
    where: { userId, platform: "YOUTUBE" },
    orderBy: { id: "asc" },
  });

  if (!acct) {
    throw new Error("No YouTube account connected");
  }

  if (acct.expiresAt && acct.expiresAt < new Date()) {
    throw new Error(
      "YouTube access token expired. Reconnect or refresh the Google token."
    );
  }

  const token = decrypt(acct.accessToken);

  // Read the video stored in Cloudflare R2.
  const file = await fetch(publicUrl(mediaKey));

  if (!file.ok) {
    throw new Error(
      `Could not read video from R2 (${file.status}). Check S3_PUBLIC_URL and object access.`
    );
  }

  const contentType = file.headers.get("content-type") || "video/mp4";
  const video = await file.arrayBuffer();

  if (video.byteLength === 0) {
    throw new Error("The video file is empty");
  }

  // Start a YouTube resumable upload session.
  const initUrl = new URL(
    "https://www.googleapis.com/upload/youtube/v3/videos"
  );

  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");

  const title =
    text.trim().split(/\r?\n/)[0].slice(0, 100) || "Scheduled video";

  const init = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(video.byteLength),
      "X-Upload-Content-Type": contentType,
    },
    body: JSON.stringify({
      snippet: {
        title,
        description: text,
        categoryId: "22",
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    }),
  });

  if (!init.ok) {
    const details = await init.text();
    throw new Error(
      `YouTube upload initialization failed (${init.status}): ${details.slice(0, 350)}`
    );
  }

  const uploadUrl = init.headers.get("location");

  if (!uploadUrl) {
    throw new Error("YouTube did not return an upload URL");
  }

  // Upload the actual MP4 bytes to YouTube.
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: video,
  });

  const result = await uploaded.json().catch(() => ({}));

  if (!uploaded.ok) {
    throw new Error(
      `YouTube video upload failed (${uploaded.status}): ${
        result?.error?.message || JSON.stringify(result).slice(0, 300)
      }`
    );
  }

  if (!result.id) {
    throw new Error("YouTube upload completed without returning a video ID");
  }

  return result.id as string;
}


// export async function publishPost(post: Post): Promise<{ ok: boolean; error?: string }> {
//   const errors: string[] = [];
//   for (const platform of post.platforms) {
//     try {
//       if (platform === "FACEBOOK") await postToFacebook(post.userId, post.text, post.mediaKeys[0]);
//       else if (platform === "INSTAGRAM") await postToInstagram(post.userId, post.text, post.mediaKeys[0]);
//       else if (platform === "LINKEDIN") await postToLinkedIn(post.userId, post.text, post.mediaKeys[0]);
//       else throw new Error("publishing is not built yet");
//     } catch (e) {
//       errors.push(`${platform}: ${e instanceof Error ? e.message : "failed"}`);
//     }
//   }
//   return errors.length ? { ok: false, error: errors.join("; ").slice(0, 500) } : { ok: true };
// }


export async function publishPost(
  post: Post
): Promise<{ ok: boolean; error?: string }> {
  const errors: string[] = [];

  for (const platform of post.platforms) {
    try {
      if (platform === "FACEBOOK") {
        await postToFacebook(
          post.userId,
          post.text,
          post.mediaKeys[0]
        );
      } else if (platform === "INSTAGRAM") {
        await postToInstagram(
          post.userId,
          post.text,
          post.mediaKeys[0]
        );
      } else if (platform === "LINKEDIN") {
        await postToLinkedIn(
          post.userId,
          post.text,
          post.mediaKeys[0]
        );
      } else if (platform === "YOUTUBE") {
        await postToYouTube(
          post.userId,
          post.text,
          post.mediaKeys[0]
        );
      } else {
        throw new Error("Publishing is not built yet");
      }
    } catch (e) {
      errors.push(
        `${platform}: ${e instanceof Error ? e.message : "failed"}`
      );
    }
  }

  return errors.length
    ? { ok: false, error: errors.join("; ").slice(0, 500) }
    : { ok: true };
}

