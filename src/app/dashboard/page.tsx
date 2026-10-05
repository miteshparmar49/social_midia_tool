"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PlatformId = "instagram" | "whatsapp" | "facebook" | "linkedin";
type Status = "scheduled" | "publishing" | "published" | "failed";

interface Post {
  id: string;
  text: string;
  platforms: PlatformId[];
  when: string;
  status: Status;
  error: string | null;
}

const PLATFORMS: { id: PlatformId; name: string; color: string; note: string }[] = [
  { id: "facebook", name: "Facebook", color: "#1877F2", note: "Pages you manage" },
  { id: "instagram", name: "Instagram", color: "#C13584", note: "Business or Creator account" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", note: "Profile or Company page" },
  { id: "whatsapp", name: "WhatsApp", color: "#1FA855", note: "Business number (Cloud API)" },
];

const STATUS_STYLE: Record<Status, string> = {
  scheduled: "bg-amber-50 text-amber-700 ring-amber-200",
  publishing: "bg-sky-50 text-sky-700 ring-sky-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
};

const STATS: { key: Status; label: string; dot: string }[] = [
  { key: "scheduled", label: "Scheduled", dot: "bg-amber-500" },
  { key: "published", label: "Published", dot: "bg-emerald-500" },
  { key: "failed", label: "Failed", dot: "bg-red-500" },
];

const card = "rounded-xl border border-slate-200 bg-white";

export default function DashboardPage() {
  const [connected, setConnected] = useState<Record<PlatformId, string | null>>({
    instagram: null,
    facebook: null,
    linkedin: null,
    whatsapp: null,
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const err = q.get("error");
    const ok = q.get("connected");
    if (ok) setNotice({ ok: true, text: `${ok} connected` });
    else if (err === "nopages")
      setNotice({
        ok: false,
        text: `Facebook did not return any Page. Granted: ${q.get("granted") || "none"}. Pages from account: ${q.get("acct") ?? "?"}, ticked Pages: ${q.get("targets") ?? "?"}, businesses: ${q.get("biz") ?? "?"}. ${q.get("why") ? "Facebook says: " + q.get("why") : ""}`,
      });
    else if (err) setNotice({ ok: false, text: `Connect failed (${err}). ${q.get("why") ?? "Please try again."}` });
  }, []);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((rows: { platform: string; handle: string }[]) =>
        setConnected((c) => {
          const next = { ...c };
          rows.forEach((r) => (next[r.platform.toLowerCase() as PlatformId] = r.handle));
          return next;
        })
      )
      .catch(() => {});
    fetch("/api/posts")
      .then((r) => r.json())
      .then((rows: any[]) =>
        setPosts(
          rows.map((p) => ({
            id: p.id,
            text: p.text,
            platforms: p.platforms.map((x: string) => x.toLowerCase()),
            when: new Date(p.scheduledAt).toLocaleString(),
            status: p.status.toLowerCase(),
            error: p.error ?? null,
          }))
        )
      )
      .catch(() => {});
  }, []);

  const anyConnected = Object.values(connected).some(Boolean);
  const count = (s: Status) => posts.filter((p) => p.status === s).length;

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

  return (
    <div className="space-y-8">
      {notice && (
        <p role="status" className={`rounded-xl border p-3 text-sm ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {notice.text}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500">Your posts and connected accounts</p>
        </div>
        {anyConnected ? (
          <Link href="/composer" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + New post
          </Link>
        ) : (
          <p className="text-sm text-slate-500">Connect an account to create your first post</p>
        )}
      </div>

      <section aria-label="Post counts" className="grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.key} className={`${card} p-5`}>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {s.label}
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{count(s.key)}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="accounts">
        <h2 id="accounts" className="mb-3 text-base font-semibold">Connected accounts</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLATFORMS.map((p) => {
            const handle = connected[p.id];
            return (
              <div key={p.id} className={`${card} flex flex-col gap-4 p-4`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: p.color }} aria-hidden>
                    {p.name[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${handle ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className="truncate">{handle ?? p.note}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    handle ? "border border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-slate-900 text-white hover:bg-slate-700"
                  }`}
                >
                  {handle ? "Disconnect" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="recent">
        <h2 id="recent" className="mb-3 text-base font-semibold">Recent posts</h2>
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Post</th>
                <th className="px-4 py-3 font-medium">Platforms</th>
                <th className="px-4 py-3 font-medium">Scheduled for</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No posts yet</td>
                </tr>
              )}
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium">{post.text}</p>
                    {post.error && <p className="truncate text-xs text-red-600" title={post.error}>{post.error}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {post.platforms.map((id) => {
                        const p = PLATFORMS.find((x) => x.id === id)!;
                        return (
                          <span key={id} title={p.name} className="grid h-6 w-6 place-items-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: p.color }}>
                            {p.name[0]}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{post.when}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLE[post.status] ?? ""}`}>
                      {post.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
