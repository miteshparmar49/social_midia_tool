import AuthForm from "@/components/AuthForm";

type Q = { verified?: string; verify?: string; reset?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const notice = q.verified
    ? "Email verified. You can log in now."
    : q.reset
      ? "Password changed. Log in with your new password."
      : q.verify
        ? "That verification link is invalid or expired. Use Forgot password to get in."
        : undefined;
  return <AuthForm mode="login" notice={notice} />;
}
