import { NextRequest, NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getOAuth, isOAuthPlatform } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { encrypt } from "@/lib/crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

type Ctx = { params: Promise<{ platform: string }> };

async function handle(req: NextRequest, { params }: Ctx) {
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
    const fromAccounts = pages.length;
    let why = pagesRes.error?.message ?? "";

    // Pages the user ticked in the Facebook dialog are listed in the token's granular scopes.
    let targets: string[] = [];
    if (!pages.some((p) => p.access_token)) {
      const dbg = await (
        await fetch(`${GRAPH}/debug_token?` + new URLSearchParams({ input_token: userToken, access_token: `${o.id}|${o.secret}` }))
      ).json();
      const scopes = (dbg.data?.granular_scopes ?? []) as { scope: string; target_ids?: string[] }[];
      targets = Array.from(new Set(scopes.filter((x) => x.scope.startsWith("pages_")).flatMap((x) => x.target_ids ?? [])));
      for (const id of targets) {
        const pg = await get(id, { fields: "id,name,access_token" });
        if (pg.id) pages.push(pg);
        else why = pg.error?.message ?? why;
      }
    }

    // Last try: Pages owned by a Business portfolio.
    let bizCount = 0;
    if (!pages.some((p) => p.access_token)) {
      const biz = await get("me/businesses", { fields: "id,name" });
      for (const b of (biz.data ?? []) as { id: string }[]) {
        bizCount++;
        const owned = await get(`${b.id}/owned_pages`, { fields: "id,name,access_token" });
        pages = pages.concat(owned.data ?? []);
        if (owned.error) why = owned.error.message;
      }
    }

    pages = pages.filter((p, i, a) => p.access_token && a.findIndex((q) => q.id === p.id) === i);

    if (!pages.length) {
      const perms = await get("me/permissions");
      const granted = ((perms.data ?? []) as { permission: string; status: string }[])
        .filter((x) => x.status === "granted")
        .map((x) => x.permission)
        .join(",");
      console.error("Meta pages empty", JSON.stringify({ pagesRes, targets, bizCount, why }));
      const q = new URLSearchParams({
        error: "nopages",
        granted,
        acct: String(fromAccounts),
        targets: String(targets.length),
        biz: String(bizCount),
        why: why.slice(0, 160),
      });
      return back("?" + q.toString());
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

// Any crash is shown on the dashboard instead of a blank 500 page.
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    console.error("connect callback failed", e);
    const why = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard?error=server&why=${encodeURIComponent(why.slice(0, 160))}`
    );
  }
}
