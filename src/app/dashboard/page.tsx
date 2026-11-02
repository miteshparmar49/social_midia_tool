"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PlatformId = "instagram" | "whatsapp" | "facebook" | "linkedin" | "youtube";
type Status = "scheduled" | "publishing" | "published" | "failed";

interface Post {
  id: string;
  text: string;
  // Platform-wise text, keys in lower case: { instagram: "...", facebook: "..." }
  customTexts: Partial<Record<PlatformId, string>>;
  platforms: PlatformId[];
  when: string;
  at: Date;
  status: Status;
  error: string | null;
}

const PLATFORMS: { id: PlatformId; name: string; color: string; note: string }[] = [
  { id: "facebook", name: "Facebook", color: "#1877F2", note: "Pages you manage" },
  { id: "instagram", name: "Instagram", color: "#C13584", note: "Business or Creator account" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", note: "Profile or Company page" },
  { id: "whatsapp", name: "WhatsApp", color: "#1FA855", note: "Business number (Cloud API)" },
  { id: "youtube", name: "YouTube", color: "#FF0000", note: "YouTube channel" },
];

const STATUS_STYLE: Record<Status, string> = {
  scheduled: "bg-amber-50 text-amber-700 ring-amber-200",
  publishing: "bg-sky-50 text-sky-700 ring-sky-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
};

const STATUS_COLOR: Record<Status, string> = {
  scheduled: "#F59E0B",
  publishing: "#0EA5E9",
  published: "#10B981",
  failed: "#EF4444",
};

const card = "rounded-2xl border border-slate-200/80 bg-white shadow-sm";
const INITIAL_POSTS_LIMIT = 5;

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fixed format ("Oct 20") so the server and the browser always render the same text
function shortDate(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function mapPost(p: any): Post {
  // customTexts keys are upper case in the database (INSTAGRAM, FACEBOOK...)
  const customTexts: Partial<Record<PlatformId, string>> = {};
  const raw =
    p.customTexts && typeof p.customTexts === "object" ? (p.customTexts as Record<string, unknown>) : {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      customTexts[key.toLowerCase() as PlatformId] = value;
    }
  }

  const at = new Date(p.scheduledAt);

  return {
    id: p.id,
    text: p.text,
    customTexts,
    platforms: (p.platforms ?? []).map((x: string) => x.toLowerCase() as PlatformId),
    when: at.toLocaleString(),
    at,
    status: String(p.status).toLowerCase() as Status,
    error: p.error ?? null,
  };
}

// Platform-wise text lines for one post (only platforms that have their own text)
function getTextLines(post: Post) {
  return post.platforms
    .map((id) => {
      const platform = PLATFORMS.find((item) => item.id === id);
      const full = (post.customTexts[id] ?? "").trim();

      return {
        id,
        name: platform?.name ?? id,
        color: platform?.color ?? "#64748b",
        full,
        short: full.split("\n").find((line) => line.trim()) ?? "",
      };
    })
    .filter((line) => line.full);
}

// Smooth curve through points (Catmull-Rom -> Bezier)
function smoothPath(pts: { x: number; y: number }[], minY: number, maxY: number): string {
  if (pts.length < 2) return "";
  const clamp = (v: number) => Math.min(Math.max(v, minY), maxY);
  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

// ---------------------------------------------------------------
// Icons
// ---------------------------------------------------------------
function Icon({ name }: { name: "send" | "clock" | "check" | "alert" }) {
  const paths: Record<string, string> = {
    send: "M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5Z",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    check: "M5 13l4 4L19 7",
    alert: "M12 8v5m0 3h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------
// Charts (pure SVG, no extra library needed)
// ---------------------------------------------------------------
type Series = { name: string; color: string; values: number[] };

function AreaChart({ labels, series }: { labels: string[]; series: Series[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const H = 250;
  const padL = 34;
  const padR = 14;
  const padT = 14;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const rawMax = Math.max(1, ...series.flatMap((s) => s.values));
  const max = rawMax <= 4 ? 4 : Math.ceil(rawMax / 4) * 4;
  const n = labels.length;

  const x = (i: number) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const ticks = [0, 1, 2, 3, 4].map((t) => (max / 4) * t);
  const labelStep = Math.max(1, Math.ceil(n / 7));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Posts per day chart">
        <defs>
          {series.map((s) => (
            <linearGradient key={s.name} id={`grad-${s.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#E2E8F0" strokeDasharray="4 4" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* x labels */}
        {labels.map((l, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#94A3B8">
              {l}
            </text>
          ) : null
        )}

        {/* Series */}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => ({ x: x(i), y: y(v) }));
          const line = smoothPath(pts, padT, padT + innerH);
          const area = line ? `${line} L ${x(n - 1)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z` : "";

          return (
            <g key={s.name}>
              {si === 0 && area && <path d={area} fill={`url(#grad-${s.name})`} />}
              {line && <path d={line} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />}
              {hover !== null && (
                <circle cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill="#fff" stroke={s.color} strokeWidth="2.5" />
              )}
            </g>
          );
        })}

        {/* Hover guide */}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="#CBD5E1" strokeWidth="1" />
        )}

        {/* Hover zones */}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={x(i) - innerW / n / 2}
            y={padT}
            width={innerW / n}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: hover > n / 2 ? "translateX(-105%)" : "translateX(8%)",
          }}
        >
          <p className="mb-1 font-semibold text-slate-700">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center justify-between gap-3 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
              <span className="font-semibold text-slate-800">{s.values[hover]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Donut({
  data,
  centerLabel,
}: {
  data: { name: string; color: string; value: number }[];
  centerLabel: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let acc = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label="Posts by platform">
          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#F1F5F9" strokeWidth="6" />
          {total > 0 &&
            data.map((d) => {
              const pct = (d.value / total) * 100;
              const offset = 100 - acc;
              acc += pct;

              return (
                <circle
                  key={d.name}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={d.color}
                  strokeWidth="6"
                  strokeDasharray={`${Math.max(pct - 0.8, 0)} ${100 - Math.max(pct - 0.8, 0)}`}
                  strokeDashoffset={offset}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-bold leading-none text-slate-900">{total}</p>
            <p className="mt-1 text-[11px] text-slate-500">{centerLabel}</p>
          </div>
        </div>
      </div>

      <ul className="min-w-[140px] flex-1 space-y-2 text-sm">
        {data.length === 0 && <li className="text-slate-500">No data yet</li>}
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name}
            </span>
            <span className="font-semibold text-slate-800">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------
// Page
// ---------------------------------------------------------------
export default function DashboardPage() {
  const [connected, setConnected] = useState<Record<PlatformId, string | null>>({
    instagram: null,
    facebook: null,
    linkedin: null,
    whatsapp: null,
    youtube: null,
  });

  const [posts, setPosts] = useState<Post[]>([]); // latest 20 (table)
  const [rangePosts, setRangePosts] = useState<Post[]>([]); // last 30 days + next 30 days (charts)
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [showAllPosts, setShowAllPosts] = useState(false);

  // Which platform button is busy (Connect / Disconnect in progress)
  const [busyId, setBusyId] = useState<PlatformId | null>(null);

  // If the user comes back with the browser Back button, clear the loading state
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setBusyId(null);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  // Charts depend on the current date/time zone, so draw them only in the browser
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const err = q.get("error");
    const ok = q.get("connected");

    if (ok) {
      setNotice({ ok: true, text: `${ok} connected` });
    } else if (err === "nopages") {
      setNotice({
        ok: false,
        text: `Facebook did not return any Page. Granted: ${q.get("granted") || "none"}. Pages from account: ${
          q.get("acct") ?? "?"
        }, ticked Pages: ${q.get("targets") ?? "?"}, businesses: ${q.get("biz") ?? "?"}. ${
          q.get("why") ? "Facebook says: " + q.get("why") : ""
        }`,
      });
    } else if (err) {
      setNotice({
        ok: false,
        text: `Connect failed (${err}). ${q.get("why") ?? "Please try again."}`,
      });
    }
  }, []);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((rows: { platform: string; handle: string }[]) => {
        setConnected((current) => {
          const next = { ...current };

          rows.forEach((row) => {
            const platform = row.platform.toLowerCase() as PlatformId;

            if (platform in next) {
              next[platform] = row.handle;
            }
          });

          return next;
        });
      })
      .catch(() => {});

    // Latest posts for the table
    fetch("/api/posts")
      .then((r) => r.json())
      .then((rows: any[]) => setPosts(rows.map(mapPost)))
      .catch(() => {});

    // Posts in a wider date range for the charts
    const from = new Date();
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setDate(to.getDate() + 31);

    fetch(`/api/posts?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`)
      .then((r) => r.json())
      .then((rows: any[]) => setRangePosts(Array.isArray(rows) ? rows.map(mapPost) : []))
      .catch(() => {});
  }, []);

  const anyConnected = Object.values(connected).some(Boolean);

  // ---- Stats (from posts in range) ----
  const stats = useMemo(() => {
    const c = { total: rangePosts.length, scheduled: 0, publishing: 0, published: 0, failed: 0 };
    rangePosts.forEach((p) => {
      c[p.status] += 1;
    });
    const done = c.published + c.failed;
    const rate = done ? Math.round((c.published / done) * 100) : 0;
    return { ...c, rate };
  }, [rangePosts]);

  // ---- Chart data ----
  const chart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates: Date[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d);
    }

    const keys = dates.map(dayKey);
    const make = (status: Status) =>
      keys.map((k) => rangePosts.filter((p) => p.status === status && dayKey(p.at) === k).length);

    const series: Series[] = [
      { name: "Published", color: STATUS_COLOR.published, values: make("published") },
      { name: "Failed", color: STATUS_COLOR.failed, values: make("failed") },
      { name: "Scheduled", color: STATUS_COLOR.scheduled, values: make("scheduled") },
    ];

    return { labels: dates.map(shortDate), series };
  }, [rangePosts, days]);

  // ---- Posts by platform ----
  const platformData = useMemo(
    () =>
      PLATFORMS.map((pl) => ({
        name: pl.name,
        color: pl.color,
        value: rangePosts.filter((p) => p.platforms.includes(pl.id)).length,
      })).filter((d) => d.value > 0),
    [rangePosts]
  );

  // ---- Upcoming scheduled ----
  const upcoming = useMemo(
    () =>
      rangePosts
        .filter((p) => p.status === "scheduled" && p.at.getTime() >= Date.now() - 60_000)
        .sort((a, b) => a.at.getTime() - b.at.getTime())
        .slice(0, 4),
    [rangePosts]
  );

  const count = (status: Status) => rangePosts.filter((post) => post.status === status).length;

  // Show only the first 5 posts unless Show More is clicked.
  const visiblePosts = showAllPosts ? posts : posts.slice(0, INITIAL_POSTS_LIMIT);

  async function toggle(id: PlatformId) {
    if (busyId) return; // ignore clicks while another action is running

    setBusyId(id);
    let redirecting = false;

    try {
      if (connected[id]) {
        const res = await fetch(`/api/connect/${id}`, { method: "DELETE" });

        if (!res.ok) throw new Error("Could not disconnect. Please try again.");

        setConnected((current) => ({ ...current, [id]: null }));
      } else if (id === "whatsapp") {
        const phoneNumberId = prompt("WhatsApp phone number ID");
        const token = prompt("WhatsApp access token");

        if (!phoneNumberId || !token) return;

        const res = await fetch("/api/connect/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumberId, token }),
        });

        if (!res.ok) throw new Error("Could not connect WhatsApp. Please check the details.");

        setConnected((current) => ({ ...current, whatsapp: phoneNumberId }));
      } else {
        // Keep the loading icon until the browser leaves for the login page
        redirecting = true;
        window.location.href = `/api/connect/${id}`;
      }
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      if (!redirecting) setBusyId(null);
    }
  }

  const STAT_CARDS = [
    {
      label: "Total posts",
      value: stats.total,
      hint: "Last 30 days & upcoming",
      icon: "send" as const,
      grad: "from-indigo-500 to-violet-500",
      soft: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Scheduled",
      value: count("scheduled"),
      hint: "Waiting to be published",
      icon: "clock" as const,
      grad: "from-amber-400 to-orange-500",
      soft: "bg-amber-50 text-amber-600",
    },
    {
      label: "Published",
      value: count("published"),
      hint: `${stats.rate}% success rate`,
      icon: "check" as const,
      grad: "from-emerald-400 to-teal-500",
      soft: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Failed",
      value: count("failed"),
      hint: count("failed") ? "Needs your attention" : "All good",
      icon: "alert" as const,
      grad: "from-rose-400 to-red-500",
      soft: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      {notice && (
        <p
          role="status"
          className={`rounded-xl border p-3 text-sm ${
            notice.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notice.text}
        </p>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">Manage, schedule and track your social media in one place</p>
        </div>

        {anyConnected ? (
          <Link
            href="/composer"
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-90"
          >
            + New post
          </Link>
        ) : (
          <p className="text-sm text-slate-500">Connect an account to create your first post</p>
        )}
      </div>

      {/* Stat cards */}
      <section aria-label="Post counts" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className={`${card} relative overflow-hidden p-5`}>
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.grad}`} />
            <div className="flex items-center gap-4">
              <span className={`grid h-12 w-12 place-items-center rounded-xl ${s.soft}`}>
                <Icon name={s.icon} />
              </span>
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="text-3xl font-bold tracking-tight text-slate-900">{s.value}</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">{s.hint}</p>
          </div>
        ))}
      </section>

      {/* Chart + connected accounts */}
      <section className="grid gap-6 xl:grid-cols-3">
        <div className={`${card} p-5 xl:col-span-2`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Posting activity</h2>
              <p className="text-xs text-slate-500">Posts per day, by scheduled date</p>
            </div>

            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`cursor-pointer rounded-md px-3 py-1 transition ${
                    days === d ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600">
            {chart.series.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
            ))}
          </div>

          {mounted ? (
            <AreaChart labels={chart.labels} series={chart.series} />
          ) : (
            <div className="h-[250px] animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>

        {/* Connected accounts */}
        <div id="accounts" className={`${card} p-5`}>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Connected accounts</h2>

          <ul className="space-y-3">
            {PLATFORMS.map((platform) => {
              const handle = connected[platform.id];

              return (
                <li key={platform.id} className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: platform.color }}
                    aria-hidden="true"
                  >
                    {platform.name[0]}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{platform.name}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${handle ? "bg-emerald-500" : "bg-slate-300"}`}
                      />
                      <span className="truncate">{handle ?? platform.note}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggle(platform.id)}
                    disabled={busyId !== null}
                    aria-busy={busyId === platform.id}
                    className={`inline-flex min-w-[96px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                      busyId === platform.id
                        ? "cursor-wait"
                        : busyId !== null
                          ? "cursor-not-allowed"
                          : "cursor-pointer"
                    } ${
                      handle
                        ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    {busyId === platform.id && <Spinner className="h-3.5 w-3.5" />}
                    {busyId === platform.id
                      ? handle
                        ? "Disconnecting"
                        : "Connecting"
                      : handle
                        ? "Disconnect"
                        : "Connect"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Platform split + status + upcoming */}
      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className={`${card} p-5`}>
          <h2 className="mb-4 text-base font-semibold text-slate-900">Posts by platform</h2>
          <Donut data={platformData} centerLabel="platform posts" />
        </div>

        <div className={`${card} p-5`}>
          <h2 className="mb-4 text-base font-semibold text-slate-900">Post status</h2>

          <div className="space-y-4">
            {(["published", "scheduled", "publishing", "failed"] as Status[]).map((st) => {
              const value = count(st);
              const pct = stats.total ? Math.round((value / stats.total) * 100) : 0;

              return (
                <div key={st}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize text-slate-600">{st}</span>
                    <span className="font-semibold text-slate-800">
                      {value} <span className="font-normal text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[st] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${card} p-5 lg:col-span-2 xl:col-span-1`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Upcoming posts</h2>
            <Link href="/calendar" className="text-xs font-semibold text-indigo-600 hover:underline">
              View calendar →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No scheduled posts</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((p) => {
                const lines = getTextLines(p);
                const title = lines[0]?.short || p.text || "Untitled post";

                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <div className="flex -space-x-1.5">
                      {p.platforms.slice(0, 3).map((id) => {
                        const pl = PLATFORMS.find((x) => x.id === id);
                        if (!pl) return null;
                        return (
                          <span
                            key={id}
                            title={pl.name}
                            className="grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white"
                            style={{ backgroundColor: pl.color }}
                          >
                            {pl.name[0]}
                          </span>
                        );
                      })}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900" title={title}>
                        {title}
                      </p>
                      <p className="text-xs text-slate-500">{p.when}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Recent Posts */}
      <section aria-labelledby="recent">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent" className="text-base font-semibold text-slate-900">
            Recent posts
          </h2>

          {posts.length > 0 && (
            <span className="text-xs text-slate-500">
              Showing {visiblePosts.length} of {posts.length}
            </span>
          )}
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Post</th>
                  <th className="px-4 py-3 font-medium">Platforms</th>
                  <th className="px-4 py-3 font-medium">Scheduled for</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      No posts yet
                    </td>
                  </tr>
                ) : (
                  visiblePosts.map((post) => {
                    const lines = getTextLines(post);

                    return (
                      <tr key={post.id} className="transition hover:bg-slate-50/60">
                        <td className="max-w-md px-4 py-3">
                          {lines.length > 0 ? (
                            // Platform-wise text (Customize for each network)
                            <div className="space-y-1">
                              {lines.map((line) => (
                                <p
                                  key={line.id}
                                  className="flex items-center gap-2 text-xs"
                                  title={`${line.name}: ${line.full}`}
                                >
                                  <span
                                    className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white"
                                    style={{ backgroundColor: line.color }}
                                    aria-label={line.name}
                                  >
                                    {line.name[0]}
                                  </span>

                                  <span className="truncate font-medium text-slate-800">{line.short}</span>
                                </p>
                              ))}
                            </div>
                          ) : (
                            // Same text for all platforms
                            <p className="truncate font-medium" title={post.text}>
                              {post.text}
                            </p>
                          )}

                          {post.error && (
                            <p className="mt-1 truncate text-xs text-red-600" title={post.error}>
                              {post.error}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {post.platforms.map((id) => {
                              const platform = PLATFORMS.find((item) => item.id === id);

                              if (!platform) return null;

                              return (
                                <span
                                  key={id}
                                  title={platform.name}
                                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                                  style={{ backgroundColor: platform.color }}
                                >
                                  {platform.name[0]}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{post.when}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
                              STATUS_STYLE[post.status] ?? ""
                            }`}
                          >
                            {post.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Show More / Show Less */}
          {posts.length > INITIAL_POSTS_LIMIT && (
            <div className="flex justify-center border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setShowAllPosts((previous) => !previous)}
                aria-expanded={showAllPosts}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {showAllPosts ? (
                  <>
                    Show Less
                    <span aria-hidden="true">↑</span>
                  </>
                ) : (
                  <>
                    Show More
                    <span className="text-slate-400">({posts.length - INITIAL_POSTS_LIMIT} more)</span>
                    <span aria-hidden="true">↓</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}