import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

// Admin only: change a user's plan.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await params;
  const body = z.object({ plan: z.enum(["FREE", "PRO", "BUSINESS"]) }).safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const r = await prisma.user.updateMany({ where: { id }, data: { plan: body.data.plan } });
  if (r.count === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
