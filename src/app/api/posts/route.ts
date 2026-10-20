// import { NextRequest, NextResponse } from "next/server";
// import { z } from "zod";
// import { prisma } from "@/lib/prisma";
// import { getUserId } from "@/lib/user";

// const schema = z.object({
//   text: z.string().min(1).max(3000),
//   platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP"])).min(1),
//   scheduledAt: z.coerce.date(),
//   mediaKeys: z.array(z.string()).max(1).default([]),
// });

// export async function GET(req: NextRequest) {
//   const userId = await getUserId();
//   const from = new Date(req.nextUrl.searchParams.get("from") ?? "");
//   const to = new Date(req.nextUrl.searchParams.get("to") ?? "");
//   const ranged = !isNaN(from.getTime()) && !isNaN(to.getTime());
//   const posts = await prisma.post.findMany({
//     where: { userId, ...(ranged ? { scheduledAt: { gte: from, lt: to } } : {}) },
//     orderBy: { scheduledAt: ranged ? "asc" : "desc" },
//     take: ranged ? 500 : 20,
//   });
//   return NextResponse.json(posts);
// }

// export async function POST(req: NextRequest) {
//   const body = schema.safeParse(await req.json());
//   if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
//   const userId = await getUserId();
//   // A user may only attach files they uploaded themselves.
//   if (!body.data.mediaKeys.every((k) => k.startsWith(`${userId}/`))) {
//     return NextResponse.json({ error: "Invalid file" }, { status: 400 });
//   }
//   const post = await prisma.post.create({ data: { ...body.data, userId } });
//   return NextResponse.json(post, { status: 201 });
// }



import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";

const schema = z.object({
  text: z.string().min(1).max(3000),
  platforms: z
    .array(
      z.enum([
        "INSTAGRAM",
        "FACEBOOK",
        "LINKEDIN",
        "WHATSAPP",
        "YOUTUBE",
      ])
    )
    .min(1),
  scheduledAt: z.coerce.date(),
  mediaKeys: z.array(z.string()).max(1).default([]),
});

export async function GET(req: NextRequest) {
  const userId = await getUserId();

  const from = new Date(req.nextUrl.searchParams.get("from") ?? "");
  const to = new Date(req.nextUrl.searchParams.get("to") ?? "");

  const ranged = !isNaN(from.getTime()) && !isNaN(to.getTime());

  const posts = await prisma.post.findMany({
    where: {
      userId,
      ...(ranged
        ? {
            scheduledAt: {
              gte: from,
              lt: to,
            },
          }
        : {}),
    },
    orderBy: {
      scheduledAt: ranged ? "asc" : "desc",
    },
    take: ranged ? 500 : 20,
  });

  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());

    if (!body.success) {
      return NextResponse.json(
        { error: body.error.flatten() },
        { status: 400 }
      );
    }

    const userId = await getUserId();

    // A user may only attach files they uploaded themselves.
    if (
      !body.data.mediaKeys.every((key) =>
        key.startsWith(`${userId}/`)
      )
    ) {
      return NextResponse.json(
        { error: "Invalid file" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        ...body.data,
        userId,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("CREATE POST ERROR:", error);

    return NextResponse.json(
      { error: "Could not save the post. Please try again." },
      { status: 500 }
    );
  }
}
