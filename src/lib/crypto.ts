import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const key = () => Buffer.from(process.env.TOKEN_KEY!, "hex");

export function encrypt(text: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("hex")).join(":");
}

export function decrypt(s: string): string {
  const [iv, tag, enc] = s.split(":").map((h) => Buffer.from(h, "hex"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
