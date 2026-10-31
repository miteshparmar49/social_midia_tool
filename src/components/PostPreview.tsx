// "use client";

// import { useEffect, useState } from "react";

// interface Props {
//   text: string;
//   platforms: string[]; // e.g. ["FACEBOOK", "INSTAGRAM"]
//   mediaUrl: string | null;
//   mediaType: string | null; // e.g. "image/jpeg" or "video/mp4"
//   handles: Record<string, string>; // connected account names by platform
//   ytTitle?: string;
//   ytPrivacy?: string;
//   when?: string; // value of the datetime-local field
// }

// const PREVIEWABLE = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "YOUTUBE"] as const;
// const LABEL: Record<string, string> = { FACEBOOK: "Facebook", INSTAGRAM: "Instagram", LINKEDIN: "LinkedIn", YOUTUBE: "YouTube" };
// const COLOR: Record<string, string> = { FACEBOOK: "#1877F2", INSTAGRAM: "#C13584", LINKEDIN: "#0A66C2", YOUTUBE: "#FF0000" };

// const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n).trimEnd() + "…" : t);

// function Avatar({ name, color }: { name: string; color: string }) {
//   return (
//     <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: color }}>
//       {(name.replace("@", "")[0] ?? "?").toUpperCase()}
//     </span>
//   );
// }

// export default function PostPreview({ text, platforms, mediaUrl, mediaType, handles, ytTitle, ytPrivacy, when }: Props) {
//   const list = PREVIEWABLE.filter((p) => platforms.includes(p)) as string[];
//   const tabs = list.length ? list : ["FACEBOOK"];
//   const key = tabs.join(",");
//   const [active, setActive] = useState(tabs[0]);
//   useEffect(() => {
//     if (!tabs.includes(active)) setActive(tabs[0]);
//   }, [key, active]); // eslint-disable-line react-hooks/exhaustive-deps

//   const isVideo = Boolean(mediaType?.startsWith("video/"));
//   const name = handles[active] ?? "Your account";
//   const body = text.trim();
//   const hasYtFields = ytTitle !== undefined; // false when the composer has no YouTube title field
//   const warn: string[] = [];
//   if (active === "INSTAGRAM") {
//     if (!mediaUrl) warn.push("Instagram needs a photo or video.");
//     if (body.length > 2200) warn.push("Instagram cuts the caption at 2,200 characters.");
//   }
//   if (active === "LINKEDIN") {
//     if (isVideo) warn.push("LinkedIn video is not supported yet.");
//     if (body.length > 3000) warn.push("LinkedIn cuts the post at 3,000 characters.");
//   }
//   if (active === "YOUTUBE") {
//     if (!isVideo) warn.push("YouTube needs an MP4 video.");
//     if (hasYtFields && !ytTitle?.trim()) warn.push("Add a video title.");
//     if (hasYtFields && !ytPrivacy) warn.push("Choose who can watch the video.");
//   }

//   const media = mediaUrl ? (
//     isVideo ? (
//       <video src={mediaUrl} controls muted playsInline className="max-h-80 w-full bg-black" />
//     ) : (
//       // eslint-disable-next-line @next/next/no-img-element
//       <img src={mediaUrl} alt="Your photo" className="max-h-96 w-full object-cover" />
//     )
//   ) : null;

//   // const placeholder = <p className="text-slate-400">Your text will appear here</p>;
//   const placeholder = <span className="text-slate-400">Your text will appear here</span>;
//   const schedule = when && !isNaN(new Date(when).getTime()) ? new Date(when).toLocaleString() : null;

//   return (
//     <section aria-label="Post preview" className="rounded-xl border border-slate-200 bg-white p-4">
//       <div className="mb-3 flex items-center justify-between gap-2">
//         <h2 className="text-sm font-semibold">Preview</h2>
//         <div className="flex gap-1">
//           {tabs.map((t) => (
//             <button
//               key={t}
//               type="button"
//               onClick={() => setActive(t)}
//               className={`rounded-full px-2.5 py-1 text-xs font-medium ${active === t ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
//               style={active === t ? { backgroundColor: COLOR[t] } : undefined}
//             >
//               {LABEL[t]}
//             </button>
//           ))}
//         </div>
//       </div>
//       {!list.length && <p className="mb-3 text-xs text-slate-500">Sample preview. Tick a platform to see how your post will look there.</p>}

//       {warn.length > 0 && (
//         <ul className="mb-3 space-y-1 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
//           {warn.map((w) => (
//             <li key={w}>{w}</li>
//           ))}
//         </ul>
//       )}

//       <div className="overflow-hidden rounded-lg border border-slate-200 text-sm">
//         {active === "YOUTUBE" ? (
//           <div>
//             {isVideo && media ? media : <div className="grid aspect-video place-items-center bg-slate-900 text-xs text-slate-400">Choose an MP4 video</div>}
//             <div className="p-3">
//               <p className="font-semibold">{(hasYtFields ? ytTitle?.trim() : body.split("\n")[0].slice(0, 100)) || "Video title"}</p>
//               <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
//                 <Avatar name={name} color={COLOR.YOUTUBE} />
//                 <span>{name}</span>
//                 {ytPrivacy && <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 capitalize">{ytPrivacy.toLowerCase()}</span>}
//               </div>
//               <p className="mt-3 whitespace-pre-wrap break-words text-slate-600">{body ? clip(body, 300) : placeholder}</p>
//             </div>
//           </div>
//         ) : active === "INSTAGRAM" ? (
//           <div>
//             <div className="flex items-center gap-3 p-3">
//               <Avatar name={name} color={COLOR.INSTAGRAM} />
//               <span className="font-semibold">{name}</span>
//             </div>
//             {media ?? <div className="grid aspect-square place-items-center bg-slate-100 text-xs text-slate-400">Photo or video</div>}
//             <div className="space-y-2 p-3">
//               <p className="text-lg tracking-widest text-slate-700" aria-hidden>♡ ◯ ➤</p>
//               <p className="whitespace-pre-wrap break-words">
//                 <span className="font-semibold">{name.replace("@", "")} </span>
//                 {body ? clip(body, 125) : placeholder}
//               </p>
//             </div>
//           </div>
//         ) : (
//           <div>
//             <div className="flex items-center gap-3 p-3">
//               <Avatar name={name} color={COLOR[active]} />
//               <div>
//                 <p className="font-semibold">{name}</p>
//                 <p className="text-xs text-slate-500">{schedule ? `Scheduled · ${schedule}` : "Now"}</p>
//               </div>
//             </div>
//             <p className="whitespace-pre-wrap break-words px-3 pb-3">{body ? clip(body, active === "LINKEDIN" ? 210 : 477) : placeholder}</p>
//             {media}
//             <p className="border-t border-slate-100 p-3 text-xs font-medium text-slate-500">
//               {active === "LINKEDIN" ? "Like · Comment · Repost · Send" : "Like · Comment · Share"}
//             </p>
//           </div>
//         )}
//       </div>
//       {schedule && active !== "FACEBOOK" && active !== "LINKEDIN" && <p className="mt-3 text-xs text-slate-500">Scheduled for {schedule}</p>}
//     </section>
//   );
// }

"use client";

import { useState } from "react";

interface Props {
  text: string;
  customTexts?: Record<string, string>;
  isCustomized: boolean;
  platforms: string[];
  mediaUrl: string | null;
  mediaType: string | null;
  customFiles?: Record<string, File[]>;
  formats?: Record<string, string>;
  handles: Record<string, string>;
  ytTitle?: string;
  ytPrivacy?: string;
  when?: string;
}

const PREVIEWABLE = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "YOUTUBE"] as const;
const LABEL: Record<string, string> = { FACEBOOK: "Facebook", INSTAGRAM: "Instagram", LINKEDIN: "LinkedIn", YOUTUBE: "YouTube" };
const COLOR: Record<string, string> = { FACEBOOK: "#1877F2", INSTAGRAM: "#C13584", LINKEDIN: "#0A66C2", YOUTUBE: "#FF0000" };

const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n).trimEnd() + "…" : t);

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: color }}>
      {(name.replace("@", "")[0] ?? "?").toUpperCase()}
    </span>
  );
}

export default function PostPreview({
  text,
  customTexts,
  isCustomized,
  platforms,
  mediaUrl,
  mediaType,
  customFiles,
  formats,
  handles,
  ytTitle,
  ytPrivacy,
  when,
}: Props) {
  const activePlatforms = PREVIEWABLE.filter((p) => platforms.includes(p)) as string[];
  const schedule = when && !isNaN(new Date(when).getTime()) ? new Date(when).toLocaleString() : null;

  // દરેક પ્લેટફોર્મ માટે અત્યારે કઈ ઇમેજ દેખાઈ રહી છે તેનો ઇન્ડેક્સ સાચવવા માટે
  const [currentIndexes, setCurrentIndexes] = useState<Record<string, number>>({});

  const handleNext = (active: string, maxLen: number) => {
    setCurrentIndexes((prev) => {
      const current = prev[active] || 0;
      const nextIndex = current < maxLen - 1 ? current + 1 : 0; // જો છેલ્લી ઇમેજ હોય તો પાછા પહેલી પર જાવ
      return { ...prev, [active]: nextIndex };
    });
  };

  const handlePrev = (active: string, maxLen: number) => {
    setCurrentIndexes((prev) => {
      const current = prev[active] || 0;
      const prevIndex = current > 0 ? current - 1 : maxLen - 1;
      return { ...prev, [active]: prevIndex };
    });
  };

  return (
    <section aria-label="Post previews" className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm font-semibold text-slate-800">Post Previews</h2>
        <span className="text-xs text-slate-400">{activePlatforms.length} selected</span>
      </div>

      {activePlatforms.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">Tick a platform to see how your post will look there.</p>
      ) : (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {activePlatforms.map((active) => {
            const name = handles[active] ?? "Your account";
            const body = (isCustomized && customTexts ? customTexts[active] || "" : text).trim();
            const formatType = formats ? formats[active as keyof typeof formats] || "POST" : "POST";
            
            let filesList: File[] = [];
            if (isCustomized && customFiles && customFiles[active]) {
              filesList = customFiles[active];
            }

            const currentIndex = currentIndexes[active] || 0;
            const currentFile = filesList[currentIndex];
            const currentMediaUrl = currentFile ? URL.createObjectURL(currentFile) : mediaUrl;
            const currentMediaType = currentFile ? currentFile.type : mediaType;
            const isVideo = Boolean(currentMediaType?.startsWith("video/"));
            const isCarousel = filesList.length > 1;
            const isStory = formatType === "STORY";

            const placeholder = <span className="text-slate-400">Your text will appear here</span>;

            const renderMedia = () => {
              if (!currentMediaUrl) return null;
              return (
                <div className={`relative ${isStory ? "aspect-[9/16]" : active === "INSTAGRAM" ? "aspect-square" : ""} w-full bg-slate-900 flex items-center justify-center overflow-hidden`}>
                  {isVideo ? (
                    <video src={currentMediaUrl} controls muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentMediaUrl} alt="Preview" className="h-full w-full object-cover" />
                  )}
                  
                  {isCarousel && active === "INSTAGRAM" && !isStory && (
                    <>
                      {/* પ્રીવિયસ બટન (‹) */}
                      {currentIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => handlePrev(active, filesList.length)}
                          className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/60 text-white rounded-full h-6 w-6 text-xs flex items-center justify-center hover:bg-black"
                        >
                          ‹
                        </button>
                      )}

                      {/* નેક્સ્ટ બટન (›) */}
                      {currentIndex < filesList.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleNext(active, filesList.length)}
                          className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/60 text-white rounded-full h-6 w-6 text-xs flex items-center justify-center hover:bg-black"
                        >
                          ›
                        </button>
                      )}

                      {/* ડોટ્સ સૂચક (...) */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 px-2 py-1 rounded-full">
                        {filesList.map((_, i) => (
                          <span key={i} className={`h-1.5 w-1.5 rounded-full transition-all ${i === currentIndex ? "bg-white scale-125" : "bg-white/50"}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            };

            if (isStory && active === "INSTAGRAM") {
              return (
                <div key={active} className="rounded-lg border border-slate-200 bg-black overflow-hidden text-sm shadow-sm text-white relative">
                  <div className="flex items-center justify-between px-3 pt-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
                    <div className="flex items-center gap-2">
                      <Avatar name={name} color={COLOR.INSTAGRAM} />
                      <span className="font-semibold text-xs">{name}</span>
                    </div>
                    <span className="text-xs">1s</span>
                  </div>
                  {renderMedia() || <div className="grid aspect-[9/16] place-items-center bg-slate-900 text-xs text-slate-400">Story Photo or Video</div>}
                </div>
              );
            }

            return (
              <div key={active} className="rounded-lg border border-slate-200 bg-white overflow-hidden text-sm shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold" style={{ color: COLOR[active] }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR[active] }} />
                  {LABEL[active]} ({formatType}) {isCarousel ? `· Carousel (${currentIndex + 1}/${filesList.length})` : ""}
                </div>

                {active === "YOUTUBE" ? (
                  <div>
                    {isVideo && currentMediaUrl ? renderMedia() : <div className="grid aspect-video place-items-center bg-slate-900 text-xs text-slate-400">Choose MP4 video</div>}
                    <div className="p-3">
                      <p className="font-semibold text-slate-800">{(ytTitle?.trim() || body.split("\n")[0]?.slice(0, 100)) || "Video title"}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <Avatar name={name} color={COLOR.YOUTUBE} />
                        <span>{name}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-slate-600">{body ? clip(body, 300) : placeholder}</p>
                    </div>
                  </div>
                ) : active === "INSTAGRAM" ? (
                  <div>
                    <div className="flex items-center gap-2.5 p-3">
                      <Avatar name={name} color={COLOR.INSTAGRAM} />
                      <span className="font-semibold text-xs text-slate-800">{name}</span>
                    </div>
                    {renderMedia() || <div className="grid aspect-square place-items-center bg-slate-100 text-xs text-slate-400">Photo or video</div>}
                    <div className="space-y-1.5 p-3">
                      <p className="text-base tracking-widest text-slate-700" aria-hidden>♡ ◯ ➤</p>
                      <p className="whitespace-pre-wrap break-words text-xs">
                        <span className="font-semibold text-slate-800">{name.replace("@", "")} </span>
                        {body ? clip(body, 125) : placeholder}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2.5 p-3">
                      <Avatar name={name} color={COLOR[active]} />
                      <div>
                        <p className="font-semibold text-xs text-slate-800">{name}</p>
                        <p className="text-[10px] text-slate-500">{schedule ? `Scheduled · ${schedule}` : "Now"}</p>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap break-words px-3 pb-3 text-xs text-slate-700">{body ? clip(body, 250) : placeholder}</p>
                    {renderMedia()}
                    <p className="border-t border-slate-100 p-2.5 text-[11px] font-medium text-slate-500 text-center bg-slate-50/50">
                      {active === "LINKEDIN" ? "Like · Comment · Repost · Send" : "Like · Comment · Share"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}