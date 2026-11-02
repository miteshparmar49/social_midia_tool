// src/lib/facebook.ts
// Publishes Facebook Page Reels and Stories (photo + video) using the Graph API.

const GRAPH = "https://graph.facebook.com/v21.0";

type Json = Record<string, any>;

function errorMessage(data: Json, fallback: string): string {
  return data?.error?.error_user_msg || data?.error?.message || fallback;
}

// POST with form-encoded params + access token
async function graphPost(path: string, token: string, params: Record<string, string>): Promise<Json> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: token }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    console.error("Facebook API error:", path, JSON.stringify(data.error));
    throw new Error(errorMessage(data, `Facebook request failed (status ${res.status})`));
  }

  return data;
}

// Tell Facebook to download the video from a hosted URL (our S3 presigned URL)
async function uploadHostedVideo(uploadUrl: string, token: string, fileUrl: string) {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${token}`,
      file_url: fileUrl,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error || data.success === false) {
    console.error("Facebook video upload error:", JSON.stringify(data));
    throw new Error(errorMessage(data, `Facebook video upload failed (status ${res.status})`));
  }
}

// Wait until Facebook has received the video, before finishing the Reel / Story
async function waitForUpload(videoId: string, token: string) {
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const res = await fetch(
      `${GRAPH}/${videoId}?fields=status&access_token=${encodeURIComponent(token)}`
    );
    const data = await res.json().catch(() => ({}));

    if (data.error) {
      throw new Error(errorMessage(data, "Could not check the Facebook video status"));
    }

    const status = data?.status ?? {};
    const uploading = status?.uploading_phase?.status;
    const overall = status?.video_status;

    console.log("Facebook video status:", overall, uploading);

    if (uploading === "complete" || overall === "ready" || overall === "upload_complete") {
      return;
    }

    if (uploading === "error" || overall === "error") {
      throw new Error("Facebook could not process the video");
    }
  }

  throw new Error("Facebook video upload timed out");
}

// Shared flow for Reels and video Stories: start -> upload -> finish
async function publishVideoFlow(opts: {
  edge: "video_reels" | "video_stories";
  pageId: string;
  token: string;
  videoUrl: string;
  description?: string;
}): Promise<string> {
  const { edge, pageId, token, videoUrl, description } = opts;

  // 1) Start
  const start = await graphPost(`${pageId}/${edge}`, token, { upload_phase: "start" });
  const videoId: string | undefined = start.video_id;
  const uploadUrl: string | undefined = start.upload_url;

  if (!videoId || !uploadUrl) {
    throw new Error("Facebook did not return an upload URL");
  }

  // 2) Upload (Facebook downloads the file from our URL)
  await uploadHostedVideo(uploadUrl, token, videoUrl);
  await waitForUpload(videoId, token);

  // 3) Finish / publish
  const finishParams: Record<string, string> = {
    upload_phase: "finish",
    video_id: videoId,
  };

  if (edge === "video_reels") {
    finishParams.video_state = "PUBLISHED";
    if (description) finishParams.description = description.slice(0, 2000);
  }

  const finish = await graphPost(`${pageId}/${edge}`, token, finishParams);

  if (finish.success === false) {
    throw new Error("Facebook could not publish the video");
  }

  return (finish.post_id ?? videoId) as string;
}

// ---------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------

export async function publishFacebookReel(opts: {
  pageId: string;
  token: string;
  videoUrl: string;
  description: string;
}): Promise<string> {
  return publishVideoFlow({
    edge: "video_reels",
    pageId: opts.pageId,
    token: opts.token,
    videoUrl: opts.videoUrl,
    description: opts.description,
  });
}

export async function publishFacebookStory(opts: {
  pageId: string;
  token: string;
  mediaUrl: string;
  isVideo: boolean;
}): Promise<string> {
  const { pageId, token, mediaUrl, isVideo } = opts;

  // Video story
  if (isVideo) {
    return publishVideoFlow({
      edge: "video_stories",
      pageId,
      token,
      videoUrl: mediaUrl,
    });
  }

  // Photo story: upload an unpublished photo, then turn it into a story
  const photo = await graphPost(`${pageId}/photos`, token, {
    url: mediaUrl,
    published: "false",
  });

  if (!photo.id) {
    throw new Error("Facebook could not upload the story photo");
  }

  const story = await graphPost(`${pageId}/photo_stories`, token, {
    photo_id: String(photo.id),
  });

  if (story.success === false) {
    throw new Error("Facebook could not publish the story");
  }

  return (story.post_id ?? photo.id) as string;
}