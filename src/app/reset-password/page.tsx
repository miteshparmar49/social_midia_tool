import PasswordForm from "@/components/PasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <PasswordForm mode="reset" token={token ?? ""} />;
}
