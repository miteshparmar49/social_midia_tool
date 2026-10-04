import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  const body = z.object({ email: z.string().trim().email() }).safeParse(await req.json());
  if (body.success) {
    const email = body.data.email.toLowerCase();
    try {
      if (await prisma.user.findUnique({ where: { email } })) await sendResetEmail(email);
    } catch (e) {
      console.error("Reset email failed", e);
    }
  }
  // Same answer every time, so nobody can find out which emails have an account.
  return NextResponse.json({ ok: true });
}
