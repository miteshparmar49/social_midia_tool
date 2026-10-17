"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import AuthShell from "@/components/AuthShell";

const ICON = {
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 018 0v3",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM3 3l18 18",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function AuthForm({
  mode,
  notice,
  googleEnabled = false,
}: {
  mode: "login" | "register";
  notice?: string;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [info, setInfo] = useState(notice ?? "");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
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

  return (
    <AuthShell>
      <form onSubmit={onSubmit}>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Welcome to MVP InfoTech</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isRegister ? "Start scheduling your social media posts." : "Sign in to continue to your workspace."}
        </p>

        {info && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}

        {isRegister && (
          <div className="mt-6">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
            <div className="relative">
              <Icon d={ICON.user} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="name" name="name" required autoComplete="name" placeholder="Your name" className={inputCls} />
            </div>
          </div>
        )}

        <div className="mt-5">
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
          <div className="relative">
            <Icon d={ICON.mail} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="name@company.com" className={inputCls} />
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <Icon d={ICON.lock} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              required
              minLength={8}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
              className={`${inputCls} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700"
            >
              <Icon d={show ? ICON.eyeOff : ICON.eye} />
            </button>
          </div>
        </div>

        {!isRegister && (
          <p className="mt-2 text-right text-sm">
            <Link href="/forgot-password" className="font-medium text-slate-500 hover:text-blue-700">Forgot password?</Link>
          </p>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

        <button
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0a1a44] to-[#1d4ed8] py-3.5 font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
        >
          {busy ? "Please wait" : isRegister ? "Create account" : "Log in"}
          {!busy && <Icon d={ICON.arrow} />}
        </button>

        {googleEnabled && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or continue with
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <GoogleG />
              Continue with Google
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? "Already have an account? " : "New to MVP InfoTech? "}
          <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-blue-700 hover:underline">
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-slate-400">
          By continuing you agree to our{" "}
          <a href="https://www.mvpinfotech.in/terms-of-service" className="underline">Terms</a> and{" "}
          <a href="https://www.mvpinfotech.in/privacy-policy" className="underline">Privacy Policy</a>.
        </p>
      </form>
    </AuthShell>
  );
}
