import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, testEncryption } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const encryptionTest = testEncryption();

    const accounts = await prisma.socialAccount.findMany({
      where: { userId: session.user.id },
      select: {
        platform: true,
        handle: true,
        accessToken: true,
      },
    });

    const results = accounts.map((account) => {
      try {
        decrypt(account.accessToken);

        return {
          platform: account.platform,
          handle: account.handle,
          decryptStatus: "SUCCESS",
        };
      } catch {
        return {
          platform: account.platform,
          handle: account.handle,
          decryptStatus: "FAILED",
        };
      }
    });

    return NextResponse.json({
      encryptionTest,
      accounts: results,
    });

  } catch (error) {
    console.error("Debug error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Debug failed",
      },
      { status: 500 }
    );
  }
}