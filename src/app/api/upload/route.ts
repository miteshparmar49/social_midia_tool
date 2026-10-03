import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { s3 } from "@/lib/s3";
import { getUserId } from "@/lib/user";

const schema = z.object({
  filename: z.string().min(1).max(120),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
});

// Browser uploads straight to storage with the returned URL (PUT).
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  const userId = await getUserId();
  const safe = body.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${userId}/${Date.now()}-${safe}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, ContentType: body.data.contentType }),
    { expiresIn: 300 }
  );
  return NextResponse.json({ url, key });
}
