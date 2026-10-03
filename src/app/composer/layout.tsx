import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Only logged-in users can open /composer
export default async function ComposerLayout({ children }: { children: React.ReactNode }) {
  if (!(await auth())) redirect("/login");
  return children;
}
