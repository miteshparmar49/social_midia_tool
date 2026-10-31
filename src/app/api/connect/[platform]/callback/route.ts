
import { NextRequest, NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getOAuth, isOAuthPlatform } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { encrypt, decrypt } from "@/lib/crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

type Ctx = {
  params: Promise<{ platform: string }>;
};

async function handle(req: NextRequest, { params }: Ctx) {
  const { platform } = await params;

  const back = (q: string) =>
    NextResponse.redirect(`${process.env.APP_URL}/dashboard${q}`);

  if (!isOAuthPlatform(platform)) {
    return back("?error=platform");
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(`oauth_state_${platform}`)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    console.error("OAuth state validation failed", {
      platform,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasSavedState: Boolean(savedState),
    });

    return back("?error=state");
  }

  const providerError = req.nextUrl.searchParams.get("error");

  if (providerError) {
    return back(`?error=${encodeURIComponent(providerError)}`);
  }

  const o = getOAuth(platform);

  const redirectUri =
    platform === "linkedin"
      ? process.env.LINKEDIN_REDIRECT_URI
      : platform === "youtube"
        ? process.env.GOOGLE_REDIRECT_URI
        : `${process.env.APP_URL}/api/connect/${platform}/callback`;

  if (!redirectUri) {
    console.error("OAuth redirect URI is missing", { platform });
    return back("?error=redirect_uri");
  }

  // Exchange authorization code for access token
  const tokenRes = await fetch(o.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: o.id,
      client_secret: o.secret,
    }),
  });

  const token = await tokenRes.json();

  if (!tokenRes.ok || !token.access_token) {
    console.error("OAuth token exchange failed", {
      platform,
      status: tokenRes.status,
      error: token.error,
      description: token.error_description,
    });

    return back("?error=token");
  }

  const userId = await getUserId();
  const p = platform.toUpperCase() as Platform;

  // FACEBOOK
  if (platform === "facebook") {
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

    const get = async (
      path: string,
      extra: Record<string, string> = {}
    ) =>
      (
        await fetch(
          `${GRAPH}/${path}?` +
            new URLSearchParams({
              ...extra,
              access_token: userToken,
            })
        )
      ).json();

    type Pg = {
      id: string;
      name: string;
      access_token?: string;
    };

    const pagesRes = await get("me/accounts", {
      fields: "id,name,access_token",
    });

    let pages: Pg[] = pagesRes.data ?? [];
    const fromAccounts = pages.length;
    let why = pagesRes.error?.message ?? "";

    let targets: string[] = [];

    if (!pages.some((pg) => pg.access_token)) {
      const dbg = await (
        await fetch(
          `${GRAPH}/debug_token?` +
            new URLSearchParams({
              input_token: userToken,
              access_token: `${o.id}|${o.secret}`,
            })
        )
      ).json();

      const scopes = (dbg.data?.granular_scopes ?? []) as {
        scope: string;
        target_ids?: string[];
      }[];

      targets = Array.from(
        new Set(
          scopes
            .filter((x) => x.scope.startsWith("pages_"))
            .flatMap((x) => x.target_ids ?? [])
        )
      );

      for (const id of targets) {
        const pg = await get(id, {
          fields: "id,name,access_token",
        });

        if (pg.id) {
          pages.push(pg);
        } else {
          why = pg.error?.message ?? why;
        }
      }
    }

    let bizCount = 0;

    if (!pages.some((pg) => pg.access_token)) {
      const biz = await get("me/businesses", {
        fields: "id,name",
      });

      for (const b of (biz.data ?? []) as { id: string }[]) {
        bizCount++;

        const owned = await get(`${b.id}/owned_pages`, {
          fields: "id,name,access_token",
        });

        pages = pages.concat(owned.data ?? []);

        if (owned.error) {
          why = owned.error.message;
        }
      }
    }

    pages = pages.filter(
      (pg, i, arr) =>
        pg.access_token &&
        arr.findIndex((other) => other.id === pg.id) === i
    );

    if (!pages.length) {
      const perms = await get("me/permissions");

      const granted = (
        (perms.data ?? []) as {
          permission: string;
          status: string;
        }[]
      )
        .filter((x) => x.status === "granted")
        .map((x) => x.permission)
        .join(",");

      console.error("Meta pages empty", {
        pagesRes,
        targets,
        bizCount,
        why,
      });

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
      const data = {
        handle: pg.name,
        accessToken: encrypt(pg.access_token as string),
        expiresAt: null,
      };

      await prisma.socialAccount.upsert({
        where: {
          userId_platform_externalId: {
            userId,
            platform: p,
            externalId: pg.id,
          },
        },
        update: data,
        create: {
          userId,
          platform: p,
          externalId: pg.id,
          ...data,
        },
      });
    }

    return back("?connected=facebook");
  }

  // INSTAGRAM
  if (platform === "instagram") {
    const shortToken: string =
      token.data?.[0]?.access_token ?? token.access_token;

    const longRes = await fetch(
      "https://graph.instagram.com/access_token?" +
        new URLSearchParams({
          grant_type: "ig_exchange_token",
          client_secret: o.secret,
          access_token: shortToken,
        })
    );

    const long = await longRes.json();

    if (!longRes.ok || long.error) {
      console.error("Instagram long-lived token exchange failed", {
        status: longRes.status,
        error: long.error,
      });

      return back("?error=instagram_token");
    }

    const accessToken: string = long.access_token ?? shortToken;

    const profileRes = await fetch(
      `${o.profileUrl}?` +
        new URLSearchParams({
          fields: "user_id,username",
          access_token: accessToken,
        })
    );

    const me = await profileRes.json();

    if (!profileRes.ok || me.error) {
      console.error("Instagram profile request failed", {
        status: profileRes.status,
        error: me.error,
      });

      return back("?error=instagram_profile");
    }

    const igId = String(me.user_id ?? token.user_id ?? "");

    if (!igId) {
      console.error("Instagram user ID missing", {
        profileResponse: me,
      });

      return back("?error=instagram_id");
    }

    // STEP 1: Encrypt and immediately decrypt before saving
    const encryptedToken = encrypt(accessToken);
    const beforeSave = decrypt(encryptedToken);

    const encryptionSuccess = beforeSave === accessToken;

    console.log("INSTAGRAM ENCRYPTION CHECK:", {
      encryptionSuccess,
      tokenLength: accessToken.length,
    });

    if (!encryptionSuccess) {
      console.error("Instagram encryption verification failed");
      return back("?error=instagram_encryption");
    }

    const igData = {
      handle: me.username ? `@${me.username}` : igId,
      accessToken: encryptedToken,
      expiresAt: new Date(
        Date.now() + (long.expires_in ?? 3600) * 1000
      ),
    };

    // STEP 2: Save account
    await prisma.socialAccount.upsert({
      where: {
        userId_platform_externalId: {
          userId,
          platform: p,
          externalId: igId,
        },
      },
      update: igData,
      create: {
        userId,
        platform: p,
        externalId: igId,
        ...igData,
      },
    });

    // STEP 3: Read the saved token back from database
    const savedAccount = await prisma.socialAccount.findUnique({
      where: {
        userId_platform_externalId: {
          userId,
          platform: p,
          externalId: igId,
        },
      },
      select: {
        accessToken: true,
      },
    });

    // STEP 4: Verify database token decryption
    let databaseDecryptSuccess = false;

    try {
      databaseDecryptSuccess =
        !!savedAccount &&
        decrypt(savedAccount.accessToken) === accessToken;
    } catch (error) {
      console.error("Instagram database decrypt failed:", error);
      databaseDecryptSuccess = false;
    }

    console.log("INSTAGRAM DATABASE CHECK:", {
      accountSaved: !!savedAccount,
      databaseDecryptSuccess,
      userId,
      instagramId: igId,
    });

    return back("?connected=instagram");
  }

  // LINKEDIN
  if (platform === "linkedin") {
    const profileRes = await fetch(o.profileUrl, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      cache: "no-store",
    });

    const profile = await profileRes.json();

    if (!profileRes.ok || !profile.sub) {
      console.error("LinkedIn profile request failed", {
        status: profileRes.status,
        error: profile.error,
      });

      return back("?error=linkedin_profile");
    }

    const externalId = String(profile.sub);

    const data = {
      handle: String(
        profile.name ??
          profile.email ??
          externalId
      ),
      accessToken: encrypt(token.access_token),
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : null,
    };

    await prisma.socialAccount.upsert({
      where: {
        userId_platform_externalId: {
          userId,
          platform: p,
          externalId,
        },
      },
      update: data,
      create: {
        userId,
        platform: p,
        externalId,
        ...data,
      },
    });

    return back("?connected=linkedin");
  }

  // YOUTUBE
  if (platform === "youtube") {
    const channelRes = await fetch(o.profileUrl, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      cache: "no-store",
    });

    const channelData = await channelRes.json();

    if (!channelRes.ok) {
      console.error("YouTube channel API error:", {
        status: channelRes.status,
        error: channelData.error?.errors,
        message: channelData.error?.message,
        reason: channelData.error?.errors?.[0]?.reason,
      });

      const reason =
        channelData.error?.errors?.[0]?.reason ||
        channelData.error?.message ||
        `HTTP ${channelRes.status}`;

      return back(
        `?error=youtube_channel&why=${encodeURIComponent(reason)}`
      );
    }

    if (
      !Array.isArray(channelData.items) ||
      channelData.items.length === 0
    ) {
      console.error("YouTube API returned no channel", {
        status: channelRes.status,
      });

      return back(
        `?error=youtube_channel&why=${encodeURIComponent(
          "No YouTube channel found for this Google account."
        )}`
      );
    }

    const channel = channelData.items[0];
    const externalId = String(channel.id ?? "");

    if (!externalId) {
      return back(
        `?error=youtube_channel&why=${encodeURIComponent(
          "YouTube API response did not contain a channel ID."
        )}`
      );
    }

    const data = {
      handle: String(channel.snippet?.title ?? externalId),
      accessToken: encrypt(token.access_token),
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : null,
    };

    await prisma.socialAccount.upsert({
      where: {
        userId_platform_externalId: {
          userId,
          platform: p,
          externalId,
        },
      },
      update: data,
      create: {
        userId,
        platform: p,
        externalId,
        ...data,
      },
    });

    return back("?connected=youtube");
  }

  return back("?error=platform");
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    console.error("Connect callback failed", e);

    const why =
      e instanceof Error ? e.message : "unknown";

    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard?error=server&why=${encodeURIComponent(
        why.slice(0, 160)
      )}`
    );
  }
}
