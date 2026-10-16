import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";

type Ctx = { params: Promise<{ id: string }> };

// Move a scheduled post to another day or time (calendar drag and drop).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = z.object({ scheduledAt: z.coerce.date() }).safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  if (body.data.scheduledAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Pick a time in the future" }, { status: 400 });
  }
  const userId = await getUserId();
  const r = await prisma.post.updateMany({
    where: { id, userId, status: "SCHEDULED" },
    data: { scheduledAt: body.data.scheduledAt },
  });
  if (r.count === 0) return NextResponse.json({ error: "Only scheduled posts can be moved" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Delete a post that has not been published (this does not remove anything already on a platform).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const userId = await getUserId();
  const r = await prisma.post.deleteMany({ where: { id, userId, status: { in: ["SCHEDULED", "FAILED", "DRAFT"] } } });
  if (r.count === 0) return NextResponse.json({ error: "This post cannot be deleted" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
