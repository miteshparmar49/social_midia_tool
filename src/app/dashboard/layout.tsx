import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Only logged-in users can open /dashboard
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await auth())) redirect("/login");
  return children;
}
