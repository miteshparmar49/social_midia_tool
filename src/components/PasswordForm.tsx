"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function PasswordForm({ mode, token }: { mode: "forgot" | "reset"; token?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const isForgot = mode === "forgot";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch(isForgot ? "/api/forgot" : "/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isForgot ? { email: f.get("email") } : { token, password: f.get("password") }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    if (isForgot) setInfo("If that email has an account, we sent a reset link. Check your inbox.");
    else router.push("/login?reset=1");
  }

  return (
    <AuthShell>
      <form onSubmit={onSubmit}>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">MVP InfoTech</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {isForgot ? "Forgot password?" : "Choose a new password"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isForgot ? "Enter your email and we will send you a reset link." : "Use at least 8 characters."}
        </p>

        <div className="mt-6">
          <label htmlFor="f" className="mb-1.5 block text-sm font-medium text-slate-700">
            {isForgot ? "Email address" : "New password"}
          </label>
          {isForgot ? (
            <input id="f" name="email" type="email" required autoComplete="email" placeholder="name@company.com" className={inputCls} />
          ) : (
            <input id="f" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
          )}
        </div>

        {info && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

        <button
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#0a1a44] to-[#1d4ed8] py-3.5 font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Please wait" : isForgot ? "Send reset link" : "Save password"}
        </button>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-blue-700 hover:underline">Back to log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
