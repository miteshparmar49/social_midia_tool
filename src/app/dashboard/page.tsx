"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bricolage_Grotesque } from "next/font/google";

const font = Bricolage_Grotesque({ subsets: ["latin"] });

type PlatformId = "instagram" | "whatsapp" | "facebook" | "linkedin";
type Status = "scheduled" | "published" | "failed";

interface Platform {
  id: PlatformId;
  name: string;
  color: string;
  note: string;
}

interface Post {
  id: string;
  text: string;
  platforms: PlatformId[];
  when: string;
  status: Status;
}

const PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", color: "#C13584", note: "Business or Creator account" },
  { id: "facebook", name: "Facebook", color: "#1877F2", note: "Pages you manage" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", note: "Profile or Company page" },
  { id: "whatsapp", name: "WhatsApp", color: "#1FA855", note: "Business number (Cloud API)" },
];

const STATUS_STYLE: Record<Status, string> = {
  scheduled: "bg-amber-100 text-amber-900",
  published: "bg-emerald-100 text-emerald-900",
  failed: "bg-red-100 text-red-900",
};

export default function DashboardPage() {
  const [connected, setConnected] = useState<Record<PlatformId, string | null>>({
    instagram: null,
    facebook: null,
    linkedin: null,
    whatsapp: null,
  });

  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((rows: { platform: string; handle: string }[]) =>
      setConnected((c) => {
        const next = { ...c };
        rows.forEach((r) => (next[r.platform.toLowerCase() as PlatformId] = r.handle));
        return next;
      })
    );
    fetch("/api/posts").then((r) => r.json()).then((rows: any[]) =>
      setPosts(rows.map((p) => ({
        id: p.id,
        text: p.text,
        platforms: p.platforms.map((x: string) => x.toLowerCase()),
        when: new Date(p.scheduledAt).toLocaleString(),
        status: p.status.toLowerCase(),
      })))
    );
  }, []);

  const anyConnected = Object.values(connected).some(Boolean);

  async function toggle(id: PlatformId) {
    if (connected[id]) {
      await fetch(`/api/connect/${id}`, { method: "DELETE" });
      setConnected((c) => ({ ...c, [id]: null }));
    } else if (id === "whatsapp") {
      const phoneNumberId = prompt("WhatsApp phone number ID");
      const token = prompt("WhatsApp access token");
      if (!phoneNumberId || !token) return;
      await fetch("/api/connect/whatsapp", { method: "POST", body: JSON.stringify({ phoneNumberId, token }) });
      setConnected((c) => ({ ...c, whatsapp: phoneNumberId }));
    } else {
      window.location.href = `/api/connect/${id}`;
    }
  }

  const count = (s: Status) => posts.filter((p) => p.status === s).length;

  return (
    <main className={`${font.className} min-h-screen bg-slate-100 text-slate-900`}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-slate-600">Your posts and connected accounts</p>
          </div>
          {anyConnected ? (
            <Link
              href="/composer"
              className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              New post
            </Link>
          ) : (
            <p className="text-sm text-slate-600">Connect an account to create your first post</p>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-white"
          >
            Log out
          </button>
        </header>

        <section aria-labelledby="accounts" className="mb-8">
          <h2 id="accounts" className="mb-3 text-lg font-semibold">Connected accounts</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLATFORMS.map((p) => {
              const handle = connected[p.id];
              return (
                <div key={p.id} className="flex items-center gap-4 rounded-xl bg-white p-4">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-semibold text-white"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  >
                    {p.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="truncate text-sm text-slate-600">{handle ?? p.note}</p>
                  </div>
                  <button
                    onClick={() => toggle(p.id)}
                    className={
                      handle
                        ? "rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium hover:bg-slate-50"
                        : "rounded-lg px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90"
                    }
                    style={handle ? undefined : { backgroundColor: p.color }}
                  >
                    {handle ? "Disconnect" : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="overview" className="mb-8">
          <h2 id="overview" className="mb-3 text-lg font-semibold">Posts overview</h2>
          <div className="grid grid-cols-3 gap-3">
            {(["scheduled", "published", "failed"] as Status[]).map((s) => (
              <div key={s} className="rounded-xl bg-white p-4">
                <p className="text-3xl font-semibold">{count(s)}</p>
                <p className="mt-1 text-sm capitalize text-slate-600">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="recent">
          <h2 id="recent" className="mb-3 text-lg font-semibold">Recent posts</h2>
          <ul className="divide-y divide-slate-200 rounded-xl bg-white">
            {posts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="truncate font-medium">{post.text}</p>
                  <p className="text-sm text-slate-600">{post.when}</p>
                </div>
                <div className="flex gap-1.5">
                  {post.platforms.map((id) => {
                    const p = PLATFORMS.find((x) => x.id === id)!;
                    return (
                      <span
                        key={id}
                        title={p.name}
                        className="grid h-6 w-6 place-items-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name[0]}
                      </span>
                    );
                  })}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[post.status]}`}>
                  {post.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
