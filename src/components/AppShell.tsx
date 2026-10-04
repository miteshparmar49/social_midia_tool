"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Inter } from "next/font/google";

const font = Inter({ subsets: ["latin"] });

const NAV = [
  { href: "/dashboard", label: "Dashboard", d: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/composer", label: "New post", d: "M12 5v14M5 12h14" },
  { href: "/pricing", label: "Plans", d: "M3 7h18v10H3zM3 11h18" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm text-white">S</span>
      Social Tool
    </Link>
  );
}

export default function AppShell({ name, email, children }: { name: string; email: string; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const initial = (name || email || "?")[0].toUpperCase();

  return (
    <div className={`${font.className} min-h-screen bg-slate-50 text-slate-900 lg:flex`}>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(!open)} aria-label="Menu" className="rounded-lg border border-slate-200 p-2">
          <Icon d="M4 6h16M4 12h16M4 18h16" />
        </button>
      </header>

      <aside
        className={`${open ? "flex" : "hidden"} flex-col border-b border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r`}
      >
        <div className="mb-6 hidden px-2 lg:block">
          <Brand />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon d={n.d} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-4 lg:mt-auto">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-medium text-white">{initial}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name || "Account"}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Log out"
            title="Log out"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Icon d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
