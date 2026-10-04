import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerifyEmail } from "@/lib/tokens";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Enter a name, a valid email and a password of 8+ characters" }, { status: 400 });
  }
  const email = body.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "This email is already registered. Log in or use Forgot password." }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(body.data.password, 12);
  await prisma.user.create({ data: { name: body.data.name, email, passwordHash } });

  let emailSent = true;
  try {
    await sendVerifyEmail(email);
  } catch (e) {
    console.error("Verification email failed", e);
    emailSent = false;
  }
  return NextResponse.json({ ok: true, emailSent }, { status: 201 });
}
