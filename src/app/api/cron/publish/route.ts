import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishPost } from "@/lib/publish";

// Called every minute by a cron service with:  Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });

  let published = 0;
  let failed = 0;
  for (const post of due) {
    // Claim the post first, so two overlapping runs can never publish it twice.
    const claim = await prisma.post.updateMany({
      where: { id: post.id, status: "SCHEDULED" },
      data: { status: "PUBLISHING" },
    });
    if (claim.count === 0) continue;

    const result = await publishPost(post);
    await prisma.post.update({
      where: { id: post.id },
      data: result.ok ? { status: "PUBLISHED", error: null } : { status: "FAILED", error: result.error },
    });
    if (result.ok) published++;
    else failed++;
  }
  return NextResponse.json({ checked: due.length, published, failed });
}
