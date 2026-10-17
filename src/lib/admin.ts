// Admins are the emails listed in the ADMIN_EMAILS environment variable (comma separated).
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
