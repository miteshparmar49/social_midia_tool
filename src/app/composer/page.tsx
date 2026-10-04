"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PlatformKey = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "WHATSAPP";

const PLATFORMS: { key: PlatformKey; name: string; color: string; locked?: string }[] = [
  { key: "FACEBOOK", name: "Facebook", color: "#1877F2" },
  { key: "LINKEDIN", name: "LinkedIn", color: "#0A66C2", locked: "LinkedIn publishing is coming soon." },
  { key: "WHATSAPP", name: "WhatsApp", color: "#1FA855", locked: "WhatsApp publishing is coming soon." },
  { key: "INSTAGRAM", name: "Instagram", color: "#C13584", locked: "Instagram publishing is coming soon." },
];

const MB = 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"];

function toLocalInput(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function ComposerPage() {
  const router = useRouter();
  const [connected, setConnected] = useState<PlatformKey[] | null>(null);
  const [selected, setSelected] = useState<PlatformKey[]>([]);
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setWhen(toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((rows: { platform: PlatformKey }[]) => setConnected(rows.map((r) => r.platform)))
      .catch(() => setConnected([]));
  }, []);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function toggle(key: PlatformKey) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError("Use a JPG, PNG, WebP or MP4 file");
    if (f.size > (f.type.startsWith("video/") ? 100 * MB : 10 * MB)) {
      return setError("Photos can be up to 10 MB and videos up to 100 MB");
    }
    setError("");
    setFile(f);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!text.trim()) return setError("Write something to post");
    if (!selected.length) return setError("Choose at least one platform");
    const date = new Date(when);
    if (isNaN(date.getTime()) || date.getTime() < Date.now()) return setError("Pick a time in the future");

    setBusy(true);
    try {
      let mediaKeys: string[] = [];
      if (file) {
        setStatus("Uploading file");
        const r = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not start the upload");
        const { url, key } = await r.json();
        const put = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!put.ok) throw new Error("Upload failed. Check the storage and CORS settings.");
        mediaKeys = [key];
      }
      setStatus("Saving post");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), platforms: selected, scheduledAt: date.toISOString(), mediaKeys }),
      });
      if (!res.ok) throw new Error("Could not save the post. Please try again.");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">New post</h1>
      <p className="mb-6 text-sm text-slate-500">Write once, schedule for later</p>

      <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label htmlFor="text" className="mb-1 block text-sm font-medium">Post text</label>
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

        <div>
          <p className="mb-1 text-sm font-medium">Photo or video (optional)</p>
          {file && preview ? (
            <div className="rounded-lg border border-slate-200 p-3">
              {file.type.startsWith("video/") ? (
                <video src={preview} controls className="max-h-64 w-full rounded-md bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Selected file preview" className="max-h-64 rounded-md" />
              )}
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="truncate text-slate-600">{file.name} ({(file.size / MB).toFixed(1)} MB)</span>
                <button type="button" onClick={() => setFile(null)} className="font-medium text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/40">
              <span className="font-medium text-indigo-700">Choose a file</span>
              <span>JPG, PNG, WebP up to 10 MB, or MP4 up to 100 MB</span>
              <input type="file" accept={TYPES.join(",")} onChange={onFile} className="sr-only" />
            </label>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Post to</legend>
          {connected === null && <p className="text-sm text-slate-600">Loading accounts</p>}
          {connected && connected.length === 0 && (
            <p className="text-sm text-slate-600">
              No accounts connected yet.{" "}
              <Link href="/dashboard" className="font-medium underline">Connect one on the dashboard</Link>
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
          <label htmlFor="when" className="mb-1 block text-sm font-medium">Schedule for</label>
          <input
            id="when"
            type="datetime-local"
            value={when}
            min={when ? toLocalInput(new Date()) : undefined}
            onChange={(e) => setWhen(e.target.value)}
            className={field}
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {busy ? status || "Please wait" : "Schedule post"}
        </button>
      </form>
    </div>
  );
}
