// src/lib/linkedin.ts
// Publishes a text or image post to a LinkedIn personal profile (needs the w_member_social scope).

const API = "https://api.linkedin.com/v2";

function baseHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

// Uploads one image (from a URL, e.g. S3 presigned URL) to LinkedIn and returns its asset URN
async function uploadImage(token: string, ownerUrn: string, imageUrl: string): Promise<string> {
  // 1) Register the upload
  const reg = await fetch(`${API}/assets?action=registerUpload`, {
    method: "POST",
    headers: { ...baseHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: ownerUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  });

  const regData = await reg.json().catch(() => ({}));

  if (!reg.ok) {
    throw new Error(
      regData?.message || `LinkedIn image registration failed (status ${reg.status})`
    );
  }

  const uploadUrl: string | undefined =
    regData?.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;
  const asset: string | undefined = regData?.value?.asset;

  if (!uploadUrl || !asset) {
    throw new Error("LinkedIn did not return an image upload URL");
  }

  // 2) Read the image from storage
  const img = await fetch(imageUrl);
  if (!img.ok) {
    throw new Error(`Could not read the image file (status ${img.status})`);
  }
  const bytes = new Uint8Array(await img.arrayBuffer());

  // 3) Upload the image bytes to LinkedIn
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": img.headers.get("content-type") ?? "application/octet-stream",
    },
    body: bytes,
  });

  if (!put.ok) {
    throw new Error(`LinkedIn image upload failed (status ${put.status})`);
  }

  return asset;
}

export async function publishToLinkedIn(opts: {
  accessToken: string;
  personId: string; // SocialAccount.externalId (the "sub" from LinkedIn userinfo)
  text: string;
  imageUrls?: string[]; // up to 9
}): Promise<string> {
  const { accessToken, personId, text } = opts;
  const imageUrls = (opts.imageUrls ?? []).slice(0, 9);
  const author = `urn:li:person:${personId}`;

  // Upload images first (if any)
  const assets: string[] = [];
  for (const url of imageUrls) {
    assets.push(await uploadImage(accessToken, author, url));
  }

  // Create the post
  const res = await fetch(`${API}/ugcPosts`, {
    method: "POST",
    headers: { ...baseHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: text.slice(0, 3000) },
          shareMediaCategory: assets.length ? "IMAGE" : "NONE",
          ...(assets.length
            ? {
                media: assets.map((asset) => ({
                  status: "READY",
                  media: asset,
                })),
              }
            : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.message || `LinkedIn post failed (status ${res.status})`
    );
  }

  return (res.headers.get("x-restli-id") || data?.id || "") as string;
}