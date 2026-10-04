// import { NextRequest, NextResponse } from "next/server";
// import { Platform } from "@prisma/client";
// import { getOAuth, isOAuthPlatform } from "@/lib/platforms";
// import { prisma } from "@/lib/prisma";
// import { getUserId } from "@/lib/user";
// import { encrypt } from "@/lib/crypto";

// const GRAPH = "https://graph.facebook.com/v21.0";

// export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
//   const { platform } = await params;
//   const back = (q: string) => NextResponse.redirect(`${process.env.APP_URL}/dashboard${q}`);
//   if (!isOAuthPlatform(platform)) return back("?error=platform");

//   const code = req.nextUrl.searchParams.get("code");
//   const state = req.nextUrl.searchParams.get("state");
//   if (!code || state !== req.cookies.get("oauth_state")?.value) return back("?error=state");

//   const o = getOAuth(platform);
//   const tokenRes = await fetch(o.tokenUrl, {
//     method: "POST",
//     headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     body: new URLSearchParams({
//       grant_type: "authorization_code",
//       code,
//       redirect_uri: `${process.env.APP_URL}/api/connect/${platform}/callback`,
//       client_id: o.id,
//       client_secret: o.secret,
//     }),
//   });
//   const token = await tokenRes.json();
//   if (!token.access_token) return back("?error=token");

//   const userId = await getUserId();
//   const p = platform.toUpperCase() as Platform;

//   if (platform === "facebook") {
//     // Swap for a long-lived user token. Page tokens made from it do not expire.
//     const long = await (
//       await fetch(
//         `${GRAPH}/oauth/access_token?` +
//           new URLSearchParams({
//             grant_type: "fb_exchange_token",
//             client_id: o.id,
//             client_secret: o.secret,
//             fb_exchange_token: token.access_token,
//           })
//       )
//     ).json();
//     const pagesRes = await (
//       await fetch(
//         `${GRAPH}/me/accounts?` +
//           new URLSearchParams({ fields: "id,name,access_token", access_token: long.access_token ?? token.access_token })
//       )
//     ).json();
//     const pages: { id: string; name: string; access_token: string }[] = pagesRes.data ?? [];
//     if (!pages.length) return back("?error=nopages");
//     for (const pg of pages) {
//       const data = { handle: pg.name, accessToken: encrypt(pg.access_token), expiresAt: null };
//       await prisma.socialAccount.upsert({
//         where: { userId_platform_externalId: { userId, platform: p, externalId: pg.id } },
//         update: data,
//         create: { userId, platform: p, externalId: pg.id, ...data },
//       });
//     }
//     return back("?connected=facebook");
//   }

//   const profile = await (await fetch(o.profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` } })).json();
//   const externalId: string = profile.id ?? profile.sub;
//   const data = {
//     handle: (profile.name ?? externalId) as string,
//     accessToken: encrypt(token.access_token),
//     expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
//   };
//   await prisma.socialAccount.upsert({
//     where: { userId_platform_externalId: { userId, platform: p, externalId } },
//     update: data,
//     create: { userId, platform: p, externalId, ...data },
//   });
//   return back("?connected=" + platform);
// }


import { NextRequest, NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getOAuth, isOAuthPlatform } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { encrypt } from "@/lib/crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;

    // ---------------------------------------------------------
    // Helper: Redirect back to dashboard
    // ---------------------------------------------------------
    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      console.error("APP_URL is not configured");
      return NextResponse.json(
        { error: "APP_URL is not configured" },
        { status: 500 }
      );
    }

    const back = (query: string) => {
      return NextResponse.redirect(
        `${appUrl}/dashboard${query}`
      );
    };

    // ---------------------------------------------------------
    // Validate platform
    // ---------------------------------------------------------
    if (!isOAuthPlatform(platform)) {
      console.error("Invalid OAuth platform:", platform);
      return back("?error=platform");
    }

    // ---------------------------------------------------------
    // Get OAuth callback parameters
    // ---------------------------------------------------------
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const oauthState = req.cookies.get("oauth_state")?.value;

    console.log("OAuth callback:", {
      platform,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasCookieState: Boolean(oauthState),
      stateLength: state?.length ?? 0,
      cookieStateLength: oauthState?.length ?? 0,
    });

    // ---------------------------------------------------------
    // Facebook/LinkedIn/Instagram may return an OAuth error
    // ---------------------------------------------------------
    const oauthError = req.nextUrl.searchParams.get("error");

    if (oauthError) {
      const description =
        req.nextUrl.searchParams.get("error_description");

      console.error("OAuth provider error:", {
        platform,
        error: oauthError,
        description,
      });

      return back(
        `?error=${encodeURIComponent(oauthError)}`
      );
    }

    // ---------------------------------------------------------
    // Validate authorization code
    // ---------------------------------------------------------
    if (!code) {
      console.error("OAuth callback missing code");
      return back("?error=code");
    }

    // ---------------------------------------------------------
    // Validate OAuth state
    //
    // The state returned by Facebook/LinkedIn/Instagram
    // MUST match the oauth_state cookie created before
    // redirecting the user to the OAuth provider.
    // ---------------------------------------------------------
    if (!state) {
      console.error("OAuth callback missing state");
      return back("?error=state");
    }

    if (!oauthState) {
      console.error("OAuth state cookie is missing");
      return back("?error=state");
    }

    if (state !== oauthState) {
      console.error("OAuth state mismatch", {
        platform,
        stateLength: state.length,
        cookieStateLength: oauthState.length,
      });

      return back("?error=state");
    }

    // ---------------------------------------------------------
    // Get OAuth configuration
    // ---------------------------------------------------------
    const o = getOAuth(platform);

    if (!o.id || !o.secret || !o.tokenUrl) {
      console.error("OAuth configuration is incomplete", {
        platform,
      });

      return back("?error=config");
    }

    // ---------------------------------------------------------
    // OAuth redirect URI
    // ---------------------------------------------------------
    const redirectUri =
      `${appUrl}/api/connect/${platform}/callback`;

    console.log("OAuth redirect URI:", redirectUri);

    // ---------------------------------------------------------
    // Exchange authorization code for access token
    // ---------------------------------------------------------
    const tokenRes = await fetch(o.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: o.id,
        client_secret: o.secret,
      }),
      cache: "no-store",
    });

    const token = await tokenRes.json();

    console.log("OAuth token response:", {
      platform,
      ok: tokenRes.ok,
      hasAccessToken: Boolean(token.access_token),
    });

    if (!tokenRes.ok || !token.access_token) {
      console.error("OAuth token exchange failed:", token);
      return back("?error=token");
    }

    // ---------------------------------------------------------
    // Get logged-in application user
    // ---------------------------------------------------------
    const userId = await getUserId();

    if (!userId) {
      console.error("Unable to determine application user");
      return back("?error=auth");
    }

    const p = platform.toUpperCase() as Platform;

    // =========================================================
    // FACEBOOK
    // =========================================================
    if (platform === "facebook") {
      // -------------------------------------------------------
      // Exchange short-lived user token for long-lived token
      // -------------------------------------------------------
      const longResponse = await fetch(
        `${GRAPH}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: o.id,
            client_secret: o.secret,
            fb_exchange_token: token.access_token,
          }),
        {
          cache: "no-store",
        }
      );

      const long = await longResponse.json();

      if (!longResponse.ok) {
        console.error(
          "Facebook long-lived token exchange failed:",
          long
        );

        return back("?error=facebook_token");
      }

      const userAccessToken =
        long.access_token ?? token.access_token;

      // -------------------------------------------------------
      // Get Facebook Pages managed by the user
      // -------------------------------------------------------
      const pagesResponse = await fetch(
        `${GRAPH}/me/accounts?` +
          new URLSearchParams({
            fields: "id,name,access_token",
            access_token: userAccessToken,
          }),
        {
          cache: "no-store",
        }
      );

      const pagesRes = await pagesResponse.json();

      if (!pagesResponse.ok) {
        console.error(
          "Facebook pages request failed:",
          pagesRes
        );

        return back("?error=pages");
      }

      const pages: {
        id: string;
        name: string;
        access_token: string;
      }[] = pagesRes.data ?? [];

      // -------------------------------------------------------
      // User has no Facebook Pages
      // -------------------------------------------------------
      if (!pages.length) {
        console.error("No Facebook Pages found");
        return back("?error=nopages");
      }

      // -------------------------------------------------------
      // Save every Facebook Page
      // -------------------------------------------------------
      for (const pg of pages) {
        if (
          !pg.id ||
          !pg.name ||
          !pg.access_token
        ) {
          continue;
        }

        const data = {
          handle: pg.name,
          accessToken: encrypt(pg.access_token),
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

      console.log(
        `Facebook connected successfully. Pages: ${pages.length}`
      );

      // -------------------------------------------------------
      // Remove OAuth state cookie
      // -------------------------------------------------------
      const response = NextResponse.redirect(
        `${appUrl}/dashboard?connected=facebook`
      );

      response.cookies.delete("oauth_state");

      return response;
    }

    // =========================================================
    // INSTAGRAM / LINKEDIN
    // =========================================================

    if (!o.profileUrl) {
      console.error(
        "Profile URL is missing for platform:",
        platform
      );

      return back("?error=config");
    }

    const profileResponse = await fetch(
      o.profileUrl,
      {
        headers: {
          Authorization:
            `Bearer ${token.access_token}`,
        },
        cache: "no-store",
      }
    );

    const profile =
      await profileResponse.json();

    if (!profileResponse.ok) {
      console.error(
        "Profile request failed:",
        profile
      );

      return back("?error=profile");
    }

    const externalId: string =
      profile.id ?? profile.sub;

    if (!externalId) {
      console.error(
        "OAuth profile does not contain an ID",
        profile
      );

      return back("?error=profile");
    }

    const data = {
      handle:
        (profile.name ??
          profile.username ??
          externalId) as string,

      accessToken:
        encrypt(token.access_token),

      expiresAt: token.expires_in
        ? new Date(
            Date.now() +
              token.expires_in * 1000
          )
        : null,
    };

    // ---------------------------------------------------------
    // Save social account
    // ---------------------------------------------------------
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

    console.log(
      `${platform} connected successfully`
    );

    // ---------------------------------------------------------
    // Remove OAuth state cookie
    // ---------------------------------------------------------
    const response = NextResponse.redirect(
      `${appUrl}/dashboard?connected=${platform}`
    );

    response.cookies.delete("oauth_state");

    return response;
  } catch (error) {
    console.error(
      "OAuth callback unexpected error:",
      error
    );

    const appUrl = process.env.APP_URL;

    if (appUrl) {
      return NextResponse.redirect(
        `${appUrl}/dashboard?error=oauth`
      );
    }

    return NextResponse.json(
      {
        error: "OAuth callback failed",
      },
      {
        status: 500,
      }
    );
  }
}