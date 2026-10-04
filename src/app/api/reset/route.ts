import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

const schema = z.object({ token: z.string().min(10), password: z.string().min(8).max(100) });

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Use a password of 8+ characters" }, { status: 400 });
  const email = await consumeToken(body.data.token, "RESET");
  if (!email) return NextResponse.json({ error: "This link is invalid or has expired. Ask for a new one." }, { status: 400 });
  await prisma.user.updateMany({ where: { email }, data: { passwordHash: await bcrypt.hash(body.data.password, 12) } });
  // Opening the reset link also proves the email belongs to this person.
  await prisma.user.updateMany({ where: { email, emailVerified: null }, data: { emailVerified: new Date() } });
  return NextResponse.json({ ok: true });
}
