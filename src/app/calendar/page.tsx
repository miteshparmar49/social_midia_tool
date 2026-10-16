"use client";

import { DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Status = "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "DRAFT";
interface Post {
  id: string;
  text: string;
  platforms: string[];
  scheduledAt: string;
  status: Status;
  error: string | null;
}

const CHIP: Record<Status, string> = {
  SCHEDULED: "bg-amber-50 text-amber-800 ring-amber-200",
  PUBLISHING: "bg-sky-50 text-sky-800 ring-sky-200",
  PUBLISHED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  FAILED: "bg-red-50 text-red-800 ring-red-200",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function CalendarPage() {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Post | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 6 weeks, starting on the Monday on or before the 1st
  const days = useMemo(() => {
    const offset = (month.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + i));
  }, [month]);

  const load = useCallback(async () => {
    const to = new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate() + 1);
    const res = await fetch(`/api/posts?from=${encodeURIComponent(days[0].toISOString())}&to=${encodeURIComponent(to.toISOString())}`).catch(() => null);
    if (res?.ok) setPosts(await res.json());
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    posts.forEach((p) => {
      const k = dayKey(new Date(p.scheduledAt));
      m.set(k, [...(m.get(k) ?? []), p]);
    });
    return m;
  }, [posts]);

  async function onDrop(day: Date, e: DragEvent) {
    e.preventDefault();
    const p = posts.find((x) => x.id === e.dataTransfer.getData("text/plain"));
    if (!p || p.status !== "SCHEDULED") return;
    const old = new Date(p.scheduledAt);
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), old.getHours(), old.getMinutes());
    if (next.getTime() < Date.now()) return setMsg({ ok: false, text: "A post cannot be moved to a time in the past." });
    const res = await fetch(`/api/posts/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: next.toISOString() }),
    });
    if (!res.ok) return setMsg({ ok: false, text: (await res.json().catch(() => ({}))).error ?? "Could not move the post" });
    setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, scheduledAt: next.toISOString() } : x)));
    setMsg({ ok: true, text: "Post moved" });
  }

  async function remove(p: Post) {
    if (!confirm("Delete this post? Anything already published stays on the platform.")) return;
    const res = await fetch(`/api/posts/${p.id}`, { method: "DELETE" });
    if (!res.ok) return setMsg({ ok: false, text: "Could not delete this post" });
    setPosts((ps) => ps.filter((x) => x.id !== p.id));
    setSelected(null);
    setMsg({ ok: true, text: "Post deleted" });
  }

  const todayKey = dayKey(new Date());
  const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-slate-500">Drag a scheduled post to another day to reschedule it</p>
        </div>
        <Link href="/composer" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          + New post
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
        <button className={btn} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">›</button>
        <button className={btn} onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
        <h2 className="ml-2 text-lg font-semibold">{month.toLocaleDateString([], { month: "long", year: "numeric" })}</h2>
      </div>

      {msg && (
        <p role="status" className={`rounded-xl border p-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {msg.text}
        </p>
      )}

      {selected && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">
                {new Date(selected.scheduledAt).toLocaleString()} · {selected.platforms.map((x) => x.toLowerCase()).join(", ")}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words">{selected.text}</p>
              {selected.error && <p className="mt-2 text-sm text-red-600">{selected.error}</p>}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${CHIP[selected.status]}`}>
              {selected.status.toLowerCase()}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            {["SCHEDULED", "FAILED", "DRAFT"].includes(selected.status) && (
              <button onClick={() => remove(selected)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
                Delete
              </button>
            )}
            <button onClick={() => setSelected(null)} className={btn}>Close</button>
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
            {DAYS.map((d) => (
              <div key={d} className="px-2 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const k = dayKey(day);
              const list = byDay.get(k) ?? [];
              const inMonth = day.getMonth() === month.getMonth();
              return (
                <div
                  key={k}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(day, e)}
                  className={`min-h-28 border-b border-r border-slate-100 p-1.5 ${inMonth ? "" : "bg-slate-50/70 text-slate-400"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs ${k === todayKey ? "bg-indigo-600 font-semibold text-white" : ""}`}>
                      {day.getDate()}
                    </span>
                    <Link href={`/composer?date=${k}`} className="rounded px-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`New post on ${k}`}>
                      +
                    </Link>
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((p) => (
                      <button
                        key={p.id}
                        draggable={p.status === "SCHEDULED"}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                        onClick={() => setSelected(p)}
                        title={p.text}
                        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-xs ring-1 ring-inset ${CHIP[p.status]} ${p.status === "SCHEDULED" ? "cursor-grab" : ""}`}
                      >
                        {timeOf(p.scheduledAt)} {p.text}
                      </button>
                    ))}
                    {list.length > 3 && <p className="px-1 text-xs text-slate-500">+{list.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
