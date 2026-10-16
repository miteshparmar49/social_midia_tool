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
