
import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import type { Post } from "@prisma/client";

// Convert Prisma JsonValue safely
function toStringRecord(value: unknown): Record<string, string> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string"
    )
  );
}

export async function publishPost(
  post: Post
): Promise<{ ok: boolean; error?: string }> {
  const errors: string[] = [];

  const formats = toStringRecord(post.formats);
  const customTexts = toStringRecord(post.customTexts);

  console.log("========== PUBLISH POST ==========");
  console.log("Post ID:", post.id);
  console.log("Platforms:", post.platforms);
  console.log("Formats:", formats);
  console.log("==================================");

  for (const platform of post.platforms) {
    try {
      const textToUse = customTexts[platform] || post.text;
      const formatType = formats[platform] || "POST";

      console.log("========== PUBLISH DEBUG ==========");
      console.log("Platform:", platform);
      console.log("Selected Format:", formatType);
      console.log("Post Formats:", formats);
      console.log("Media Keys:", post.mediaKeys);
      console.log("===================================");

      const account = await prisma.socialAccount.findFirst({
        where: {
          userId: post.userId,
          platform,
        },
      });

      if (!account) {
        throw new Error(`No connected ${platform} account found`);
      }

      const accessToken = decrypt(account.accessToken);
      const accountId = account.externalId;

      const mediaKey = post.mediaKeys?.[0];

      const mediaUrl = mediaKey
        ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/media/${mediaKey}`
        : null;

      // ==========================================
      // FACEBOOK
      // ==========================================

      if (platform === "FACEBOOK") {
        let endpoint = `https://graph.facebook.com/v18.0/${accountId}/feed`;

        const payload: Record<string, string> = {
          message: textToUse,
          access_token: accessToken,
        };

        if (mediaUrl) {
          if (
            formatType === "REEL" ||
            /\.(mp4|mov|m4v)$/i.test(mediaKey || "")
          ) {
            endpoint = `https://graph.facebook.com/v18.0/${accountId}/videos`;

            payload.file_url = mediaUrl;
            payload.description = textToUse;

            delete payload.message;
          } else {
            endpoint = `https://graph.facebook.com/v18.0/${accountId}/photos`;
            payload.url = mediaUrl;
          }
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.id) {
          throw new Error(
            data?.error?.message || "Failed to post to Facebook"
          );
        }

        console.log("Facebook Published:", data.id);
      }

      // ==========================================
      // INSTAGRAM
      // ==========================================

      else if (platform === "INSTAGRAM") {
        if (!mediaUrl || !mediaKey) {
          throw new Error("Instagram needs a photo or video");
        }

        const isVideo = /\.(mp4|mov|m4v)$/i.test(mediaKey);

        const graphVersion = "v18.0";

        const endpoint = `https://graph.facebook.com/${graphVersion}/${accountId}`;

        console.log("Instagram Format:", formatType);
        console.log("Instagram Media Type:", isVideo ? "VIDEO" : "IMAGE");

        // Instagram API request helper
        const apiRequest = async (
          url: string,
          params: Record<string, string>
        ) => {
          const body = new URLSearchParams({
            ...params,
            access_token: accessToken,
          });

          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          });

          const data = await response.json();

          if (!response.ok || data.error) {
            throw new Error(
              data?.error?.message || "Instagram API request failed"
            );
          }

          return data;
        };

        // Wait for video processing
        const waitForProcessing = async (containerId: string) => {
          for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise((resolve) =>
              setTimeout(resolve, 10000)
            );

            const statusUrl = new URL(
              `https://graph.facebook.com/${graphVersion}/${containerId}`
            );

            statusUrl.searchParams.set(
              "fields",
              "status_code,status"
            );

            statusUrl.searchParams.set(
              "access_token",
              accessToken
            );

            const statusRes = await fetch(statusUrl.toString());
            const statusData = await statusRes.json();

            if (!statusRes.ok || statusData.error) {
              throw new Error(
                statusData?.error?.message ||
                  "Failed to check Instagram video status"
              );
            }

            console.log(
              "Instagram Processing:",
              statusData.status_code
            );

            if (statusData.status_code === "FINISHED") {
              return;
            }

            if (
              statusData.status_code === "ERROR" ||
              statusData.status_code === "EXPIRED"
            ) {
              throw new Error(
                statusData.status ||
                  "Instagram media processing failed"
              );
            }
          }

          throw new Error(
            "Instagram video processing timed out"
          );
        };

        // Publish Instagram container
        const publishContainer = async (containerId: string) => {
          const result = await apiRequest(
            `${endpoint}/media_publish`,
            {
              creation_id: containerId,
            }
          );

          if (!result.id) {
            throw new Error("Instagram publishing failed");
          }

          console.log("Instagram Published ID:", result.id);

          return result.id;
        };

        // ------------------------------------------
        // INSTAGRAM STORY
        // ------------------------------------------

        if (formatType === "STORY") {
          console.log("Instagram STORY API CALLED");

          const payload: Record<string, string> = {
            media_type: "STORIES",
          };

          if (isVideo) {
            payload.video_url = mediaUrl;
          } else {
            payload.image_url = mediaUrl;
          }

          console.log("Story Media:", isVideo ? "VIDEO" : "IMAGE");

          const container = await apiRequest(
            `${endpoint}/media`,
            payload
          );

          if (!container.id) {
            throw new Error(
              "Failed to create Instagram Story container"
            );
          }

          console.log("Instagram Story Container:", container.id);


          const info = await fetch(
  `https://graph.facebook.com/${graphVersion}/${container.id}?fields=status_code,media_type&access_token=${accessToken}`
).then((r) => r.json());
console.log("Container info:", info);

// Wait for video processing
if (isVideo) {
  await waitForProcessing(container.id);
}

await publishContainer(container.id);

          // Wait for video processing
          if (isVideo) {
            await waitForProcessing(container.id);
          }

          await publishContainer(container.id);

          console.log("Instagram STORY published successfully");
        }

        // ------------------------------------------
        // INSTAGRAM REEL
        // ------------------------------------------

        else if (formatType === "REEL") {
          console.log("Instagram REEL API CALLED");

          if (!isVideo) {
            throw new Error(
              "Instagram Reel requires a video file"
            );
          }

          const container = await apiRequest(
            `${endpoint}/media`,
            {
              media_type: "REELS",
              video_url: mediaUrl,
              caption: textToUse,
            }
          );

          if (!container.id) {
            throw new Error(
              "Failed to create Instagram Reel container"
            );
          }

          await waitForProcessing(container.id);

          await publishContainer(container.id);

          console.log("Instagram REEL published successfully");
        }

        // ------------------------------------------
        // INSTAGRAM NORMAL POST
        // ------------------------------------------

        else if (formatType === "POST") {
          console.log("Instagram FEED POST API CALLED");

          const payload: Record<string, string> = {
            caption: textToUse,
          };

          if (isVideo) {
            payload.media_type = "REELS";
            payload.video_url = mediaUrl;
          } else {
            payload.image_url = mediaUrl;
          }

          const container = await apiRequest(
            `${endpoint}/media`,
            payload
          );

          if (!container.id) {
            throw new Error(
              "Failed to create Instagram Post container"
            );
          }

          if (isVideo) {
            await waitForProcessing(container.id);
          }

          await publishContainer(container.id);

          console.log("Instagram POST published successfully");
        }

        else {
          throw new Error(
            `Unsupported Instagram format: ${formatType}`
          );
        }
      }

      // ==========================================
      // OTHER PLATFORMS
      // ==========================================

      else {
        // LinkedIn / YouTube / WhatsApp existing placeholders
        console.log(`${platform} publishing is not implemented yet`);
        throw new Error(
          `${platform} publishing is not implemented yet`
        );
      }

    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Unknown publishing error";

      console.error(`${platform} Publish Error:`, message);

      errors.push(`${platform}: ${message}`);
    }
  }

  return errors.length
    ? {
        ok: false,
        error: errors.join("; ").slice(0, 500),
      }
    : {
        ok: true,
      };
}
