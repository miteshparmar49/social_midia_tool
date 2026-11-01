import { getOAuth } from "./platforms";

type Privacy = "public" | "unlisted" | "private";

// Exchange a refresh token for a fresh access token (YouTube tokens last 1 hour)
export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const o = getOAuth("youtube");

  const res = await fetch(o.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: o.id,
      client_secret: o.secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(
      data?.error_description || data?.error || "Could not refresh the YouTube token"
    );
  }

  return data.access_token as string;
}

// YouTube titles: max 100 characters, no < or >
function makeTitle(text: string): string {
  const firstLine =
    text
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? "";

  const cleaned = firstLine.replace(/[<>]/g, "").slice(0, 100).trim();
  return cleaned || "Untitled video";
}

export async function uploadToYouTube(opts: {
  accessToken: string;
  mediaUrl: string; // presigned S3 URL of the MP4
  text: string; // first line = title, whole text = description
  privacy?: Privacy;
}): Promise<string> {
  const { accessToken, mediaUrl, text } = opts;
  const privacy: Privacy =
    opts.privacy ?? ((process.env.YOUTUBE_PRIVACY as Privacy | undefined) || "public");

  // 1) Open the video stream from storage
  const media = await fetch(mediaUrl);
  if (!media.ok || !media.body) {
    throw new Error(`Could not read the video file (status ${media.status})`);
  }

  const length = media.headers.get("content-length");
  if (!length) {
    throw new Error("Could not read the video size");
  }

  // 2) Start a resumable upload session
  const init = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": length,
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify({
        snippet: {
          title: makeTitle(text),
          description: text.replace(/[<>]/g, "").slice(0, 5000),
          categoryId: "22",
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (!init.ok) {
    const err = await init.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `YouTube upload could not start (status ${init.status})`
    );
  }

  const uploadUrl = init.headers.get("location");
  if (!uploadUrl) {
    throw new Error("YouTube did not return an upload URL");
  }

  // 3) Stream the video to YouTube
  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": length,
    },
    body: media.body,
    duplex: "half",
  } as RequestInit);

  const result = await upload.json().catch(() => ({}));

  if (!upload.ok || !result.id) {
    throw new Error(
      result?.error?.message || `YouTube upload failed (status ${upload.status})`
    );
  }

  return result.id as string; // video id
}