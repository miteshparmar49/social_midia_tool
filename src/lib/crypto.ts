import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

function key(): Buffer {
  const secret = process.env.TOKEN_KEY;

  if (!secret || !/^[0-9a-fA-F]{64}$/.test(secret)) {
    throw new Error("TOKEN_KEY must be exactly 64 hexadecimal characters");
  }

  return Buffer.from(secret, "hex");
}

export function encrypt(text: string): string {
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key(), iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decrypt(value: string): string {
  const parts = value.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivHex, tagHex, encryptedHex] = parts;

  if (
    !/^[0-9a-fA-F]{24}$/.test(ivHex) ||
    !/^[0-9a-fA-F]{32}$/.test(tagHex) ||
    !/^(?:[0-9a-fA-F]{2})*$/.test(encryptedHex)
  ) {
    throw new Error("Invalid encrypted token components");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}


export function testEncryption() {
  const original = "instagram-encryption-test";

  const encrypted = encrypt(original);
  const decrypted = decrypt(encrypted);

  return {
    encryptionWorks: original === decrypted,
  };
}