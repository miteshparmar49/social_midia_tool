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
  return {
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/v21.0/me?fields=id,name",
    // Facebook needs the Pages permissions (add the Pages use case in the Meta app first).
    // Instagram stays on public_profile until its own use case is added.
    scope: p === "facebook" ? "pages_show_list,pages_manage_posts,pages_read_engagement" : "public_profile",
    id: process.env.META_APP_ID!,
    secret: process.env.META_APP_SECRET!,
  };
}
