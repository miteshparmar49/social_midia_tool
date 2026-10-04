import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const go = (q: string) => NextResponse.redirect(`${process.env.APP_URL}/login?${q}`);
  const email = await consumeToken(req.nextUrl.searchParams.get("token") ?? "", "VERIFY");
  if (!email) return go("verify=failed");
  await prisma.user.updateMany({ where: { email }, data: { emailVerified: new Date() } });
  return go("verified=1");
}
