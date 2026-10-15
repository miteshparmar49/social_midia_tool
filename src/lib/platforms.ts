export type OAuthPlatform = "instagram" | "facebook" | "linkedin";

export const isOAuthPlatform = (p: string): p is OAuthPlatform =>
  ["instagram", "facebook", "linkedin"].includes(p);

export function getOAuth(p: OAuthPlatform) {
  if (p === "linkedin") {
    return {
      authUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      profileUrl: "https://api.linkedin.com/v2/userinfo",
      scope: "openid profile w_member_social",
      id: process.env.LINKEDIN_CLIENT_ID!,
      secret: process.env.LINKEDIN_CLIENT_SECRET!,
    };
  }
  if (p === "instagram") {
    // "Instagram API with Instagram Login": the user signs in with Instagram itself.
    // The Instagram app ID and secret are different from the Meta app ID and secret.
    return {
      authUrl: "https://www.instagram.com/oauth/authorize",
      tokenUrl: "https://api.instagram.com/oauth/access_token",
      profileUrl: "https://graph.instagram.com/v21.0/me",
      scope: "instagram_business_basic,instagram_business_content_publish",
      id: process.env.INSTAGRAM_APP_ID!,
      secret: process.env.INSTAGRAM_APP_SECRET!,
    };
  }
  return {
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/v21.0/me?fields=id,name",
    scope: "pages_show_list,pages_manage_posts,pages_read_engagement,business_management",
    id: process.env.META_APP_ID!,
    secret: process.env.META_APP_SECRET!,
  };
}
