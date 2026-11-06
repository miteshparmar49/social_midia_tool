// // // import { NextRequest, NextResponse } from "next/server";
// // // import { z } from "zod";
// // // import { prisma } from "@/lib/prisma";
// // // import { getUserId } from "@/lib/user";

// // // const schema = z.object({
// // //   text: z.string().min(1).max(3000),
// // //   platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP"])).min(1),
// // //   scheduledAt: z.coerce.date(),
// // //   mediaKeys: z.array(z.string()).max(1).default([]),
// // // });

// // // export async function GET(req: NextRequest) {
// // //   const userId = await getUserId();
// // //   const from = new Date(req.nextUrl.searchParams.get("from") ?? "");
// // //   const to = new Date(req.nextUrl.searchParams.get("to") ?? "");
// // //   const ranged = !isNaN(from.getTime()) && !isNaN(to.getTime());
// // //   const posts = await prisma.post.findMany({
// // //     where: { userId, ...(ranged ? { scheduledAt: { gte: from, lt: to } } : {}) },
// // //     orderBy: { scheduledAt: ranged ? "asc" : "desc" },
// // //     take: ranged ? 500 : 20,
// // //   });
// // //   return NextResponse.json(posts);
// // // }

// // // export async function POST(req: NextRequest) {
// // //   const body = schema.safeParse(await req.json());
// // //   if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
// // //   const userId = await getUserId();
// // //   // A user may only attach files they uploaded themselves.
// // //   if (!body.data.mediaKeys.every((k) => k.startsWith(`${userId}/`))) {
// // //     return NextResponse.json({ error: "Invalid file" }, { status: 400 });
// // //   }
// // //   const post = await prisma.post.create({ data: { ...body.data, userId } });
// // //   return NextResponse.json(post, { status: 201 });
// // // }




// // import { NextRequest, NextResponse } from "next/server";
// // import { z } from "zod";
// // import { prisma } from "@/lib/prisma";
// // import { getUserId } from "@/lib/user";

// // // Zod schema ને અપડેટ કર્યો જેથી customTexts, formats અને multi-media (mediaKeys) હેન્ડલ થઈ શકે
// // const schema = z.object({
// //   text: z.string().max(3000).optional(),
// //   customTexts: z.record(z.string(), z.string()).optional(),
// //   platforms: z
// //     .array(
// //       z.enum([
// //         "INSTAGRAM",
// //         "FACEBOOK",
// //         "LINKEDIN",
// //         "WHATSAPP",
// //         "YOUTUBE",
// //       ])
// //     )
// //     .min(1),
// //   scheduledAt: z.coerce.date(),
// //   mediaKeys: z.array(z.string()).default([]),
// //   formats: z.record(z.string(), z.string()).optional(), // "POST", "REEL", "STORY" માટે
// // });

// // export async function GET(req: NextRequest) {
// //   const userId = await getUserId();

// //   const from = new Date(req.nextUrl.searchParams.get("from") ?? "");
// //   const to = new Date(req.nextUrl.searchParams.get("to") ?? "");

// //   const ranged = !isNaN(from.getTime()) && !isNaN(to.getTime());

// //   const posts = await prisma.post.findMany({
// //     where: {
// //       userId,
// //       ...(ranged
// //         ? {
// //             scheduledAt: {
// //               gte: from,
// //               lt: to,
// //             },
// //           }
// //         : {}),
// //     },
// //     orderBy: {
// //       scheduledAt: ranged ? "asc" : "desc",
// //     },
// //     take: ranged ? 500 : 20,
// //   });

// //   return NextResponse.json(posts);
// // }

// // export async function POST(req: NextRequest) {
// //   try {
// //     const body = schema.safeParse(await req.json());

// //     if (!body.success) {
// //       return NextResponse.json(
// //         { error: body.error.flatten() },
// //         { status: 400 }
// //       );
// //     }

// //     const userId = await getUserId();
// //     const data = body.data;

// //     // A user may only attach files they uploaded themselves.
// //     if (
// //       !data.mediaKeys.every((key) =>
// //         key.startsWith(`${userId}/`)
// //       )
// //     ) {
// //       return NextResponse.json(
// //         { error: "Invalid file" },
// //         { status: 400 }
// //       );
// //     }

// //     // ડેટાબેઝમાં પોસ્ટ સેવ કરવી (જ્યાં formats અને customTexts પણ સેવ થશે)
// //   const post = await prisma.post.create({
// //   data: {
// //     userId,
// //     platforms: data.platforms,
// //     scheduledAt: data.scheduledAt,
// //     text: data.text || "",
// //     mediaKeys: data.mediaKeys,

// //     formats: data.formats ?? {},
// //     customTexts: data.customTexts ?? {},
// //   },
// // });

// //     return NextResponse.json(post, { status: 201 });
// //   } catch (error) {
// //     console.error("CREATE POST ERROR:", error);

// //     return NextResponse.json(
// //       { error: "Could not save the post. Please try again." },
// //       { status: 500 }
// //     );
// //   }
// // }


// import { NextRequest, NextResponse } from "next/server";
// import { z } from "zod";
// import { prisma } from "@/lib/prisma";
// import { getUserId } from "@/lib/user";

// const schema = z.object({
//   text: z.string().max(3000).optional(),
//   customTexts: z.record(z.string(), z.string()).optional(),
//   platforms: z
//     .array(z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP", "YOUTUBE"]))
//     .min(1),
//   scheduledAt: z.coerce.date(),
//   mediaKeys: z.array(z.string()).default([]),
//   // Platform-wise media: { INSTAGRAM: [keys], YOUTUBE: [keys], ... }
//   mediaByPlatform: z.record(z.string(), z.array(z.string())).optional(),
//   formats: z.record(z.string(), z.string()).optional(), // "POST", "REEL", "STORY"
// });

// export async function GET(req: NextRequest) {
//   const userId = await getUserId();

//   const from = new Date(req.nextUrl.searchParams.get("from") ?? "");
//   const to = new Date(req.nextUrl.searchParams.get("to") ?? "");

//   const ranged = !isNaN(from.getTime()) && !isNaN(to.getTime());

//   const posts = await prisma.post.findMany({
//     where: {
//       userId,
//       ...(ranged
//         ? {
//             scheduledAt: {
//               gte: from,
//               lt: to,
//             },
//           }
//         : {}),
//     },
//     orderBy: {
//       scheduledAt: ranged ? "asc" : "desc",
//     },
//     take: ranged ? 500 : 20,
//   });

//   return NextResponse.json(posts);
// }

// export async function POST(req: NextRequest) {
//   try {
//     const body = schema.safeParse(await req.json());

//     if (!body.success) {
//       return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
//     }

//     const userId = await getUserId();
//     const data = body.data;

//     // A user may only attach files they uploaded themselves.
//     const allKeys = [...data.mediaKeys, ...Object.values(data.mediaByPlatform ?? {}).flat()];

//     if (!allKeys.every((key) => key.startsWith(`${userId}/`))) {
//       return NextResponse.json({ error: "Invalid file" }, { status: 400 });
//     }

//     // Customize મોડમાં main text ખાલી હોય છે, એટલે પહેલા platform નો text title તરીકે વાપરો
//     const firstCustomText =
//       data.platforms
//         .map((p) => data.customTexts?.[p]?.trim())
//         .find((t) => !!t) ?? "";

//     const post = await prisma.post.create({
//       data: {
//         userId,
//         platforms: data.platforms,
//         scheduledAt: data.scheduledAt,
//         text: data.text?.trim() || firstCustomText,
//         mediaKeys: data.mediaKeys,
//         mediaByPlatform: data.mediaByPlatform ?? undefined,
//         formats: data.formats ?? {},
//         customTexts: data.customTexts ?? {},
//       },
//     });

//     return NextResponse.json(post, { status: 201 });
//   } catch (error) {
//     console.error("CREATE POST ERROR:", error);

//     return NextResponse.json(
//       { error: "Could not save the post. Please try again." },
//       { status: 500 }
//     );
//   }
// }


// src/app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";

const schema = z.object({
  text: z.string().max(3000).optional(),
  customTexts: z.record(z.string(), z.string()).optional(),
  platforms: z
    .array(z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP", "YOUTUBE"]))
    .min(1),
  scheduledAt: z.coerce.date(),
  mediaKeys: z.array(z.string()).default([]),
  // Platform-wise media: { INSTAGRAM: [keys], YOUTUBE: [keys], ... }
  mediaByPlatform: z.record(z.string(), z.array(z.string())).optional(),
  formats: z.record(z.string(), z.string()).optional(), // "POST", "REEL", "STORY"
});

// ---------------------------------------------------------------
// Plan limit: scheduled posts per month (works only when PLANS_ENFORCED=true)
// Keep these the same as the numbers shown on the Plans page
// ---------------------------------------------------------------
const POST_LIMITS: Record<string, number> = {
  FREE: 20,
  PRO: 200,
  BUSINESS: 1000,
};

// First and last moment of the calendar month (India time) that contains the given date
function monthRangeIST(date: Date) {
  const IST = 5.5 * 60 * 60 * 1000;
  const shifted = new Date(date.getTime() + IST);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();

  return {
    start: new Date(Date.UTC(y, m, 1) - IST),
    end: new Date(Date.UTC(y, m + 1, 1) - IST),
  };
}

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
      return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
    }

    const userId = await getUserId();
    const data = body.data;

    // A user may only attach files they uploaded themselves.
    const allKeys = [...data.mediaKeys, ...Object.values(data.mediaByPlatform ?? {}).flat()];

    if (!allKeys.every((key) => key.startsWith(`${userId}/`))) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    // ---- Monthly post limit of the user's plan ----
    if (process.env.PLANS_ENFORCED === "true") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });

      const plan = user?.plan ?? "FREE";
      const limit = POST_LIMITS[plan] ?? POST_LIMITS.FREE;
      const { start, end } = monthRangeIST(data.scheduledAt);

      // Failed posts do not count
      const used = await prisma.post.count({
        where: {
          userId,
          scheduledAt: { gte: start, lt: end },
          status: { not: "FAILED" },
        },
      });

      if (used >= limit) {
        const label = plan.charAt(0) + plan.slice(1).toLowerCase();

        return NextResponse.json(
          {
            error: `The ${label} plan allows ${limit} scheduled posts per month, and you already have ${used} in that month. Upgrade your plan or pick a date in another month.`,
            code: "POST_LIMIT",
          },
          { status: 403 }
        );
      }
    }

    // In "Customize for each network" mode the main text is empty, so use the first
    // platform's custom text as the post title (shown in the dashboard / calendar).
    const firstCustomText =
      data.platforms
        .map((p) => data.customTexts?.[p]?.trim())
        .find((t) => !!t) ?? "";

    const post = await prisma.post.create({
      data: {
        userId,
        platforms: data.platforms,
        scheduledAt: data.scheduledAt,
        text: data.text?.trim() || firstCustomText,
        mediaKeys: data.mediaKeys,
        mediaByPlatform: data.mediaByPlatform ?? undefined,
        formats: data.formats ?? {},
        customTexts: data.customTexts ?? {},
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