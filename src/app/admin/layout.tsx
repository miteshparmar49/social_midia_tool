import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import AppLayout from "@/components/AppLayout";
import { isAdminEmail } from "@/lib/admin";

// Only admins can open /admin. Everyone else sees a normal "not found" page.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!isAdminEmail(session.user?.email)) notFound();
  return <AppLayout>{children}</AppLayout>;
}
