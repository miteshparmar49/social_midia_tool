import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return <AuthForm mode="register" googleEnabled={googleEnabled} />;
}
