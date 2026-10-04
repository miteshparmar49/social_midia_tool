import { createHash, randomBytes } from "crypto";
import { TokenType } from "@prisma/client";
import { prisma } from "./prisma";
import { sendMail } from "./mail";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

// Only the hash is stored, so a leaked database cannot be used to reset passwords.
export async function createToken(email: string, type: TokenType, minutes: number) {
  const token = randomBytes(32).toString("hex");
  await prisma.authToken.deleteMany({ where: { email, type } });
  await prisma.authToken.create({
    data: { email, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + minutes * 60_000) },
  });
  return token;
}

// Returns the email if the token is valid. A token works only once.
export async function consumeToken(token: string, type: TokenType) {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.type !== type) return null;
  await prisma.authToken.delete({ where: { id: row.id } });
  return row.expiresAt > new Date() ? row.email : null;
}

export async function sendVerifyEmail(email: string) {
  const token = await createToken(email, "VERIFY", 60 * 24);
  const url = `${process.env.APP_URL}/api/verify?token=${token}`;
  await sendMail(email, "Verify your email", `<p>Click the link to verify your email:</p><p><a href="${url}">${url}</a></p><p>The link works for 24 hours.</p>`);
}

export async function sendResetEmail(email: string) {
  const token = await createToken(email, "RESET", 60);
  const url = `${process.env.APP_URL}/reset-password?token=${token}`;
  await sendMail(email, "Reset your password", `<p>Click the link to choose a new password:</p><p><a href="${url}">${url}</a></p><p>The link works for 1 hour. If you did not ask for this, ignore this email.</p>`);
}
