// import { prisma } from "./prisma";
// import { decrypt, encrypt } from "./crypto";

// // Instagram tokens last 60 days. This renews the ones that expire within 10 days,
// // so customers never have to reconnect. Called by the cron job.
// export async function refreshInstagramTokens(): Promise<number> {
//   const soon = new Date(Date.now() + 10 * 24 * 3600 * 1000);
//   const accounts = await prisma.socialAccount.findMany({
//     where: { platform: "INSTAGRAM", expiresAt: { gt: new Date(), lt: soon } },
//     take: 20,
//   });

//   let refreshed = 0;
//   for (const a of accounts) {
//     try {
//       const res = await fetch(
//         "https://graph.instagram.com/refresh_access_token?" +
//           new URLSearchParams({ grant_type: "ig_refresh_token", access_token: decrypt(a.accessToken) })
//       );
//       const data = await res.json();
//       if (!res.ok || !data.access_token) throw new Error(data?.error?.message ?? "refresh failed");
//       await prisma.socialAccount.update({
//         where: { id: a.id },
//         data: {
//           accessToken: encrypt(data.access_token),
//           expiresAt: new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000),
//         },
//       });
//       refreshed++;
//     } catch (e) {
//       console.error("Instagram token refresh failed", a.id, e);
//     }
//   }
//   return refreshed;
// }


import { prisma } from "./prisma";
import { decrypt, encrypt } from "./crypto";

// Instagram tokens last 60 days. This renews the ones that expire within 10 days,
// so customers never have to reconnect. Called by the cron job.
export async function refreshInstagramTokens(): Promise<number> {
  const soon = new Date(Date.now() + 10 * 24 * 3600 * 1000);
  const accounts = await prisma.socialAccount.findMany({
    where: { platform: "INSTAGRAM", expiresAt: { gt: new Date(), lt: soon } },
    take: 20,
  });

  let refreshed = 0;
  for (const a of accounts) {
    try {
      const res = await fetch(
        "https://graph.instagram.com/refresh_access_token?" +
          new URLSearchParams({ grant_type: "ig_refresh_token", access_token: decrypt(a.accessToken) })
      );
      const data = await res.json();
      if (!res.ok || !data.access_token) throw new Error(data?.error?.message ?? "refresh failed");
      await prisma.socialAccount.update({
        where: { id: a.id },
        data: {
          accessToken: encrypt(data.access_token),
          expiresAt: new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000),
        },
      });
      refreshed++;
    } catch (e) {
      console.error("Instagram token refresh failed", a.id, e);
    }
  }
  return refreshed;
}

// ==========================================
// Instagram Post / Reel / Story Publishing Logic
// ==========================================
export async function postToInstagram(
  userId: string,
  text: string,
  mediaKeys: string[],
  format: string = "POST" // "POST", "REEL", અથવા "STORY"
) {
  // ૧. યુઝરનું કનેક્ટેડ Instagram એકાઉન્ટ ડેટાબેઝમાંથી મેળવવું
  const account = await prisma.socialAccount.findFirst({
    where: { userId, platform: "INSTAGRAM" },
  });

  if (!account) {
    throw new Error("No connected Instagram account found");
  }

  const accessToken = decrypt(account.accessToken);
  const igUserId = account.externalId; // Instagram Business ID

  if (!mediaKeys || mediaKeys.length === 0) {
    throw new Error("Instagram needs a photo or video");
  }

  // નોંધ: અહીં mediaKeys[0] એ સ્ટોરેજ (જેવા કે S3 કે પબ્લિક URL) પરની ફાઇલ છે. 
  // તમારા પ્રોજેક્ટમાં ફાઇલની પબ્લિક URL મેળવવાની જે પદ્ધતિ હોય તે અહીં વાપરવી.
  const mediaUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/media/${mediaKeys[0]}`;

  // ૨. Format મુજબ Instagram Graph API ના પેરામીટર્સ નક્કી કરવા
  let endpoint = `https://graph.facebook.com/v18.0/${igUserId}/media`;
  const payload: Record<string, string> = {
    caption: text,
    access_token: accessToken,
  };

  if (format === "STORY") {
    // Instagram Story માટે API પેરામીટર
    payload.media_type = "STORIES";
    payload.image_url = mediaUrl; // અથવા વીડિયો હોય તો video_url
  } else if (format === "REEL") {
    // Instagram Reel માટે API પેરામીટર
    payload.media_type = "REELS";
    payload.video_url = mediaUrl;
  } else {
    // સામાન્ય Feed Post માટે
    if (mediaKeys[0].endsWith(".mp4")) {
      payload.media_url = mediaUrl;
      payload.media_type = "VIDEO";
    } else {
      payload.image_url = mediaUrl;
    }
  }

  // ૩. Instagram API ને કન્ટેનર બનાવવા માટે રિક્વેસ્ટ મોકલવી
  const containerRes = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    throw new Error(containerData?.error?.message || "Failed to create Instagram media container");
  }

  const creationId = containerData.id;

  // ૪. કન્ટેનર પબ્લિશ કરવા માટેની રિક્વેસ્ટ
  const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });

  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    throw new Error(publishData?.error?.message || "Failed to publish Instagram media");
  }

  return publishData;
}


export async function getInstagramDebugInfo(userId: string) {
  const account = await prisma.socialAccount.findFirst({
    where: {
      userId,
      platform: "INSTAGRAM",
    },
  });

  if (!account) {
    throw new Error("Instagram account not found");
  }

  return {
    instagramUserId: account.externalId,
    accessToken: decrypt(account.accessToken),
  };
}