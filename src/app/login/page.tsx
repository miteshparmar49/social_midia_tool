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
  // The Google button only appears when the Google keys are set.
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return <AuthForm mode="login" notice={notice} googleEnabled={googleEnabled} />;
}
