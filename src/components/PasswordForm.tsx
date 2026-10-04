"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";

const font = Bricolage_Grotesque({ subsets: ["latin"] });

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
    <main className={`${font.className} grid min-h-screen place-items-center bg-slate-100 px-4`}>
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-white p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{isForgot ? "Forgot password" : "Choose a new password"}</h1>
        {isForgot ? (
          <label className="mt-5 block text-sm font-medium">
            Email
            <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        ) : (
          <label className="mt-5 block text-sm font-medium">
            New password
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        )}
        {info && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{info}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 font-medium text-white hover:bg-slate-700 disabled:opacity-60">
          {busy ? "Please wait" : isForgot ? "Send reset link" : "Save password"}
        </button>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="font-medium text-slate-900 underline">Back to log in</Link>
        </p>
      </form>
    </main>
  );
}
