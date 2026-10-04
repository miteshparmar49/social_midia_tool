import type { Plan } from "@prisma/client";

// Launch mode: while PLANS_ENFORCED is not "true", every feature is free for everyone
// and no limit is checked. When you ship a paid feature, set PLANS_ENFORCED=true.
export const PLANS_ENFORCED = process.env.PLANS_ENFORCED === "true";

// Prices and limits are placeholders. Change them freely.
export const PLANS: Record<Plan, { name: string; priceInr: number; accounts: number; postsPerMonth: number; perks: string[] }> = {
  FREE: { name: "Free", priceInr: 0, accounts: 2, postsPerMonth: 20, perks: ["2 connected accounts", "20 scheduled posts per month", "Post composer and dashboard"] },
  PRO: { name: "Pro", priceInr: 499, accounts: 5, postsPerMonth: 200, perks: ["5 connected accounts", "200 scheduled posts per month", "Priority for new features"] },
  BUSINESS: { name: "Business", priceInr: 1499, accounts: 15, postsPerMonth: 1000, perks: ["15 connected accounts", "1000 scheduled posts per month", "Everything in Pro"] },
};

// Add each new feature here and say which plan it needs.
export type Feature = "analytics" | "bulkUpload" | "team";
export const FEATURE_MIN_PLAN: Record<Feature, Plan> = {
  analytics: "PRO",
  bulkUpload: "PRO",
  team: "BUSINESS",
};

const ORDER: Plan[] = ["FREE", "PRO", "BUSINESS"];

export function canUse(plan: Plan, feature: Feature) {
  if (!PLANS_ENFORCED) return true;
  return ORDER.indexOf(plan) >= ORDER.indexOf(FEATURE_MIN_PLAN[feature]);
}

export function withinLimit(plan: Plan, kind: "accounts" | "postsPerMonth", used: number) {
  if (!PLANS_ENFORCED) return true;
  return used < PLANS[plan][kind];
}
