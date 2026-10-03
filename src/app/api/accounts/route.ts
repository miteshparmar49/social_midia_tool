import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";

export async function GET() {
  const userId = await getUserId();
  const rows = await prisma.socialAccount.findMany({ where: { userId }, select: { platform: true, handle: true } });
  return NextResponse.json(rows);
}
