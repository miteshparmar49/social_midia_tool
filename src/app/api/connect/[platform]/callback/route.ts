import { NextRequest, NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getOAuth, isOAuthPlatform } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { encrypt } from "@/lib/crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const back = (q: string) => NextResponse.redirect(`${process.env.APP_URL}/dashboard${q}`);
  if (!isOAuthPlatform(platform)) return back("?error=platform");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || state !== req.cookies.get("oauth_state")?.value) return back("?error=state");

  const o = getOAuth(platform);
  const tokenRes = await fetch(o.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.APP_URL}/api/connect/${platform}/callback`,
      client_id: o.id,
      client_secret: o.secret,
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) return back("?error=token");

  const userId = await getUserId();
  const p = platform.toUpperCase() as Platform;

  if (platform === "facebook") {
    // Swap for a long-lived user token. Page tokens made from it do not expire.
    const long = await (
      await fetch(
        `${GRAPH}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: o.id,
            client_secret: o.secret,
            fb_exchange_token: token.access_token,
          })
      )
    ).json();
    const userToken: string = long.access_token ?? token.access_token;
    const get = async (path: string, extra: Record<string, string> = {}) =>
      (await fetch(`${GRAPH}/${path}?` + new URLSearchParams({ ...extra, access_token: userToken }))).json();

    type Pg = { id: string; name: string; access_token?: string };
    const pagesRes = await get("me/accounts", { fields: "id,name,access_token" });
    let pages: Pg[] = pagesRes.data ?? [];

    // Pages owned by a Business portfolio can only be reached through the business.
    if (!pages.length) {
      const biz = await get("me/businesses", { fields: "id,name" });
      for (const b of (biz.data ?? []) as { id: string }[]) {
        const owned = await get(`${b.id}/owned_pages`, { fields: "id,name,access_token" });
        pages = pages.concat(owned.data ?? []);
      }
    }
    pages = pages.filter((p) => p.access_token);

    if (!pages.length) {
      // Show which permissions Facebook really granted (names only, no tokens).
      const perms = await get("me/permissions");
      const granted = ((perms.data ?? []) as { permission: string; status: string }[])
        .filter((x) => x.status === "granted")
        .map((x) => x.permission)
        .join(",");
      console.error("Meta pages empty", JSON.stringify({ pagesRes, granted }));
      return back(`?error=nopages&granted=${encodeURIComponent(granted)}`);
    }
    for (const pg of pages) {
      const data = { handle: pg.name, accessToken: encrypt(pg.access_token as string), expiresAt: null };
      await prisma.socialAccount.upsert({
        where: { userId_platform_externalId: { userId, platform: p, externalId: pg.id } },
        update: data,
        create: { userId, platform: p, externalId: pg.id, ...data },
      });
    }
    return back("?connected=facebook");
  }

  const profile = await (await fetch(o.profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` } })).json();
  const externalId: string = profile.id ?? profile.sub;
  const data = {
    handle: (profile.name ?? externalId) as string,
    accessToken: encrypt(token.access_token),
    expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
  };
  await prisma.socialAccount.upsert({
    where: { userId_platform_externalId: { userId, platform: p, externalId } },
    update: data,
    create: { userId, platform: p, externalId, ...data },
  });
  return back("?connected=" + platform);
}
