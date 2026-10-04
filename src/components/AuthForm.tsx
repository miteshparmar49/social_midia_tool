"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Bricolage_Grotesque } from "next/font/google";

const font = Bricolage_Grotesque({ subsets: ["latin"] });

export default function AuthForm({ mode, notice }: { mode: "login" | "register"; notice?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [info, setInfo] = useState(notice ?? "");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));

    if (isRegister) {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.get("name"), email, password }),
      });
      setBusy(false);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Could not create the account");
      return setInfo(
        data.emailSent === false
          ? "Account created, but the verification email could not be sent. Use Forgot password on the login page."
          : "Account created. We sent a verification link to your email. Open it, then log in."
      );
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (result?.error) {
      const code = (result as { code?: string }).code;
      return setError(
        code === "not_verified"
          ? "Please verify your email first. Check your inbox, or use Forgot password."
          : "Wrong email or password"
      );
    }
    router.push("/dashboard");
    router.refresh();
  }

  const input =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900";

  return (
    <main className={`${font.className} grid min-h-screen place-items-center bg-slate-100 px-4`}>
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-white p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{isRegister ? "Create your account" : "Log in"}</h1>
        {info && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{info}</p>}
        {isRegister && (
          <label className="mt-5 block text-sm font-medium">
            Name
            <input name="name" required autoComplete="name" className={input} />
          </label>
        )}
        <label className="mt-4 block text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className={input}
          />
        </label>
        {!isRegister && (
          <p className="mt-2 text-right text-sm">
            <Link href="/forgot-password" className="text-slate-700 underline">Forgot password?</Link>
          </p>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <button
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? "Please wait" : isRegister ? "Create account" : "Log in"}
        </button>
        <div className="my-4 flex items-center gap-3 text-sm text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full rounded-lg border border-slate-300 py-2.5 font-medium hover:bg-slate-50"
        >
          Continue with Google
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link href={isRegister ? "/login" : "/register"} className="font-medium text-slate-900 underline">
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
      </form>
    </main>
  );
}
