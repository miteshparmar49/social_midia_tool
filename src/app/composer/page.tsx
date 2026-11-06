// "use client";

// import { useEffect, useMemo, useState, FormEvent, ChangeEvent } from "react";
// import { useRouter } from "next/navigation";
// import PostPreview from "@/components/PostPreview";

// type PlatformKey = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "WHATSAPP" | "YOUTUBE";
// type PostFormat = "POST" | "REEL" | "STORY";

// const PLATFORMS: {
//   key: PlatformKey;
//   name: string;
//   color: string;
//   locked?: string;
// }[] = [
//   { key: "FACEBOOK", name: "Facebook", color: "#1877F2" },
//   { key: "LINKEDIN", name: "LinkedIn", color: "#0A66C2" },
//   { key: "WHATSAPP", name: "WhatsApp", color: "#1FA855", locked: "WhatsApp publishing is coming soon." },
//   { key: "INSTAGRAM", name: "Instagram", color: "#C13584" },
//   { key: "YOUTUBE", name: "YouTube", color: "#FF0000" },
// ];

// const MB = 1024 * 1024;
// const IMG = ["image/jpeg", "image/png", "image/webp"];
// const VID = ["video/mp4"];

// // ---------------------------------------------------------------
// // Platform + format wise rules (what can be added, recommended size)
// // ---------------------------------------------------------------
// type Rules = {
//   types: string[]; // allowed mime types
//   multiple: boolean;
//   max: number;
//   label: string;
//   size: string; // recommended size
//   note: string;
//   ratio?: { min: number; max: number; label: string }; // width / height
// };

// const RATIO_9_16 = { min: 0.5, max: 0.7, label: "9:16" };

// function getRules(p: PlatformKey, fmt: PostFormat): Rules {
//   switch (p) {
//     case "INSTAGRAM":
//       if (fmt === "REEL") {
//         return {
//           types: VID,
//           multiple: false,
//           max: 1,
//           label: "Reel: 1 MP4 video only",
//           size: "1080 × 1920 px (9:16 vertical)",
//           note: "MP4 (H.264 + AAC), 3 to 90 seconds, max 100 MB.",
//           ratio: RATIO_9_16,
//         };
//       }
//       if (fmt === "STORY") {
//         return {
//           types: [...IMG, ...VID],
//           multiple: false,
//           max: 1,
//           label: "Story: 1 photo or 1 video",
//           size: "1080 × 1920 px (9:16 vertical)",
//           note: "Photo JPG (max 10 MB) or MP4 video (max 60 seconds). Captions and carousels are not supported in Stories.",
//           ratio: RATIO_9_16,
//         };
//       }
//       return {
//         types: [...IMG, ...VID],
//         multiple: true,
//         max: 10,
//         label: "Post: 1 file or Carousel (2 to 10)",
//         size: "1080 × 1080 px (1:1) or 1080 × 1350 px (4:5)",
//         note: "Ratio between 4:5 and 1.91:1. Photo JPG (max 10 MB), video MP4 (max 100 MB). Keep all carousel images in the same ratio.",
//         ratio: { min: 0.8, max: 1.91, label: "4:5 to 1.91:1" },
//       };

//     case "FACEBOOK":
//       if (fmt === "REEL") {
//         return {
//           types: VID,
//           multiple: false,
//           max: 1,
//           label: "Reel: 1 MP4 video only",
//           size: "1080 × 1920 px (9:16 vertical)",
//           note: "MP4, 3 to 90 seconds, max 100 MB.",
//           ratio: RATIO_9_16,
//         };
//       }
//       if (fmt === "STORY") {
//         return {
//           types: [...IMG, ...VID],
//           multiple: false,
//           max: 1,
//           label: "Story: 1 photo or 1 video",
//           size: "1080 × 1920 px (9:16 vertical)",
//           note: "Photo (max 10 MB) or MP4 video (max 100 MB).",
//           ratio: RATIO_9_16,
//         };
//       }
//       return {
//         types: [...IMG, ...VID],
//         multiple: false,
//         max: 1,
//         label: "Post: 1 photo or 1 video",
//         size: "1200 × 630 px (1.91:1) or 1080 × 1080 px (1:1)",
//         note: "Photo max 10 MB, video max 100 MB. Facebook currently supports only 1 media.",
//       };

//     case "LINKEDIN":
//       return {
//         types: IMG,
//         multiple: true,
//         max: 9,
//         label: "Post: photos (max 9)",
//         size: "1200 × 627 px (1.91:1)",
//         note: "JPG or PNG, max 10 MB each. Video is not supported yet.",
//       };

//     case "YOUTUBE":
//       return {
//         types: VID,
//         multiple: false,
//         max: 1,
//         label: "Video: 1 MP4 only",
//         size: "1920 × 1080 px (16:9)",
//         note: "MP4, max 100 MB. For Shorts use 1080 × 1920 px (9:16) and under 60 seconds.",
//       };

//     default:
//       return {
//         types: [...IMG, ...VID],
//         multiple: false,
//         max: 1,
//         label: "1 photo or video",
//         size: "1080 × 1080 px (1:1)",
//         note: "Photo max 10 MB, video max 100 MB.",
//       };
//   }
// }

// function toLocalInput(d: Date) {
//   return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
// }

// // ---------------------------------------------------------------
// // Small components
// // ---------------------------------------------------------------
// function SizeGuide({ name, rules }: { name?: string; rules: Rules }) {
//   return (
//     <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2.5 text-xs text-slate-700 space-y-0.5">
//       <p className="font-semibold text-indigo-800">
//         {name ? `${name} · ` : ""}
//         {rules.label}
//       </p>
//       <p>
//         Recommended size: <span className="font-medium">{rules.size}</span>
//       </p>
//       <p>{rules.note}</p>
//     </div>
//   );
// }

// function MediaThumb({
//   file,
//   onRemove,
//   ratio,
//   heightClass = "h-24",
// }: {
//   file: File;
//   onRemove: () => void;
//   ratio?: Rules["ratio"];
//   heightClass?: string;
// }) {
//   const [url, setUrl] = useState<string | null>(null);
//   const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
//   const isVideo = file.type.startsWith("video/");

//   useEffect(() => {
//     const u = URL.createObjectURL(file);
//     setUrl(u);
//     setDim(null);
//     return () => URL.revokeObjectURL(u);
//   }, [file]);

//   const r = dim ? dim.w / dim.h : null;
//   const mismatch = !!(ratio && r !== null && (r < ratio.min || r > ratio.max));

//   return (
//     <div className="relative rounded-lg border border-slate-200 bg-white p-1.5">
//       {url &&
//         (isVideo ? (
//           <video
//             src={url}
//             className={`${heightClass} w-full rounded object-cover`}
//             onLoadedMetadata={(e) =>
//               setDim({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })
//             }
//           />
//         ) : (
//           // eslint-disable-next-line @next/next/no-img-element
//           <img
//             src={url}
//             alt="Preview"
//             className={`${heightClass} w-full rounded object-cover`}
//             onLoad={(e) =>
//               setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
//             }
//           />
//         ))}
//       <button
//         type="button"
//         onClick={onRemove}
//         className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
//       >
//         ×
//       </button>
//       <p className="mt-1 truncate text-[10px] text-slate-600">
//         {dim ? `${dim.w}×${dim.h} · ` : ""}
//         {(file.size / MB).toFixed(1)} MB
//       </p>
//       {mismatch && ratio && (
//         <p className="text-[10px] font-medium text-amber-700">Recommended ratio: {ratio.label}</p>
//       )}
//     </div>
//   );
// }

// // ---------------------------------------------------------------
// // Page
// // ---------------------------------------------------------------
// export default function ComposerPage() {
//   const router = useRouter();
//   const [connected, setConnected] = useState<PlatformKey[] | null>(null);
//   const [handles, setHandles] = useState<Record<string, string>>({});
//   const [selected, setSelected] = useState<PlatformKey[]>([]);

//   const [isCustomized, setIsCustomized] = useState(false);
//   const [text, setText] = useState("");
//   const [customTexts, setCustomTexts] = useState<Record<PlatformKey, string>>({
//     FACEBOOK: "",
//     LINKEDIN: "",
//     WHATSAPP: "",
//     INSTAGRAM: "",
//     YOUTUBE: "",
//   });

//   const [globalFiles, setGlobalFiles] = useState<File[]>([]);
//   const [customFiles, setCustomFiles] = useState<Record<PlatformKey, File[]>>({
//     FACEBOOK: [],
//     LINKEDIN: [],
//     WHATSAPP: [],
//     INSTAGRAM: [],
//     YOUTUBE: [],
//   });

//   const [formats, setFormats] = useState<Record<PlatformKey, PostFormat>>({
//     FACEBOOK: "POST",
//     LINKEDIN: "POST",
//     WHATSAPP: "POST",
//     INSTAGRAM: "POST",
//     YOUTUBE: "POST",
//   });

//   const [notices, setNotices] = useState<Partial<Record<PlatformKey, string>>>({});
//   const [when, setWhen] = useState("");
//   const [error, setError] = useState("");
//   const [status, setStatus] = useState("");
//   const [busy, setBusy] = useState(false);

//   useEffect(() => {
//     const fallback = new Date(Date.now() + 60 * 60 * 1000);
//     const q = new URLSearchParams(window.location.search).get("date");
//     const picked = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(`${q}T10:00`) : fallback;
//     setWhen(toLocalInput(picked.getTime() > Date.now() ? picked : fallback));
//     fetch("/api/accounts")
//       .then((r) => r.json())
//       .then((rows: { platform: PlatformKey; handle: string }[]) => {
//         setConnected(rows.map((r) => r.platform));
//         setHandles(Object.fromEntries(rows.map((r) => [r.platform, r.handle])));
//       })
//       .catch(() => setConnected([]));
//   }, []);

//   // Rules used in the normal (non-customized) mode
//   const globalRules = useMemo(() => {
//     const p: PlatformKey = selected.includes("INSTAGRAM")
//       ? "INSTAGRAM"
//       : (selected.find((k) => k !== "WHATSAPP") ?? "INSTAGRAM");
//     return getRules(p, "POST");
//   }, [selected]);

//   // Preview URL for the first global file (revoked when it changes)
//   const globalPreviewUrl = useMemo(
//     () => (globalFiles[0] ? URL.createObjectURL(globalFiles[0]) : null),
//     [globalFiles]
//   );
//   useEffect(() => {
//     return () => {
//       if (globalPreviewUrl) URL.revokeObjectURL(globalPreviewUrl);
//     };
//   }, [globalPreviewUrl]);

//   function toggle(key: PlatformKey) {
//     setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
//   }

//   // When the format changes, keep only the files that are allowed for it
//   function changeFormat(platKey: PlatformKey, fmt: PostFormat) {
//     setError("");
//     setFormats((prev) => ({ ...prev, [platKey]: fmt }));

//     const rules = getRules(platKey, fmt);
//     const current = customFiles[platKey];
//     let next = current.filter((f) => rules.types.includes(f.type));
//     if (!rules.multiple) next = next.slice(0, 1);

//     if (next.length !== current.length) {
//       setCustomFiles((prev) => ({ ...prev, [platKey]: next }));
//       setNotices((prev) => ({
//         ...prev,
//         [platKey]:
//           fmt === "REEL"
//             ? "Reels support video only, so the photos were removed. Please add an MP4 video."
//             : "This format supports only 1 file, so the extra files were removed.",
//       }));
//     } else {
//       setNotices((prev) => ({ ...prev, [platKey]: undefined }));
//     }
//   }

//   function handleFilesChange(e: ChangeEvent<HTMLInputElement>, platKey?: PlatformKey) {
//     const chosen = Array.from(e.target.files || []);
//     e.target.value = "";
//     if (!chosen.length) return;

//     const rules = platKey ? getRules(platKey, formats[platKey]) : globalRules;

//     for (const f of chosen) {
//       if (!rules.types.includes(f.type)) {
//         return setError(
//           rules.types.every((t) => t.startsWith("video/"))
//             ? "This format accepts MP4 video only"
//             : rules.types.every((t) => t.startsWith("image/"))
//               ? "This format accepts JPG, PNG or WebP photos only"
//               : "Use a JPG, PNG, WebP or MP4 file"
//         );
//       }
//       if (f.size > (f.type.startsWith("video/") ? 100 * MB : 10 * MB)) {
//         return setError("Photos can be up to 10 MB and videos up to 100 MB");
//       }
//     }

//     setError("");
//     if (platKey) setNotices((prev) => ({ ...prev, [platKey]: undefined }));

//     const apply = (current: File[]): File[] | null => {
//       if (!rules.multiple) return [chosen[0]]; // single media: replace
//       if (current.length + chosen.length > rules.max) {
//         setError(`You can add a maximum of ${rules.max} files`);
//         return null;
//       }
//       return [...current, ...chosen];
//     };

//     if (platKey) {
//       const next = apply(customFiles[platKey]);
//       if (next) setCustomFiles((prev) => ({ ...prev, [platKey]: next }));
//     } else {
//       const next = apply(globalFiles);
//       if (next) setGlobalFiles(next);
//     }
//   }

//   function removeFile(index: number, platKey?: PlatformKey) {
//     if (platKey) {
//       setCustomFiles((prev) => ({
//         ...prev,
//         [platKey]: prev[platKey].filter((_, i) => i !== index),
//       }));
//     } else {
//       setGlobalFiles((prev) => prev.filter((_, i) => i !== index));
//     }
//   }

//   async function onSubmit(e: FormEvent) {
//     e.preventDefault();
//     setError("");
//     if (!isCustomized && !text.trim()) return setError("Write something to post");
//     if (isCustomized && selected.some((p) => !customTexts[p]?.trim())) {
//       return setError("Please write text for all selected platforms");
//     }
//     if (!selected.length) return setError("Choose at least one platform");

//     const date = new Date(when);
//     if (isNaN(date.getTime()) || date.getTime() < Date.now()) return setError("Pick a time in the future");

//     // Decide which files to upload
//     let filesToUpload: File[] = [];
//     if (isCustomized) {
//       // Prefer Instagram's files (carousel), otherwise the first platform that has files
//       const sourcePlatform: PlatformKey = selected.includes("INSTAGRAM")
//         ? "INSTAGRAM"
//         : (selected.find((p) => customFiles[p].length > 0) ?? selected[0]);
//       filesToUpload = customFiles[sourcePlatform] ?? [];
//     } else {
//       filesToUpload = globalFiles;
//     }

//     if (selected.includes("INSTAGRAM")) {
//       const igFormat = isCustomized ? formats.INSTAGRAM : "POST";
//       if (filesToUpload.length === 0) {
//         return setError(
//           igFormat === "REEL"
//             ? "Add an MP4 video for the Instagram Reel"
//             : "Instagram needs a photo or video for Post, Reel, or Story"
//         );
//       }
//       if (igFormat === "REEL" && !filesToUpload[0].type.startsWith("video/")) {
//         return setError("Instagram Reel requires an MP4 video");
//       }
//     }
//     if (selected.includes("YOUTUBE") && !filesToUpload.some((f) => f.type === "video/mp4")) {
//       return setError("Choose an MP4 video for YouTube");
//     }

//     setBusy(true);
//     try {
//       const mediaKeys: string[] = [];

//       // Upload ALL selected files, one by one
//       for (let i = 0; i < filesToUpload.length; i++) {
//         const f = filesToUpload[i];
//         setStatus(`Uploading file ${i + 1} of ${filesToUpload.length}`);

//         const r = await fetch("/api/upload", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ filename: f.name, contentType: f.type, size: f.size }),
//         });
//         if (!r.ok) throw new Error("Could not start the upload");

//         const { url, key } = await r.json();
//         const putRes = await fetch(url, {
//           method: "PUT",
//           headers: { "Content-Type": f.type },
//           body: f,
//         });
//         if (!putRes.ok) throw new Error("Failed to upload file to storage");

//         mediaKeys.push(key);
//       }

//       setStatus("Saving post");
//       const postPayload = isCustomized
//         ? { customTexts, formats, platforms: selected, scheduledAt: date.toISOString(), mediaKeys }
//         : { text: text.trim(), formats, platforms: selected, scheduledAt: date.toISOString(), mediaKeys };

//       const res = await fetch("/api/posts", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(postPayload),
//       });
//       if (!res.ok) throw new Error("Could not save the post.");
//       router.push("/dashboard");
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Something went wrong");
//     } finally {
//       setBusy(false);
//       setStatus("");
//     }
//   }

//   const field =
//     "w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600";

//   return (
//     <div className="max-w-6xl">
//       <h1 className="text-2xl font-semibold tracking-tight">New post</h1>
//       <p className="mb-6 text-sm text-slate-500">Write once, schedule for later</p>

//       <div className="grid gap-6 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
//         <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
//           <fieldset>
//             <legend className="mb-2 text-sm font-medium">Post to</legend>
//             <div className="grid gap-2 sm:grid-cols-2">
//               {PLATFORMS.filter((p) => connected?.includes(p.key)).map((p) => (
//                 <label
//                   key={p.key}
//                   className={`flex items-start gap-3 rounded-lg border border-slate-200 p-3 ${p.locked ? "opacity-60" : "cursor-pointer"}`}
//                 >
//                   <input
//                     type="checkbox"
//                     disabled={!!p.locked}
//                     checked={selected.includes(p.key)}
//                     onChange={() => toggle(p.key)}
//                     className="mt-1 h-4 w-4"
//                   />
//                   <span>
//                     <span className="flex items-center gap-2 font-medium">
//                       <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
//                       {p.name}
//                     </span>
//                   </span>
//                 </label>
//               ))}
//             </div>
//           </fieldset>

//           <div className="flex items-center gap-2 pt-2">
//             <input
//               type="checkbox"
//               id="customizeToggle"
//               checked={isCustomized}
//               onChange={(e) => setIsCustomized(e.target.checked)}
//               className="h-4 w-4 rounded border-slate-300 text-indigo-600"
//             />
//             <label htmlFor="customizeToggle" className="cursor-pointer text-sm font-medium text-slate-700">
//               Customize for each network (દરેક નેટવર્ક માટે અલગ લખો અને ફોર્મેટ/મીડિયા સેટ કરો)
//             </label>
//           </div>

//           {!isCustomized ? (
//             <>
//               <div>
//                 <label htmlFor="text" className="mb-1 block text-sm font-medium">Post text</label>
//                 <textarea
//                   id="text"
//                   rows={5}
//                   maxLength={3000}
//                   value={text}
//                   onChange={(e) => setText(e.target.value)}
//                   className={field}
//                   placeholder="What do you want to share?"
//                 />
//               </div>

//               <div>
//                 <p className="mb-1 text-sm font-medium">Photos or video</p>

//                 {selected.filter((p) => p !== "WHATSAPP").length > 0 && (
//                   <div className="mb-3 space-y-2">
//                     {selected
//                       .filter((p) => p !== "WHATSAPP")
//                       .map((p) => (
//                         <SizeGuide
//                           key={p}
//                           name={PLATFORMS.find((x) => x.key === p)?.name}
//                           rules={getRules(p, "POST")}
//                         />
//                       ))}
//                   </div>
//                 )}

//                 <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
//                   {globalFiles.map((file, idx) => (
//                     <MediaThumb
//                       key={`${file.name}-${idx}`}
//                       file={file}
//                       ratio={globalRules.ratio}
//                       onRemove={() => removeFile(idx)}
//                     />
//                   ))}
//                   {(globalRules.multiple ? globalFiles.length < globalRules.max : globalFiles.length === 0) && (
//                     <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-600 hover:border-indigo-400">
//                       <span className="font-medium text-indigo-700">+ Add file</span>
//                       <input
//                         type="file"
//                         multiple={globalRules.multiple}
//                         accept={globalRules.types.join(",")}
//                         onChange={(e) => handleFilesChange(e)}
//                         className="sr-only"
//                       />
//                     </label>
//                   )}
//                 </div>
//               </div>
//             </>
//           ) : (
//             <div className="space-y-6">
//               {selected.map((platKey) => {
//                 const pInfo = PLATFORMS.find((p) => p.key === platKey);
//                 const platFiles = customFiles[platKey];
//                 const showFormatOptions = platKey === "INSTAGRAM" || platKey === "FACEBOOK";
//                 const fmt = formats[platKey];
//                 const rules = getRules(platKey, fmt);
//                 const canAddMore = rules.multiple ? platFiles.length < rules.max : platFiles.length === 0;

//                 return (
//                   <div key={platKey} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
//                     <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
//                       <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pInfo?.color }} />
//                       {pInfo?.name} Customization
//                     </div>

//                     {showFormatOptions && (
//                       <div className="rounded-lg border border-slate-200 bg-white p-3">
//                         <label className="mb-2 block text-xs font-semibold text-slate-700">
//                           {pInfo?.name} Format:
//                         </label>
//                         <div className="flex gap-4">
//                           {(["POST", "REEL", "STORY"] as PostFormat[]).map((f) => (
//                             <label
//                               key={f}
//                               className="flex cursor-pointer items-center gap-1.5 text-xs font-medium"
//                             >
//                               <input
//                                 type="radio"
//                                 name={`format-${platKey}`}
//                                 checked={fmt === f}
//                                 onChange={() => changeFormat(platKey, f)}
//                                 className="text-indigo-600"
//                               />
//                               {f.charAt(0) + f.slice(1).toLowerCase()}
//                             </label>
//                           ))}
//                         </div>
//                       </div>
//                     )}

//                     <div>
//                       <textarea
//                         rows={3}
//                         value={customTexts[platKey]}
//                         onChange={(e) => setCustomTexts({ ...customTexts, [platKey]: e.target.value })}
//                         className={field}
//                         placeholder={`Write post specifically for ${pInfo?.name}...`}
//                       />
//                     </div>

//                     <div className="space-y-2">
//                       <p className="text-xs font-medium text-slate-600">
//                         {pInfo?.name} Media
//                         {fmt === "REEL" ? " (Video)" : fmt === "STORY" ? " (Photo / Video)" : ""}
//                       </p>

//                       <SizeGuide rules={rules} />

//                       {notices[platKey] && (
//                         <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
//                           {notices[platKey]}
//                         </p>
//                       )}

//                       <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
//                         {platFiles.map((file, idx) => (
//                           <MediaThumb
//                             key={`${file.name}-${idx}`}
//                             file={file}
//                             ratio={rules.ratio}
//                             heightClass="h-20"
//                             onRemove={() => removeFile(idx, platKey)}
//                           />
//                         ))}
//                         {canAddMore && (
//                           <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs hover:border-indigo-400">
//                             <span className="font-medium text-indigo-700">
//                               {fmt === "REEL" ? "+ Add video" : "+ Add file"}
//                             </span>
//                             <input
//                               type="file"
//                               multiple={rules.multiple}
//                               accept={rules.types.join(",")}
//                               onChange={(e) => handleFilesChange(e, platKey)}
//                               className="sr-only"
//                             />
//                           </label>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           <div>
//             <label htmlFor="when" className="mb-1 block text-sm font-medium">Schedule for</label>
//             <input
//               id="when"
//               type="datetime-local"
//               value={when}
//               onChange={(e) => setWhen(e.target.value)}
//               className={field}
//             />
//           </div>

//           {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

//           <button
//             disabled={busy}
//             className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-60"
//           >
//             {busy ? status || "Please wait" : "Schedule post"}
//           </button>
//         </form>

//         <aside className="lg:sticky lg:top-6 lg:self-start">
//           <PostPreview
//             text={text}
//             customTexts={customTexts}
//             isCustomized={isCustomized}
//             platforms={selected}
//             mediaUrl={globalPreviewUrl}
//             mediaType={globalFiles[0]?.type ?? null}
//             customFiles={customFiles}
//             formats={formats}
//             handles={handles}
//             when={when}
//           />
//         </aside>
//       </div>
//     </div>
//   );
// }




// "use client";

// import { useEffect, useMemo, useState, FormEvent, ChangeEvent } from "react";
// import { useRouter } from "next/navigation";
// import PostPreview from "@/components/PostPreview";

// type PlatformKey = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "WHATSAPP" | "YOUTUBE";
// type PostFormat = "POST" | "REEL" | "STORY";

// const PLATFORMS: {
//   key: PlatformKey;
//   name: string;
//   color: string;
//   locked?: string;
// }[] = [
//   { key: "FACEBOOK", name: "Facebook", color: "#1877F2" },
//   { key: "LINKEDIN", name: "LinkedIn", color: "#0A66C2" },
//   { key: "WHATSAPP", name: "WhatsApp", color: "#1FA855", locked: "WhatsApp publishing is coming soon." },
//   { key: "INSTAGRAM", name: "Instagram", color: "#C13584" },
//   { key: "YOUTUBE", name: "YouTube", color: "#FF0000" },
// ];

// const MB = 1024 * 1024;
// const IMG = ["image/jpeg", "image/png", "image/webp"];
// const VID = ["video/mp4"];

// // ---------------------------------------------------------------
// // Platform + format wise rules (what can be added, recommended size)
// // ---------------------------------------------------------------
// type Rules = {
//   types: string[]; // allowed mime types
//   multiple: boolean;
//   max: number;
//   label: string;
//   size: string; // recommended size
//   note: string;
//   ratio?: { min: number; max: number; label: string }; // width / height
// };

// const RATIO_9_16 = { min: 0.5, max: 0.7, label: "9:16" };

// function getRules(p: PlatformKey, fmt: PostFormat): Rules {
//   switch (p) {
//     case "INSTAGRAM":
//       if (fmt === "REEL") {
//         return {
//           types: VID,
//           multiple: false,
//           max: 1,
//           label: "Reel: 1 MP4 video only",
//           size: "1080 × 1920 px (9:16 vertical)",
//           note: "MP4 (H.264 + AAC), 3 to 90 seconds, max 100 MB.",
//           ratio: RATIO_9_16,
//         };
//       }
//       if (fmt === "STORY") {
//         return {
//           types: [...IMG, ...VID],
//           multiple: false,
//           max: 1,
//           label: "Story: 1 photo or 1 video",
//           size: "1080 × 1920 px (9:16 vertical)",
//           note: "Photo JPG (max 10 MB) or MP4 video (max 60 seconds). Captions and carousels are not supported in Stories.",
//           ratio: RATIO_9_16,
//         };
//       }
//       return {
//         types: [...IMG, ...VID],
//         multiple: true,
//         max: 10,
//         label: "Post: 1 file or Carousel (2 to 10)",
//         size: "1080 × 1080 px (1:1) or 1080 × 1350 px (4:5)",
//         note: "Ratio between 4:5 and 1.91:1. Photo JPG (max 10 MB), video MP4 (max 100 MB). Keep all carousel images in the same ratio.",
//         ratio: { min: 0.8, max: 1.91, label: "4:5 to 1.91:1" },
//       };

//     case "FACEBOOK":
//       if (fmt === "REEL") {
//         return {
//           types: VID,
//           multiple: false,
//           max: 1,
//           label: "Reel: 1 MP4 video only",
//           size: "1080 × 1920 px (9:16 vertical)",
//           note: "MP4, 3 to 90 seconds, max 100 MB.",
//           ratio: RATIO_9_16,
//         };
//       }
//       if (fmt === "STORY") {
//         return {
//           types: [...IMG, ...VID],
//           multiple: false,
//           max: 1,
//           label: "Story: 1 photo or 1 video",
//           size: "1080 × 1920 px (9:16 vertical)",
//           note: "Photo (max 10 MB) or MP4 video (max 100 MB).",
//           ratio: RATIO_9_16,
//         };
//       }
//       return {
//         types: [...IMG, ...VID],
//         multiple: false,
//         max: 1,
//         label: "Post: 1 photo or 1 video",
//         size: "1200 × 630 px (1.91:1) or 1080 × 1080 px (1:1)",
//         note: "Photo max 10 MB, video max 100 MB. Facebook currently supports only 1 media.",
//       };

//     case "LINKEDIN":
//       return {
//         types: IMG,
//         multiple: true,
//         max: 9,
//         label: "Post: photos (max 9)",
//         size: "1200 × 627 px (1.91:1)",
//         note: "JPG or PNG, max 10 MB each. Video is not supported yet.",
//       };

//     case "YOUTUBE":
//       return {
//         types: VID,
//         multiple: false,
//         max: 1,
//         label: "Video: 1 MP4 only",
//         size: "1920 × 1080 px (16:9)",
//         note: "MP4, max 100 MB. For Shorts use 1080 × 1920 px (9:16) and under 60 seconds.",
//       };

//     default:
//       return {
//         types: [...IMG, ...VID],
//         multiple: false,
//         max: 1,
//         label: "1 photo or video",
//         size: "1080 × 1080 px (1:1)",
//         note: "Photo max 10 MB, video max 100 MB.",
//       };
//   }
// }

// function toLocalInput(d: Date) {
//   return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
// }

// // ---------------------------------------------------------------
// // Small components
// // ---------------------------------------------------------------
// // ---------------------------------------------------------------
// // AI options
// // ---------------------------------------------------------------
// const AI_TONES = ["Professional", "Friendly", "Festive", "Persuasive", "Funny"];
// const AI_LANGUAGES = [
//   { value: "English", label: "English" },
//   { value: "Gujarati", label: "ગુજરાતી" },
//   { value: "Hindi", label: "हिन्दी" },
// ];
// const AI_LENGTHS = ["Short", "Medium", "Long"];

// const REFINE_ACTIONS = [
//   { id: "shorter", label: "Shorter" },
//   { id: "longer", label: "Longer" },
//   { id: "grammar", label: "Fix grammar" },
//   { id: "catchy", label: "More catchy" },
//   { id: "emojis", label: "Add emojis" },
//   { id: "hashtags", label: "Add hashtags" },
//   { id: "translate_gu", label: "→ ગુજરાતી" },
//   { id: "translate_en", label: "→ English" },
//   { id: "translate_hi", label: "→ हिन्दी" },
// ];

// function Spinner({ className = "h-3 w-3" }: { className?: string }) {
//   return (
//     <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
//       <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
//     </svg>
//   );
// }

// // Small buttons under a text box: shorter, longer, fix grammar, translate...
// function RefineBar({
//   prefix,
//   busyKey,
//   disabled,
//   onAction,
// }: {
//   prefix: string;
//   busyKey: string | null;
//   disabled: boolean;
//   onAction: (action: string) => void;
// }) {
//   return (
//     <div className="mt-2 flex flex-wrap items-center gap-1.5">
//       <span className="text-[11px] font-medium text-violet-700">✨ AI:</span>
//       {REFINE_ACTIONS.map((a) => (
//         <button
//           key={a.id}
//           type="button"
//           disabled={disabled}
//           onClick={() => onAction(a.id)}
//           className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
//         >
//           {busyKey === `${prefix}:${a.id}` && <Spinner />}
//           {a.label}
//         </button>
//       ))}
//     </div>
//   );
// }

// function SizeGuide({ name, rules }: { name?: string; rules: Rules }) {
//   return (
//     <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2.5 text-xs text-slate-700 space-y-0.5">
//       <p className="font-semibold text-indigo-800">
//         {name ? `${name} · ` : ""}
//         {rules.label}
//       </p>
//       <p>
//         Recommended size: <span className="font-medium">{rules.size}</span>
//       </p>
//       <p>{rules.note}</p>
//     </div>
//   );
// }

// function MediaThumb({
//   file,
//   onRemove,
//   ratio,
//   heightClass = "h-24",
// }: {
//   file: File;
//   onRemove: () => void;
//   ratio?: Rules["ratio"];
//   heightClass?: string;
// }) {
//   const [url, setUrl] = useState<string | null>(null);
//   const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
//   const isVideo = file.type.startsWith("video/");

//   useEffect(() => {
//     const u = URL.createObjectURL(file);
//     setUrl(u);
//     setDim(null);
//     return () => URL.revokeObjectURL(u);
//   }, [file]);

//   const r = dim ? dim.w / dim.h : null;
//   const mismatch = !!(ratio && r !== null && (r < ratio.min || r > ratio.max));

//   return (
//     <div className="relative rounded-lg border border-slate-200 bg-white p-1.5">
//       {url &&
//         (isVideo ? (
//           <video
//             src={url}
//             className={`${heightClass} w-full rounded object-cover`}
//             onLoadedMetadata={(e) =>
//               setDim({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })
//             }
//           />
//         ) : (
//           // eslint-disable-next-line @next/next/no-img-element
//           <img
//             src={url}
//             alt="Preview"
//             className={`${heightClass} w-full rounded object-cover`}
//             onLoad={(e) =>
//               setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
//             }
//           />
//         ))}
//       <button
//         type="button"
//         onClick={onRemove}
//         className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
//       >
//         ×
//       </button>
//       <p className="mt-1 truncate text-[10px] text-slate-600">
//         {dim ? `${dim.w}×${dim.h} · ` : ""}
//         {(file.size / MB).toFixed(1)} MB
//       </p>
//       {mismatch && ratio && (
//         <p className="text-[10px] font-medium text-amber-700">Recommended ratio: {ratio.label}</p>
//       )}
//     </div>
//   );
// }

// // ---------------------------------------------------------------
// // Page
// // ---------------------------------------------------------------
// export default function ComposerPage() {
//   const router = useRouter();
//   const [connected, setConnected] = useState<PlatformKey[] | null>(null);
//   const [handles, setHandles] = useState<Record<string, string>>({});
//   const [selected, setSelected] = useState<PlatformKey[]>([]);

//   const [isCustomized, setIsCustomized] = useState(false);
//   const [text, setText] = useState("");
//   const [customTexts, setCustomTexts] = useState<Record<PlatformKey, string>>({
//     FACEBOOK: "",
//     LINKEDIN: "",
//     WHATSAPP: "",
//     INSTAGRAM: "",
//     YOUTUBE: "",
//   });

//   const [globalFiles, setGlobalFiles] = useState<File[]>([]);
//   const [customFiles, setCustomFiles] = useState<Record<PlatformKey, File[]>>({
//     FACEBOOK: [],
//     LINKEDIN: [],
//     WHATSAPP: [],
//     INSTAGRAM: [],
//     YOUTUBE: [],
//   });

//   const [formats, setFormats] = useState<Record<PlatformKey, PostFormat>>({
//     FACEBOOK: "POST",
//     LINKEDIN: "POST",
//     WHATSAPP: "POST",
//     INSTAGRAM: "POST",
//     YOUTUBE: "POST",
//   });

//   const [notices, setNotices] = useState<Partial<Record<PlatformKey, string>>>({});
//   const [when, setWhen] = useState("");
//   const [error, setError] = useState("");
//   const [status, setStatus] = useState("");
//   const [busy, setBusy] = useState(false);

//   // AI writer
//   const [aiIdea, setAiIdea] = useState("");
//   const [aiTone, setAiTone] = useState("Professional");
//   const [aiLang, setAiLang] = useState("English");
//   const [aiLength, setAiLength] = useState("Medium");
//   const [aiBusy, setAiBusy] = useState<string | null>(null); // "generate" or "<platform|global>:<action>"
//   const [aiError, setAiError] = useState("");
//   const [aiUsage, setAiUsage] = useState<{ used: number; limit: number; plan: string } | null>(null);
//   const [aiLimitHit, setAiLimitHit] = useState(false);
//   const aiLocked = !!aiUsage && aiUsage.used >= aiUsage.limit;

//   // How many AI uses are left this month
//   useEffect(() => {
//     fetch("/api/ai/generate")
//       .then((r) => r.json())
//       .then((u) => {
//         if (typeof u?.limit === "number") setAiUsage(u);
//       })
//       .catch(() => {});
//   }, []);

//   useEffect(() => {
//     const fallback = new Date(Date.now() + 60 * 60 * 1000);
//     const q = new URLSearchParams(window.location.search).get("date");
//     const picked = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(`${q}T10:00`) : fallback;
//     setWhen(toLocalInput(picked.getTime() > Date.now() ? picked : fallback));
//     fetch("/api/accounts")
//       .then((r) => r.json())
//       .then((rows: { platform: PlatformKey; handle: string }[]) => {
//         setConnected(rows.map((r) => r.platform));
//         setHandles(Object.fromEntries(rows.map((r) => [r.platform, r.handle])));
//       })
//       .catch(() => setConnected([]));
//   }, []);

//   // Rules used in the normal (non-customized) mode
//   const globalRules = useMemo(() => {
//     const p: PlatformKey = selected.includes("INSTAGRAM")
//       ? "INSTAGRAM"
//       : (selected.find((k) => k !== "WHATSAPP") ?? "INSTAGRAM");
//     return getRules(p, "POST");
//   }, [selected]);

//   // Preview URL for the first global file (revoked when it changes)
//   const globalPreviewUrl = useMemo(
//     () => (globalFiles[0] ? URL.createObjectURL(globalFiles[0]) : null),
//     [globalFiles]
//   );
//   useEffect(() => {
//     return () => {
//       if (globalPreviewUrl) URL.revokeObjectURL(globalPreviewUrl);
//     };
//   }, [globalPreviewUrl]);

//   function toggle(key: PlatformKey) {
//     setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
//   }

//   // When the format changes, keep only the files that are allowed for it
//   function changeFormat(platKey: PlatformKey, fmt: PostFormat) {
//     setError("");
//     setFormats((prev) => ({ ...prev, [platKey]: fmt }));

//     const rules = getRules(platKey, fmt);
//     const current = customFiles[platKey];
//     let next = current.filter((f) => rules.types.includes(f.type));
//     if (!rules.multiple) next = next.slice(0, 1);

//     if (next.length !== current.length) {
//       setCustomFiles((prev) => ({ ...prev, [platKey]: next }));
//       setNotices((prev) => ({
//         ...prev,
//         [platKey]:
//           fmt === "REEL"
//             ? "Reels support video only, so the photos were removed. Please add an MP4 video."
//             : "This format supports only 1 file, so the extra files were removed.",
//       }));
//     } else {
//       setNotices((prev) => ({ ...prev, [platKey]: undefined }));
//     }
//   }

//   function handleFilesChange(e: ChangeEvent<HTMLInputElement>, platKey?: PlatformKey) {
//     const chosen = Array.from(e.target.files || []);
//     e.target.value = "";
//     if (!chosen.length) return;

//     const rules = platKey ? getRules(platKey, formats[platKey]) : globalRules;

//     for (const f of chosen) {
//       if (!rules.types.includes(f.type)) {
//         return setError(
//           rules.types.every((t) => t.startsWith("video/"))
//             ? "This format accepts MP4 video only"
//             : rules.types.every((t) => t.startsWith("image/"))
//               ? "This format accepts JPG, PNG or WebP photos only"
//               : "Use a JPG, PNG, WebP or MP4 file"
//         );
//       }
//       if (f.size > (f.type.startsWith("video/") ? 100 * MB : 10 * MB)) {
//         return setError("Photos can be up to 10 MB and videos up to 100 MB");
//       }
//     }

//     setError("");
//     if (platKey) setNotices((prev) => ({ ...prev, [platKey]: undefined }));

//     const apply = (current: File[]): File[] | null => {
//       if (!rules.multiple) return [chosen[0]]; // single media: replace
//       if (current.length + chosen.length > rules.max) {
//         setError(`You can add a maximum of ${rules.max} files`);
//         return null;
//       }
//       return [...current, ...chosen];
//     };

//     if (platKey) {
//       const next = apply(customFiles[platKey]);
//       if (next) setCustomFiles((prev) => ({ ...prev, [platKey]: next }));
//     } else {
//       const next = apply(globalFiles);
//       if (next) setGlobalFiles(next);
//     }
//   }

//   function removeFile(index: number, platKey?: PlatformKey) {
//     if (platKey) {
//       setCustomFiles((prev) => ({
//         ...prev,
//         [platKey]: prev[platKey].filter((_, i) => i !== index),
//       }));
//     } else {
//       setGlobalFiles((prev) => prev.filter((_, i) => i !== index));
//     }
//   }

//   async function callAI(payload: Record<string, unknown>) {
//     const res = await fetch("/api/ai/generate", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     const data = await res.json().catch(() => ({}));

//     if (data?.usage) setAiUsage(data.usage);

//     if (!res.ok) {
//       if (data?.code === "LIMIT") setAiLimitHit(true);
//       throw new Error(data?.error ?? "AI request failed. Please try again.");
//     }

//     setAiLimitHit(false);
//     return data;
//   }

//   // Write a separate post for every ticked platform
//   async function generateWithAI() {
//     setAiError("");

//     if (aiIdea.trim().length < 3) return setAiError("Write your post idea first");
//     if (!selected.length) return setAiError("Tick at least one platform first");

//     setAiBusy("generate");

//     try {
//       const data = await callAI({
//         mode: "generate",
//         idea: aiIdea.trim(),
//         platforms: selected,
//         tone: aiTone,
//         language: aiLang,
//         length: aiLength,
//       });

//       const texts = (data.texts ?? {}) as Record<string, string>;

//       if (selected.length === 1 && !isCustomized) {
//         // One platform and no customization: use the normal text box
//         setText(texts[selected[0]] ?? "");
//       } else {
//         // Several platforms: switch on "Customize for each network" and fill each box
//         setIsCustomized(true);
//         setCustomTexts((prev) => {
//           const next = { ...prev };
//           for (const p of selected) {
//             if (texts[p]) next[p] = texts[p];
//           }
//           return next;
//         });
//       }
//     } catch (err) {
//       setAiError(err instanceof Error ? err.message : "AI request failed. Please try again.");
//     } finally {
//       setAiBusy(null);
//     }
//   }

//   // Improve the text in one box (shorter, longer, grammar, translate...)
//   async function refineText(action: string, target: PlatformKey | "global") {
//     setAiError("");

//     const current = target === "global" ? text : customTexts[target];

//     if (!current.trim()) return setAiError("Write some text first, then use the AI buttons");

//     setAiBusy(`${target}:${action}`);

//     try {
//       const data = await callAI({
//         mode: "refine",
//         action,
//         text: current,
//         platform: target === "global" ? undefined : target,
//       });

//       const out = String(data.text ?? "");

//       if (target === "global") {
//         setText(out);
//       } else {
//         setCustomTexts((prev) => ({ ...prev, [target]: out }));
//       }
//     } catch (err) {
//       setAiError(err instanceof Error ? err.message : "AI request failed. Please try again.");
//     } finally {
//       setAiBusy(null);
//     }
//   }

//   async function onSubmit(e: FormEvent) {
//     e.preventDefault();
//     setError("");
//     if (!isCustomized && !text.trim()) return setError("Write something to post");
//     if (isCustomized && selected.some((p) => !customTexts[p]?.trim())) {
//       return setError("Please write text for all selected platforms");
//     }
//     if (!selected.length) return setError("Choose at least one platform");

//     const date = new Date(when);
//     if (isNaN(date.getTime()) || date.getTime() < Date.now()) return setError("Pick a time in the future");

//     // Each platform uses its own files (customized mode) or the shared files (normal mode)
//     const filesFor = (p: PlatformKey): File[] => (isCustomized ? customFiles[p] : globalFiles);

//     if (selected.includes("INSTAGRAM")) {
//       const igFiles = filesFor("INSTAGRAM");
//       const igFormat = isCustomized ? formats.INSTAGRAM : "POST";
//       if (igFiles.length === 0) {
//         return setError(
//           igFormat === "REEL"
//             ? "Add an MP4 video for the Instagram Reel"
//             : "Instagram needs a photo or video for Post, Reel, or Story"
//         );
//       }
//       if (igFormat === "REEL" && !igFiles[0].type.startsWith("video/")) {
//         return setError("Instagram Reel requires an MP4 video");
//       }
//     }
//     if (selected.includes("YOUTUBE") && !filesFor("YOUTUBE").some((f) => f.type === "video/mp4")) {
//       return setError("Choose an MP4 video for YouTube");
//     }

//     setBusy(true);
//     try {
//       // Upload every unique file once (the same File is not uploaded twice)
//       const allFiles = Array.from(new Set(selected.flatMap((p) => filesFor(p))));
//       const uploaded = new Map<File, string>();

//       for (let i = 0; i < allFiles.length; i++) {
//         const f = allFiles[i];
//         setStatus(`Uploading file ${i + 1} of ${allFiles.length}`);

//         const r = await fetch("/api/upload", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ filename: f.name, contentType: f.type, size: f.size }),
//         });
//         if (!r.ok) throw new Error("Could not start the upload");

//         const { url, key } = await r.json();
//         const putRes = await fetch(url, {
//           method: "PUT",
//           headers: { "Content-Type": f.type },
//           body: f,
//         });
//         if (!putRes.ok) throw new Error("Failed to upload file to storage");

//         uploaded.set(f, key);
//       }

//       // Platform-wise media keys
//       const mediaByPlatform: Record<string, string[]> = {};
//       for (const p of selected) {
//         mediaByPlatform[p] = filesFor(p).map((f) => uploaded.get(f)!);
//       }
//       const mediaKeys = Array.from(new Set(Object.values(mediaByPlatform).flat()));

//       setStatus("Saving post");
//       const base = {
//         formats,
//         platforms: selected,
//         scheduledAt: date.toISOString(),
//         mediaKeys,
//         mediaByPlatform,
//       };
//       const postPayload = isCustomized
//         ? { customTexts, ...base }
//         : { text: text.trim(), ...base };

//       const res = await fetch("/api/posts", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(postPayload),
//       });
//       if (!res.ok) throw new Error("Could not save the post.");
//       router.push("/dashboard");
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Something went wrong");
//     } finally {
//       setBusy(false);
//       setStatus("");
//     }
//   }

//   const field =
//     "w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600";

//   return (
//     <div className="max-w-6xl">
//       <h1 className="text-2xl font-semibold tracking-tight">New post</h1>
//       <p className="mb-6 text-sm text-slate-500">Write once, schedule for later</p>

//       <div className="grid gap-6 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
//         <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
//           <fieldset>
//             <legend className="mb-2 text-sm font-medium">Post to</legend>
//             <div className="grid gap-2 sm:grid-cols-2">
//               {PLATFORMS.filter((p) => connected?.includes(p.key)).map((p) => (
//                 <label
//                   key={p.key}
//                   className={`flex items-start gap-3 rounded-lg border border-slate-200 p-3 ${p.locked ? "opacity-60" : "cursor-pointer"}`}
//                 >
//                   <input
//                     type="checkbox"
//                     disabled={!!p.locked}
//                     checked={selected.includes(p.key)}
//                     onChange={() => toggle(p.key)}
//                     className="mt-1 h-4 w-4"
//                   />
//                   <span>
//                     <span className="flex items-center gap-2 font-medium">
//                       <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
//                       {p.name}
//                     </span>
//                   </span>
//                 </label>
//               ))}
//             </div>
//           </fieldset>

//           <div className="flex items-center gap-2 pt-2">
//             <input
//               type="checkbox"
//               id="customizeToggle"
//               checked={isCustomized}
//               onChange={(e) => setIsCustomized(e.target.checked)}
//               className="h-4 w-4 rounded border-slate-300 text-indigo-600"
//             />
//             <label htmlFor="customizeToggle" className="cursor-pointer text-sm font-medium text-slate-700">
//               Customize for each network (દરેક નેટવર્ક માટે અલગ લખો અને ફોર્મેટ/મીડિયા સેટ કરો)
//             </label>
//           </div>

//           {/* Write with AI */}
//           <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-indigo-50 to-fuchsia-50 p-4">
//             <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
//               <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-800">
//                 <span aria-hidden="true">✨</span> Write with AI
//               </p>
//               <span className="text-[11px] text-slate-500">Writes a separate post for each ticked platform</span>
//             </div>

//             <textarea
//               rows={2}
//               maxLength={1000}
//               value={aiIdea}
//               onChange={(e) => setAiIdea(e.target.value)}
//               className={field}
//               placeholder="What is your post about? e.g. Navratri wishes from MVP InfoTech, or our Shopify development service"
//             />

//             <div className="mt-3 grid gap-2 sm:grid-cols-3">
//               <label className="text-xs font-medium text-slate-600">
//                 Tone
//                 <select
//                   value={aiTone}
//                   onChange={(e) => setAiTone(e.target.value)}
//                   className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
//                 >
//                   {AI_TONES.map((t) => (
//                     <option key={t} value={t}>{t}</option>
//                   ))}
//                 </select>
//               </label>

//               <label className="text-xs font-medium text-slate-600">
//                 Language
//                 <select
//                   value={aiLang}
//                   onChange={(e) => setAiLang(e.target.value)}
//                   className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
//                 >
//                   {AI_LANGUAGES.map((l) => (
//                     <option key={l.value} value={l.value}>{l.label}</option>
//                   ))}
//                 </select>
//               </label>

//               <label className="text-xs font-medium text-slate-600">
//                 Length
//                 <select
//                   value={aiLength}
//                   onChange={(e) => setAiLength(e.target.value)}
//                   className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
//                 >
//                   {AI_LENGTHS.map((l) => (
//                     <option key={l} value={l}>{l}</option>
//                   ))}
//                 </select>
//               </label>
//             </div>

//             {aiError && (
//               <p role="alert" className="mt-2 text-xs text-red-700">
//                 {aiError}{" "}
//                 {aiLimitHit && (
//                   <a href="/plans" className="font-semibold underline">
//                     View plans
//                   </a>
//                 )}
//               </p>
//             )}

//             <button
//               type="button"
//               onClick={generateWithAI}
//               disabled={aiBusy !== null || busy || aiLocked}
//               className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               {aiBusy === "generate" && <Spinner className="h-4 w-4" />}
//               {aiBusy === "generate" ? "Writing your posts..." : "✨ Generate posts"}
//             </button>

//             {aiUsage && (
//               <p className={`mt-2 text-xs font-medium ${aiLocked ? "text-red-700" : "text-violet-700"}`}>
//                 {Math.max(aiUsage.limit - aiUsage.used, 0)} of {aiUsage.limit} AI uses left this month (
//                 {aiUsage.plan.charAt(0) + aiUsage.plan.slice(1).toLowerCase()} plan)
//               </p>
//             )}

//             <p className="mt-1 text-[11px] text-slate-500">
//               AI can make mistakes. Please read and edit the text before you schedule.
//             </p>
//           </div>

//           {!isCustomized ? (
//             <>
//               <div>
//                 <label htmlFor="text" className="mb-1 block text-sm font-medium">Post text</label>
//                 <textarea
//                   id="text"
//                   rows={5}
//                   maxLength={3000}
//                   value={text}
//                   onChange={(e) => setText(e.target.value)}
//                   className={field}
//                   placeholder="What do you want to share?"
//                 />
//                 <RefineBar
//                   prefix="global"
//                   busyKey={aiBusy}
//                   disabled={aiBusy !== null || busy || aiLocked}
//                   onAction={(a) => refineText(a, "global")}
//                 />
//               </div>

//               <div>
//                 <p className="mb-1 text-sm font-medium">Photos or video</p>

//                 {selected.filter((p) => p !== "WHATSAPP").length > 0 && (
//                   <div className="mb-3 space-y-2">
//                     {selected
//                       .filter((p) => p !== "WHATSAPP")
//                       .map((p) => (
//                         <SizeGuide
//                           key={p}
//                           name={PLATFORMS.find((x) => x.key === p)?.name}
//                           rules={getRules(p, "POST")}
//                         />
//                       ))}
//                   </div>
//                 )}

//                 <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
//                   {globalFiles.map((file, idx) => (
//                     <MediaThumb
//                       key={`${file.name}-${idx}`}
//                       file={file}
//                       ratio={globalRules.ratio}
//                       onRemove={() => removeFile(idx)}
//                     />
//                   ))}
//                   {(globalRules.multiple ? globalFiles.length < globalRules.max : globalFiles.length === 0) && (
//                     <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-600 hover:border-indigo-400">
//                       <span className="font-medium text-indigo-700">+ Add file</span>
//                       <input
//                         type="file"
//                         multiple={globalRules.multiple}
//                         accept={globalRules.types.join(",")}
//                         onChange={(e) => handleFilesChange(e)}
//                         className="sr-only"
//                       />
//                     </label>
//                   )}
//                 </div>
//               </div>
//             </>
//           ) : (
//             <div className="space-y-6">
//               {selected.map((platKey) => {
//                 const pInfo = PLATFORMS.find((p) => p.key === platKey);
//                 const platFiles = customFiles[platKey];
//                 const showFormatOptions = platKey === "INSTAGRAM" || platKey === "FACEBOOK";
//                 const fmt = formats[platKey];
//                 const rules = getRules(platKey, fmt);
//                 const canAddMore = rules.multiple ? platFiles.length < rules.max : platFiles.length === 0;

//                 return (
//                   <div key={platKey} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
//                     <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
//                       <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pInfo?.color }} />
//                       {pInfo?.name} Customization
//                     </div>

//                     {showFormatOptions && (
//                       <div className="rounded-lg border border-slate-200 bg-white p-3">
//                         <label className="mb-2 block text-xs font-semibold text-slate-700">
//                           {pInfo?.name} Format:
//                         </label>
//                         <div className="flex gap-4">
//                           {(["POST", "REEL", "STORY"] as PostFormat[]).map((f) => (
//                             <label
//                               key={f}
//                               className="flex cursor-pointer items-center gap-1.5 text-xs font-medium"
//                             >
//                               <input
//                                 type="radio"
//                                 name={`format-${platKey}`}
//                                 checked={fmt === f}
//                                 onChange={() => changeFormat(platKey, f)}
//                                 className="text-indigo-600"
//                               />
//                               {f.charAt(0) + f.slice(1).toLowerCase()}
//                             </label>
//                           ))}
//                         </div>
//                       </div>
//                     )}

//                     <div>
//                       <textarea
//                         rows={3}
//                         value={customTexts[platKey]}
//                         onChange={(e) => setCustomTexts({ ...customTexts, [platKey]: e.target.value })}
//                         className={field}
//                         placeholder={`Write post specifically for ${pInfo?.name}...`}
//                       />
//                       <RefineBar
//                         prefix={platKey}
//                         busyKey={aiBusy}
//                         disabled={aiBusy !== null || busy || aiLocked}
//                         onAction={(a) => refineText(a, platKey)}
//                       />
//                     </div>

//                     <div className="space-y-2">
//                       <p className="text-xs font-medium text-slate-600">
//                         {pInfo?.name} Media
//                         {fmt === "REEL" ? " (Video)" : fmt === "STORY" ? " (Photo / Video)" : ""}
//                       </p>

//                       <SizeGuide rules={rules} />

//                       {notices[platKey] && (
//                         <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
//                           {notices[platKey]}
//                         </p>
//                       )}

//                       <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
//                         {platFiles.map((file, idx) => (
//                           <MediaThumb
//                             key={`${file.name}-${idx}`}
//                             file={file}
//                             ratio={rules.ratio}
//                             heightClass="h-20"
//                             onRemove={() => removeFile(idx, platKey)}
//                           />
//                         ))}
//                         {canAddMore && (
//                           <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs hover:border-indigo-400">
//                             <span className="font-medium text-indigo-700">
//                               {fmt === "REEL" ? "+ Add video" : "+ Add file"}
//                             </span>
//                             <input
//                               type="file"
//                               multiple={rules.multiple}
//                               accept={rules.types.join(",")}
//                               onChange={(e) => handleFilesChange(e, platKey)}
//                               className="sr-only"
//                             />
//                           </label>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           <div>
//             <label htmlFor="when" className="mb-1 block text-sm font-medium">Schedule for</label>
//             <input
//               id="when"
//               type="datetime-local"
//               value={when}
//               onChange={(e) => setWhen(e.target.value)}
//               className={field}
//             />
//           </div>

//           {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

//           <button
//             disabled={busy}
//             className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-60"
//           >
//             {busy ? status || "Please wait" : "Schedule post"}
//           </button>
//         </form>

//         <aside className="lg:sticky lg:top-6 lg:self-start">
//           <PostPreview
//             text={text}
//             customTexts={customTexts}
//             isCustomized={isCustomized}
//             platforms={selected}
//             mediaUrl={globalPreviewUrl}
//             mediaType={globalFiles[0]?.type ?? null}
//             customFiles={customFiles}
//             formats={formats}
//             handles={handles}
//             when={when}
//           />
//         </aside>
//       </div>
//     </div>
//   );
// }



"use client";

import { useEffect, useMemo, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import PostPreview from "@/components/PostPreview";

type PlatformKey = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "WHATSAPP" | "YOUTUBE";
type PostFormat = "POST" | "REEL" | "STORY";

const PLATFORMS: {
  key: PlatformKey;
  name: string;
  color: string;
  locked?: string;
}[] = [
  { key: "FACEBOOK", name: "Facebook", color: "#1877F2" },
  { key: "LINKEDIN", name: "LinkedIn", color: "#0A66C2" },
  { key: "WHATSAPP", name: "WhatsApp", color: "#1FA855", locked: "WhatsApp publishing is coming soon." },
  { key: "INSTAGRAM", name: "Instagram", color: "#C13584" },
  { key: "YOUTUBE", name: "YouTube", color: "#FF0000" },
];

const MB = 1024 * 1024;
const IMG = ["image/jpeg", "image/png", "image/webp"];
const VID = ["video/mp4"];

// ---------------------------------------------------------------
// Platform + format wise rules (what can be added, recommended size)
// ---------------------------------------------------------------
type Rules = {
  types: string[]; // allowed mime types
  multiple: boolean;
  max: number;
  label: string;
  size: string; // recommended size
  note: string;
  ratio?: { min: number; max: number; label: string }; // width / height
};

const RATIO_9_16 = { min: 0.5, max: 0.7, label: "9:16" };

function getRules(p: PlatformKey, fmt: PostFormat): Rules {
  switch (p) {
    case "INSTAGRAM":
      if (fmt === "REEL") {
        return {
          types: VID,
          multiple: false,
          max: 1,
          label: "Reel: 1 MP4 video only",
          size: "1080 × 1920 px (9:16 vertical)",
          note: "MP4 (H.264 + AAC), 3 to 90 seconds, max 100 MB.",
          ratio: RATIO_9_16,
        };
      }
      if (fmt === "STORY") {
        return {
          types: [...IMG, ...VID],
          multiple: false,
          max: 1,
          label: "Story: 1 photo or 1 video",
          size: "1080 × 1920 px (9:16 vertical)",
          note: "Photo JPG (max 10 MB) or MP4 video (max 60 seconds). Captions and carousels are not supported in Stories.",
          ratio: RATIO_9_16,
        };
      }
      return {
        types: [...IMG, ...VID],
        multiple: true,
        max: 10,
        label: "Post: 1 file or Carousel (2 to 10)",
        size: "1080 × 1080 px (1:1) or 1080 × 1350 px (4:5)",
        note: "Ratio between 4:5 and 1.91:1. Photo JPG (max 10 MB), video MP4 (max 100 MB). Keep all carousel images in the same ratio.",
        ratio: { min: 0.8, max: 1.91, label: "4:5 to 1.91:1" },
      };

    case "FACEBOOK":
      if (fmt === "REEL") {
        return {
          types: VID,
          multiple: false,
          max: 1,
          label: "Reel: 1 MP4 video only",
          size: "1080 × 1920 px (9:16 vertical)",
          note: "MP4, 3 to 90 seconds, max 100 MB.",
          ratio: RATIO_9_16,
        };
      }
      if (fmt === "STORY") {
        return {
          types: [...IMG, ...VID],
          multiple: false,
          max: 1,
          label: "Story: 1 photo or 1 video",
          size: "1080 × 1920 px (9:16 vertical)",
          note: "Photo (max 10 MB) or MP4 video (max 100 MB).",
          ratio: RATIO_9_16,
        };
      }
      return {
        types: [...IMG, ...VID],
        multiple: false,
        max: 1,
        label: "Post: 1 photo or 1 video",
        size: "1200 × 630 px (1.91:1) or 1080 × 1080 px (1:1)",
        note: "Photo max 10 MB, video max 100 MB. Facebook currently supports only 1 media.",
      };

    case "LINKEDIN":
      return {
        types: IMG,
        multiple: true,
        max: 9,
        label: "Post: photos (max 9)",
        size: "1200 × 627 px (1.91:1)",
        note: "JPG or PNG, max 10 MB each. Video is not supported yet.",
      };

    case "YOUTUBE":
      return {
        types: VID,
        multiple: false,
        max: 1,
        label: "Video: 1 MP4 only",
        size: "1920 × 1080 px (16:9)",
        note: "MP4, max 100 MB. For Shorts use 1080 × 1920 px (9:16) and under 60 seconds.",
      };

    default:
      return {
        types: [...IMG, ...VID],
        multiple: false,
        max: 1,
        label: "1 photo or video",
        size: "1080 × 1080 px (1:1)",
        note: "Photo max 10 MB, video max 100 MB.",
      };
  }
}

function toLocalInput(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// ---------------------------------------------------------------
// Small components
// ---------------------------------------------------------------
// ---------------------------------------------------------------
// AI options
// ---------------------------------------------------------------
const AI_TONES = ["Professional", "Friendly", "Festive", "Persuasive", "Funny"];
const AI_LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Gujarati", label: "ગુજરાતી" },
  { value: "Hindi", label: "हिन्दी" },
];
const AI_LENGTHS = ["Short", "Medium", "Long"];

const REFINE_ACTIONS = [
  { id: "shorter", label: "Shorter" },
  { id: "longer", label: "Longer" },
  { id: "grammar", label: "Fix grammar" },
  { id: "catchy", label: "More catchy" },
  { id: "emojis", label: "Add emojis" },
  { id: "hashtags", label: "Add hashtags" },
  { id: "translate_gu", label: "→ ગુજરાતી" },
  { id: "translate_en", label: "→ English" },
  { id: "translate_hi", label: "→ हिन्दी" },
];

function Spinner({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Small buttons under a text box: shorter, longer, fix grammar, translate...
function RefineBar({
  prefix,
  busyKey,
  disabled,
  onAction,
}: {
  prefix: string;
  busyKey: string | null;
  disabled: boolean;
  onAction: (action: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-violet-700">✨ AI:</span>
      {REFINE_ACTIONS.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={disabled}
          onClick={() => onAction(a.id)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyKey === `${prefix}:${a.id}` && <Spinner />}
          {a.label}
        </button>
      ))}
    </div>
  );
}

function SizeGuide({ name, rules }: { name?: string; rules: Rules }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2.5 text-xs text-slate-700 space-y-0.5">
      <p className="font-semibold text-indigo-800">
        {name ? `${name} · ` : ""}
        {rules.label}
      </p>
      <p>
        Recommended size: <span className="font-medium">{rules.size}</span>
      </p>
      <p>{rules.note}</p>
    </div>
  );
}

function MediaThumb({
  file,
  onRemove,
  ratio,
  heightClass = "h-24",
}: {
  file: File;
  onRemove: () => void;
  ratio?: Rules["ratio"];
  heightClass?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const isVideo = file.type.startsWith("video/");

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    setDim(null);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const r = dim ? dim.w / dim.h : null;
  const mismatch = !!(ratio && r !== null && (r < ratio.min || r > ratio.max));

  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-1.5">
      {url &&
        (isVideo ? (
          <video
            src={url}
            className={`${heightClass} w-full rounded object-cover`}
            onLoadedMetadata={(e) =>
              setDim({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })
            }
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Preview"
            className={`${heightClass} w-full rounded object-cover`}
            onLoad={(e) =>
              setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
            }
          />
        ))}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
      >
        ×
      </button>
      <p className="mt-1 truncate text-[10px] text-slate-600">
        {dim ? `${dim.w}×${dim.h} · ` : ""}
        {(file.size / MB).toFixed(1)} MB
      </p>
      {mismatch && ratio && (
        <p className="text-[10px] font-medium text-amber-700">Recommended ratio: {ratio.label}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Page
// ---------------------------------------------------------------
export default function ComposerPage() {
  const router = useRouter();
  const [connected, setConnected] = useState<PlatformKey[] | null>(null);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<PlatformKey[]>([]);

  const [isCustomized, setIsCustomized] = useState(false);
  const [text, setText] = useState("");
  const [customTexts, setCustomTexts] = useState<Record<PlatformKey, string>>({
    FACEBOOK: "",
    LINKEDIN: "",
    WHATSAPP: "",
    INSTAGRAM: "",
    YOUTUBE: "",
  });

  const [globalFiles, setGlobalFiles] = useState<File[]>([]);
  const [customFiles, setCustomFiles] = useState<Record<PlatformKey, File[]>>({
    FACEBOOK: [],
    LINKEDIN: [],
    WHATSAPP: [],
    INSTAGRAM: [],
    YOUTUBE: [],
  });

  const [formats, setFormats] = useState<Record<PlatformKey, PostFormat>>({
    FACEBOOK: "POST",
    LINKEDIN: "POST",
    WHATSAPP: "POST",
    INSTAGRAM: "POST",
    YOUTUBE: "POST",
  });

  const [notices, setNotices] = useState<Partial<Record<PlatformKey, string>>>({});
  const [when, setWhen] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // AI writer
  const [aiIdea, setAiIdea] = useState("");
  const [aiTone, setAiTone] = useState("Professional");
  const [aiLang, setAiLang] = useState("English");
  const [aiLength, setAiLength] = useState("Medium");
  const [aiBusy, setAiBusy] = useState<string | null>(null); // "generate" or "<platform|global>:<action>"
  const [aiError, setAiError] = useState("");
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number; plan: string } | null>(null);
  const [aiLimitHit, setAiLimitHit] = useState(false);
  const aiLocked = !!aiUsage && aiUsage.used >= aiUsage.limit;

  // How many AI uses are left this month
  useEffect(() => {
    fetch("/api/ai/generate")
      .then((r) => r.json())
      .then((u) => {
        if (typeof u?.limit === "number") setAiUsage(u);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fallback = new Date(Date.now() + 60 * 60 * 1000);
    const q = new URLSearchParams(window.location.search).get("date");
    const picked = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(`${q}T10:00`) : fallback;
    setWhen(toLocalInput(picked.getTime() > Date.now() ? picked : fallback));
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((rows: { platform: PlatformKey; handle: string }[]) => {
        setConnected(rows.map((r) => r.platform));
        setHandles(Object.fromEntries(rows.map((r) => [r.platform, r.handle])));
      })
      .catch(() => setConnected([]));
  }, []);

  // Rules used in the normal (non-customized) mode
  const globalRules = useMemo(() => {
    const p: PlatformKey = selected.includes("INSTAGRAM")
      ? "INSTAGRAM"
      : (selected.find((k) => k !== "WHATSAPP") ?? "INSTAGRAM");
    return getRules(p, "POST");
  }, [selected]);

  // Preview URL for the first global file (revoked when it changes)
  const globalPreviewUrl = useMemo(
    () => (globalFiles[0] ? URL.createObjectURL(globalFiles[0]) : null),
    [globalFiles]
  );
  useEffect(() => {
    return () => {
      if (globalPreviewUrl) URL.revokeObjectURL(globalPreviewUrl);
    };
  }, [globalPreviewUrl]);

  function toggle(key: PlatformKey) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  // When the format changes, keep only the files that are allowed for it
  function changeFormat(platKey: PlatformKey, fmt: PostFormat) {
    setError("");
    setFormats((prev) => ({ ...prev, [platKey]: fmt }));

    const rules = getRules(platKey, fmt);
    const current = customFiles[platKey];
    let next = current.filter((f) => rules.types.includes(f.type));
    if (!rules.multiple) next = next.slice(0, 1);

    if (next.length !== current.length) {
      setCustomFiles((prev) => ({ ...prev, [platKey]: next }));
      setNotices((prev) => ({
        ...prev,
        [platKey]:
          fmt === "REEL"
            ? "Reels support video only, so the photos were removed. Please add an MP4 video."
            : "This format supports only 1 file, so the extra files were removed.",
      }));
    } else {
      setNotices((prev) => ({ ...prev, [platKey]: undefined }));
    }
  }

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>, platKey?: PlatformKey) {
    const chosen = Array.from(e.target.files || []);
    e.target.value = "";
    if (!chosen.length) return;

    const rules = platKey ? getRules(platKey, formats[platKey]) : globalRules;

    for (const f of chosen) {
      if (!rules.types.includes(f.type)) {
        return setError(
          rules.types.every((t) => t.startsWith("video/"))
            ? "This format accepts MP4 video only"
            : rules.types.every((t) => t.startsWith("image/"))
              ? "This format accepts JPG, PNG or WebP photos only"
              : "Use a JPG, PNG, WebP or MP4 file"
        );
      }
      if (f.size > (f.type.startsWith("video/") ? 100 * MB : 10 * MB)) {
        return setError("Photos can be up to 10 MB and videos up to 100 MB");
      }
    }

    setError("");
    if (platKey) setNotices((prev) => ({ ...prev, [platKey]: undefined }));

    const apply = (current: File[]): File[] | null => {
      if (!rules.multiple) return [chosen[0]]; // single media: replace
      if (current.length + chosen.length > rules.max) {
        setError(`You can add a maximum of ${rules.max} files`);
        return null;
      }
      return [...current, ...chosen];
    };

    if (platKey) {
      const next = apply(customFiles[platKey]);
      if (next) setCustomFiles((prev) => ({ ...prev, [platKey]: next }));
    } else {
      const next = apply(globalFiles);
      if (next) setGlobalFiles(next);
    }
  }

  function removeFile(index: number, platKey?: PlatformKey) {
    if (platKey) {
      setCustomFiles((prev) => ({
        ...prev,
        [platKey]: prev[platKey].filter((_, i) => i !== index),
      }));
    } else {
      setGlobalFiles((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function callAI(payload: Record<string, unknown>) {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (data?.usage) setAiUsage(data.usage);

    if (!res.ok) {
      if (data?.code === "LIMIT") setAiLimitHit(true);
      throw new Error(data?.error ?? "AI request failed. Please try again.");
    }

    setAiLimitHit(false);
    return data;
  }

  // Write a separate post for every ticked platform
  async function generateWithAI() {
    setAiError("");

    if (aiIdea.trim().length < 3) return setAiError("Write your post idea first");
    if (!selected.length) return setAiError("Tick at least one platform first");

    setAiBusy("generate");

    try {
      const data = await callAI({
        mode: "generate",
        idea: aiIdea.trim(),
        platforms: selected,
        tone: aiTone,
        language: aiLang,
        length: aiLength,
      });

      const texts = (data.texts ?? {}) as Record<string, string>;

      if (selected.length === 1 && !isCustomized) {
        // One platform and no customization: use the normal text box
        setText(texts[selected[0]] ?? "");
      } else {
        // Several platforms: switch on "Customize for each network" and fill each box
        setIsCustomized(true);
        setCustomTexts((prev) => {
          const next = { ...prev };
          for (const p of selected) {
            if (texts[p]) next[p] = texts[p];
          }
          return next;
        });
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI request failed. Please try again.");
    } finally {
      setAiBusy(null);
    }
  }

  // Improve the text in one box (shorter, longer, grammar, translate...)
  async function refineText(action: string, target: PlatformKey | "global") {
    setAiError("");

    const current = target === "global" ? text : customTexts[target];

    if (!current.trim()) return setAiError("Write some text first, then use the AI buttons");

    setAiBusy(`${target}:${action}`);

    try {
      const data = await callAI({
        mode: "refine",
        action,
        text: current,
        platform: target === "global" ? undefined : target,
      });

      const out = String(data.text ?? "");

      if (target === "global") {
        setText(out);
      } else {
        setCustomTexts((prev) => ({ ...prev, [target]: out }));
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI request failed. Please try again.");
    } finally {
      setAiBusy(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!isCustomized && !text.trim()) return setError("Write something to post");
    if (isCustomized && selected.some((p) => !customTexts[p]?.trim())) {
      return setError("Please write text for all selected platforms");
    }
    if (!selected.length) return setError("Choose at least one platform");

    const date = new Date(when);
    if (isNaN(date.getTime()) || date.getTime() < Date.now()) return setError("Pick a time in the future");

    // Each platform uses its own files (customized mode) or the shared files (normal mode)
    const filesFor = (p: PlatformKey): File[] => (isCustomized ? customFiles[p] : globalFiles);

    if (selected.includes("INSTAGRAM")) {
      const igFiles = filesFor("INSTAGRAM");
      const igFormat = isCustomized ? formats.INSTAGRAM : "POST";
      if (igFiles.length === 0) {
        return setError(
          igFormat === "REEL"
            ? "Add an MP4 video for the Instagram Reel"
            : "Instagram needs a photo or video for Post, Reel, or Story"
        );
      }
      if (igFormat === "REEL" && !igFiles[0].type.startsWith("video/")) {
        return setError("Instagram Reel requires an MP4 video");
      }
    }
    if (selected.includes("YOUTUBE") && !filesFor("YOUTUBE").some((f) => f.type === "video/mp4")) {
      return setError("Choose an MP4 video for YouTube");
    }

    setBusy(true);
    try {
      // Upload every unique file once (the same File is not uploaded twice)
      const allFiles = Array.from(new Set(selected.flatMap((p) => filesFor(p))));
      const uploaded = new Map<File, string>();

      for (let i = 0; i < allFiles.length; i++) {
        const f = allFiles[i];
        setStatus(`Uploading file ${i + 1} of ${allFiles.length}`);

        const r = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: f.name, contentType: f.type, size: f.size }),
        });
        if (!r.ok) throw new Error("Could not start the upload");

        const { url, key } = await r.json();
        const putRes = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": f.type },
          body: f,
        });
        if (!putRes.ok) throw new Error("Failed to upload file to storage");

        uploaded.set(f, key);
      }

      // Platform-wise media keys
      const mediaByPlatform: Record<string, string[]> = {};
      for (const p of selected) {
        mediaByPlatform[p] = filesFor(p).map((f) => uploaded.get(f)!);
      }
      const mediaKeys = Array.from(new Set(Object.values(mediaByPlatform).flat()));

      setStatus("Saving post");
      const base = {
        formats,
        platforms: selected,
        scheduledAt: date.toISOString(),
        mediaKeys,
        mediaByPlatform,
      };
      const postPayload = isCustomized
        ? { customTexts, ...base }
        : { text: text.trim(), ...base };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => ({}));
        throw new Error(typeof info?.error === "string" ? info.error : "Could not save the post.");
      }
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
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">New post</h1>
      <p className="mb-6 text-sm text-slate-500">Write once, schedule for later</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Post to</legend>
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
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="customizeToggle"
              checked={isCustomized}
              onChange={(e) => setIsCustomized(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <label htmlFor="customizeToggle" className="cursor-pointer text-sm font-medium text-slate-700">
              Customize for each network (દરેક નેટવર્ક માટે અલગ લખો અને ફોર્મેટ/મીડિયા સેટ કરો)
            </label>
          </div>

          {/* Write with AI */}
          <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-indigo-50 to-fuchsia-50 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-800">
                <span aria-hidden="true">✨</span> Write with AI
              </p>
              <span className="text-[11px] text-slate-500">Writes a separate post for each ticked platform</span>
            </div>

            <textarea
              rows={2}
              maxLength={1000}
              value={aiIdea}
              onChange={(e) => setAiIdea(e.target.value)}
              className={field}
              placeholder="What is your post about? e.g. Navratri wishes from MVP InfoTech, or our Shopify development service"
            />

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <label className="text-xs font-medium text-slate-600">
                Tone
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                >
                  {AI_TONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-600">
                Language
                <select
                  value={aiLang}
                  onChange={(e) => setAiLang(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                >
                  {AI_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-600">
                Length
                <select
                  value={aiLength}
                  onChange={(e) => setAiLength(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                >
                  {AI_LENGTHS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </label>
            </div>

            {aiError && (
              <p role="alert" className="mt-2 text-xs text-red-700">
                {aiError}{" "}
                {aiLimitHit && (
                  <a href="/plans" className="font-semibold underline">
                    View plans
                  </a>
                )}
              </p>
            )}

            <button
              type="button"
              onClick={generateWithAI}
              disabled={aiBusy !== null || busy || aiLocked}
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiBusy === "generate" && <Spinner className="h-4 w-4" />}
              {aiBusy === "generate" ? "Writing your posts..." : "✨ Generate posts"}
            </button>

            {aiUsage && (
              <p className={`mt-2 text-xs font-medium ${aiLocked ? "text-red-700" : "text-violet-700"}`}>
                {Math.max(aiUsage.limit - aiUsage.used, 0)} of {aiUsage.limit} AI uses left this month (
                {aiUsage.plan.charAt(0) + aiUsage.plan.slice(1).toLowerCase()} plan)
              </p>
            )}

            <p className="mt-1 text-[11px] text-slate-500">
              AI can make mistakes. Please read and edit the text before you schedule.
            </p>
          </div>

          {!isCustomized ? (
            <>
              <div>
                <label htmlFor="text" className="mb-1 block text-sm font-medium">Post text</label>
                <textarea
                  id="text"
                  rows={5}
                  maxLength={3000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={field}
                  placeholder="What do you want to share?"
                />
                <RefineBar
                  prefix="global"
                  busyKey={aiBusy}
                  disabled={aiBusy !== null || busy || aiLocked}
                  onAction={(a) => refineText(a, "global")}
                />
              </div>

              <div>
                <p className="mb-1 text-sm font-medium">Photos or video</p>

                {selected.filter((p) => p !== "WHATSAPP").length > 0 && (
                  <div className="mb-3 space-y-2">
                    {selected
                      .filter((p) => p !== "WHATSAPP")
                      .map((p) => (
                        <SizeGuide
                          key={p}
                          name={PLATFORMS.find((x) => x.key === p)?.name}
                          rules={getRules(p, "POST")}
                        />
                      ))}
                  </div>
                )}

                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {globalFiles.map((file, idx) => (
                    <MediaThumb
                      key={`${file.name}-${idx}`}
                      file={file}
                      ratio={globalRules.ratio}
                      onRemove={() => removeFile(idx)}
                    />
                  ))}
                  {(globalRules.multiple ? globalFiles.length < globalRules.max : globalFiles.length === 0) && (
                    <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-600 hover:border-indigo-400">
                      <span className="font-medium text-indigo-700">+ Add file</span>
                      <input
                        type="file"
                        multiple={globalRules.multiple}
                        accept={globalRules.types.join(",")}
                        onChange={(e) => handleFilesChange(e)}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {selected.map((platKey) => {
                const pInfo = PLATFORMS.find((p) => p.key === platKey);
                const platFiles = customFiles[platKey];
                const showFormatOptions = platKey === "INSTAGRAM" || platKey === "FACEBOOK";
                const fmt = formats[platKey];
                const rules = getRules(platKey, fmt);
                const canAddMore = rules.multiple ? platFiles.length < rules.max : platFiles.length === 0;

                return (
                  <div key={platKey} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pInfo?.color }} />
                      {pInfo?.name} Customization
                    </div>

                    {showFormatOptions && (
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="mb-2 block text-xs font-semibold text-slate-700">
                          {pInfo?.name} Format:
                        </label>
                        <div className="flex gap-4">
                          {(["POST", "REEL", "STORY"] as PostFormat[]).map((f) => (
                            <label
                              key={f}
                              className="flex cursor-pointer items-center gap-1.5 text-xs font-medium"
                            >
                              <input
                                type="radio"
                                name={`format-${platKey}`}
                                checked={fmt === f}
                                onChange={() => changeFormat(platKey, f)}
                                className="text-indigo-600"
                              />
                              {f.charAt(0) + f.slice(1).toLowerCase()}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <textarea
                        rows={3}
                        value={customTexts[platKey]}
                        onChange={(e) => setCustomTexts({ ...customTexts, [platKey]: e.target.value })}
                        className={field}
                        placeholder={`Write post specifically for ${pInfo?.name}...`}
                      />
                      <RefineBar
                        prefix={platKey}
                        busyKey={aiBusy}
                        disabled={aiBusy !== null || busy || aiLocked}
                        onAction={(a) => refineText(a, platKey)}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600">
                        {pInfo?.name} Media
                        {fmt === "REEL" ? " (Video)" : fmt === "STORY" ? " (Photo / Video)" : ""}
                      </p>

                      <SizeGuide rules={rules} />

                      {notices[platKey] && (
                        <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                          {notices[platKey]}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {platFiles.map((file, idx) => (
                          <MediaThumb
                            key={`${file.name}-${idx}`}
                            file={file}
                            ratio={rules.ratio}
                            heightClass="h-20"
                            onRemove={() => removeFile(idx, platKey)}
                          />
                        ))}
                        {canAddMore && (
                          <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs hover:border-indigo-400">
                            <span className="font-medium text-indigo-700">
                              {fmt === "REEL" ? "+ Add video" : "+ Add file"}
                            </span>
                            <input
                              type="file"
                              multiple={rules.multiple}
                              accept={rules.types.join(",")}
                              onChange={(e) => handleFilesChange(e, platKey)}
                              className="sr-only"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label htmlFor="when" className="mb-1 block text-sm font-medium">Schedule for</label>
            <input
              id="when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className={field}
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

          <button
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {busy ? status || "Please wait" : "Schedule post"}
          </button>
        </form>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PostPreview
            text={text}
            customTexts={customTexts}
            isCustomized={isCustomized}
            platforms={selected}
            mediaUrl={globalPreviewUrl}
            mediaType={globalFiles[0]?.type ?? null}
            customFiles={customFiles}
            formats={formats}
            handles={handles}
            when={when}
          />
        </aside>
      </div>
    </div>
  );
}