"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque } from "next/font/google";

const font = Bricolage_Grotesque({ subsets: ["latin"] });

type PlatformKey = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "WHATSAPP";

const PLATFORMS: { key: PlatformKey; name: string; color: string; locked?: string }[] = [
  { key: "FACEBOOK", name: "Facebook", color: "#1877F2" },
  { key: "LINKEDIN", name: "LinkedIn", color: "#0A66C2" },
  { key: "WHATSAPP", name: "WhatsApp", color: "#1FA855" },
  { key: "INSTAGRAM", name: "Instagram", color: "#C13584", locked: "Needs a photo or video. Upload comes next." },
];

// Value for <input type="datetime-local"> in the user's own timezone
function toLocalInput(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function ComposerPage() {
  const router = useRouter();
  const [connected, setConnected] = useState<PlatformKey[] | null>(null);
  const [selected, setSelected] = useState<PlatformKey[]>([]);
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setWhen(toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((rows: { platform: PlatformKey }[]) => setConnected(rows.map((r) => r.platform)))
      .catch(() => setConnected([]));
  }, []);

  function toggle(key: PlatformKey) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!text.trim()) return setError("Write something to post");
    if (!selected.length) return setError("Choose at least one platform");
    const date = new Date(when);
    if (isNaN(date.getTime()) || date.getTime() < Date.now()) return setError("Pick a time in the future");

    setBusy(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), platforms: selected, scheduledAt: date.toISOString() }),
    });
    setBusy(false);
    if (!res.ok) return setError("Could not save the post. Please try again.");
    router.push("/dashboard");
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900";

  return (
    <main className={`${font.className} min-h-screen bg-slate-100 text-slate-900`}>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="text-sm text-slate-600 underline">
          Back to dashboard
        </Link>
        <h1 className="mb-6 mt-3 text-3xl font-semibold tracking-tight">New post</h1>

        <form onSubmit={onSubmit} className="space-y-6 rounded-xl bg-white p-5">
          <div>
            <label htmlFor="text" className="mb-1 block text-sm font-medium">
              Post text
            </label>
            <textarea
              id="text"
              rows={6}
              maxLength={3000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={field}
              placeholder="What do you want to share?"
            />
            <p className="mt-1 text-right text-xs text-slate-500">{text.length} / 3000</p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Post to</legend>
            {connected === null && <p className="text-sm text-slate-600">Loading accounts</p>}
            {connected && connected.length === 0 && (
              <p className="text-sm text-slate-600">
                No accounts connected yet.{" "}
                <Link href="/dashboard" className="font-medium underline">
                  Connect one on the dashboard
                </Link>
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {PLATFORMS.filter((p) => connected?.includes(p.key)).map((p) => (
                <label
                  key={p.key}
                  className={`flex items-start gap-3 rounded-lg border border-slate-200 p-3 ${p.locked ? "opacity-60" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    disabled={!!p.locked}
                    checked={selected.includes(p.key)}
                    onChange={() => toggle(p.key)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    {p.locked && <span className="block text-xs text-slate-600">{p.locked}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="when" className="mb-1 block text-sm font-medium">
              Schedule for
            </label>
            <input
              id="when"
              type="datetime-local"
              value={when}
              min={when ? toLocalInput(new Date()) : undefined}
              onChange={(e) => setWhen(e.target.value)}
              className={field}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 py-2.5 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {busy ? "Saving" : "Schedule post"}
          </button>
        </form>
      </div>
    </main>
  );
}
