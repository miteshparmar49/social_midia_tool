// import { NextRequest, NextResponse } from "next/server";
// import { z } from "zod";
// import { prisma } from "@/lib/prisma";
// import { sendResetEmail } from "@/lib/tokens";

// export async function POST(req: NextRequest) {
//   const body = z.object({ email: z.string().trim().email() }).safeParse(await req.json());
//   if (body.success) {
//     const email = body.data.email.toLowerCase();
//     try {
//       if (await prisma.user.findUnique({ where: { email } })) await sendResetEmail(email);
//     } catch (e) {
//       console.error("Reset email failed", e);
//     }
//   }
//   // Same answer every time, so nobody can find out which emails have an account.
//   return NextResponse.json({ ok: true });
// }


import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  try {
    const body = z
      .object({ email: z.string().trim().email() })
      .safeParse(await req.json());

    if (!body.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const email = body.data.email.toLowerCase();

    console.log("Forgot password requested:", email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    console.log("User found:", !!user);

    if (user) {
      console.log("Sending reset email...");

      await sendResetEmail(email);

      console.log("Reset email sent successfully");
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Forgot password API failed:", error);

    return NextResponse.json(
      { error: "Unable to process reset request" },
      { status: 500 }
    );
  }
}