import { NextRequest, NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getOAuth, isOAuthPlatform } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { encrypt } from "@/lib/crypto";

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

  const profile = await (await fetch(o.profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` } })).json();
  const externalId: string = profile.id ?? profile.sub;
  const handle: string = profile.name ?? externalId;
  const userId = await getUserId();
  const data = {
    handle,
    accessToken: encrypt(token.access_token),
    expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
  };
  const p = platform.toUpperCase() as Platform;
  await prisma.socialAccount.upsert({
    where: { userId_platform_externalId: { userId, platform: p, externalId } },
    update: data,
    create: { userId, platform: p, externalId, ...data },
  });
  return back("?connected=" + platform);
}
