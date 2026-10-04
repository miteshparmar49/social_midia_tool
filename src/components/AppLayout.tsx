import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppShell from "@/components/AppShell";

// Shared by /dashboard, /composer and /pricing: login check + sidebar layout
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <AppShell name={session.user?.name ?? ""} email={session.user?.email ?? ""}>
      {children}
    </AppShell>
  );
}
