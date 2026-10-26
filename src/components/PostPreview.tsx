"use client";

import { useEffect, useState } from "react";

interface Props {
  text: string;
  platforms: string[]; // e.g. ["FACEBOOK", "INSTAGRAM"]
  mediaUrl: string | null;
  mediaType: string | null; // e.g. "image/jpeg" or "video/mp4"
  handles: Record<string, string>; // connected account names by platform
  ytTitle?: string;
  ytPrivacy?: string;
  when?: string; // value of the datetime-local field
}

const PREVIEWABLE = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "YOUTUBE"] as const;
const LABEL: Record<string, string> = { FACEBOOK: "Facebook", INSTAGRAM: "Instagram", LINKEDIN: "LinkedIn", YOUTUBE: "YouTube" };
const COLOR: Record<string, string> = { FACEBOOK: "#1877F2", INSTAGRAM: "#C13584", LINKEDIN: "#0A66C2", YOUTUBE: "#FF0000" };

const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n).trimEnd() + "…" : t);

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: color }}>
      {(name.replace("@", "")[0] ?? "?").toUpperCase()}
    </span>
  );
}

export default function PostPreview({ text, platforms, mediaUrl, mediaType, handles, ytTitle, ytPrivacy, when }: Props) {
  const list = PREVIEWABLE.filter((p) => platforms.includes(p)) as string[];
  const tabs = list.length ? list : ["FACEBOOK"];
  const key = tabs.join(",");
  const [active, setActive] = useState(tabs[0]);
  useEffect(() => {
    if (!tabs.includes(active)) setActive(tabs[0]);
  }, [key, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const isVideo = Boolean(mediaType?.startsWith("video/"));
  const name = handles[active] ?? "Your account";
  const body = text.trim();
  const warn: string[] = [];
  if (active === "INSTAGRAM") {
    if (!mediaUrl) warn.push("Instagram needs a photo or video.");
    if (body.length > 2200) warn.push("Instagram cuts the caption at 2,200 characters.");
  }
  if (active === "LINKEDIN") {
    if (isVideo) warn.push("LinkedIn video is not supported yet.");
    if (body.length > 3000) warn.push("LinkedIn cuts the post at 3,000 characters.");
  }
  if (active === "YOUTUBE") {
    if (!isVideo) warn.push("YouTube needs an MP4 video.");
    if (!ytTitle?.trim()) warn.push("Add a video title.");
    if (!ytPrivacy) warn.push("Choose who can watch the video.");
  }

  const media = mediaUrl ? (
    isVideo ? (
      <video src={mediaUrl} controls muted playsInline className="max-h-80 w-full bg-black" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mediaUrl} alt="Your photo" className="max-h-96 w-full object-cover" />
    )
  ) : null;

  const placeholder = <p className="text-slate-400">Your text will appear here</p>;
  const schedule = when && !isNaN(new Date(when).getTime()) ? new Date(when).toLocaleString() : null;

  return (
    <section aria-label="Post preview" className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Preview</h2>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActive(t)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${active === t ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              style={active === t ? { backgroundColor: COLOR[t] } : undefined}
            >
              {LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      {!list.length && <p className="mb-3 text-xs text-slate-500">Sample preview. Tick a platform to see how your post will look there.</p>}

      {warn.length > 0 && (
        <ul className="mb-3 space-y-1 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
          {warn.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 text-sm">
        {active === "YOUTUBE" ? (
          <div>
            {isVideo && media ? media : <div className="grid aspect-video place-items-center bg-slate-900 text-xs text-slate-400">Choose an MP4 video</div>}
            <div className="p-3">
              <p className="font-semibold">{ytTitle?.trim() || "Video title"}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Avatar name={name} color={COLOR.YOUTUBE} />
                <span>{name}</span>
                {ytPrivacy && <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 capitalize">{ytPrivacy.toLowerCase()}</span>}
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-slate-600">{body ? clip(body, 300) : placeholder}</p>
            </div>
          </div>
        ) : active === "INSTAGRAM" ? (
          <div>
            <div className="flex items-center gap-3 p-3">
              <Avatar name={name} color={COLOR.INSTAGRAM} />
              <span className="font-semibold">{name}</span>
            </div>
            {media ?? <div className="grid aspect-square place-items-center bg-slate-100 text-xs text-slate-400">Photo or video</div>}
            <div className="space-y-2 p-3">
              <p className="text-lg tracking-widest text-slate-700" aria-hidden>♡ ◯ ➤</p>
              <p className="whitespace-pre-wrap break-words">
                <span className="font-semibold">{name.replace("@", "")} </span>
                {body ? clip(body, 125) : placeholder}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 p-3">
              <Avatar name={name} color={COLOR[active]} />
              <div>
                <p className="font-semibold">{name}</p>
                <p className="text-xs text-slate-500">{schedule ? `Scheduled · ${schedule}` : "Now"}</p>
              </div>
            </div>
            <p className="whitespace-pre-wrap break-words px-3 pb-3">{body ? clip(body, active === "LINKEDIN" ? 210 : 477) : placeholder}</p>
            {media}
            <p className="border-t border-slate-100 p-3 text-xs font-medium text-slate-500">
              {active === "LINKEDIN" ? "Like · Comment · Repost · Send" : "Like · Comment · Share"}
            </p>
          </div>
        )}
      </div>
      {schedule && active !== "FACEBOOK" && active !== "LINKEDIN" && <p className="mt-3 text-xs text-slate-500">Scheduled for {schedule}</p>}
    </section>
  );
}
