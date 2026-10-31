// "use client";

// import { useEffect, useState, FormEvent, ChangeEvent } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import PostPreview from "@/components/PostPreview";

// type PlatformKey = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "WHATSAPP" | "YOUTUBE";

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
// const TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"];

// function toLocalInput(d: Date) {
//   return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
// }

// // Instagram needs a JPG shaped 4:5 to 1.91:1. LinkedIn takes JPG or PNG. Other photo types become JPG.
// async function prepareImage(f: File, forInstagram: boolean): Promise<File> {
//   const bmp = await createImageBitmap(f);
//   if (forInstagram) {
//     const ratio = bmp.width / bmp.height;
//     if (ratio < 0.8 || ratio > 1.91) {
//       throw new Error("Instagram needs a photo between 4:5 (portrait) and 1.91:1 (landscape) shape");
//     }
//   }
//   const ok = f.type === "image/jpeg" || (!forInstagram && f.type === "image/png");
//   if (ok) return f;
//   const canvas = document.createElement("canvas");
//   canvas.width = bmp.width;
//   canvas.height = bmp.height;
//   const ctx = canvas.getContext("2d")!;
//   ctx.fillStyle = "#ffffff"; // transparency becomes white
//   ctx.fillRect(0, 0, canvas.width, canvas.height);
//   ctx.drawImage(bmp, 0, 0);
//   const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
//   if (!blob) throw new Error("Could not convert the photo to JPG");
//   return new File([blob], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
// }

// export default function ComposerPage() {
//   const router = useRouter();
//   const [connected, setConnected] = useState<PlatformKey[] | null>(null);
//   const [handles, setHandles] = useState<Record<string, string>>({});
//   const [selected, setSelected] = useState<PlatformKey[]>([]);
//   const [text, setText] = useState("");
//   const [when, setWhen] = useState("");
//   const [file, setFile] = useState<File | null>(null);
//   const [preview, setPreview] = useState<string | null>(null);
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

//   useEffect(() => {
//     if (!file) return setPreview(null);
//     const url = URL.createObjectURL(file);
//     setPreview(url);
//     return () => URL.revokeObjectURL(url);
//   }, [file]);

//   function toggle(key: PlatformKey) {
//     setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
//   }

//   function onFile(e: ChangeEvent<HTMLInputElement>) {
//     const f = e.target.files?.[0];
//     e.target.value = "";
//     if (!f) return;
//     if (!TYPES.includes(f.type)) return setError("Use a JPG, PNG, WebP or MP4 file");
//     if (f.size > (f.type.startsWith("video/") ? 100 * MB : 10 * MB)) {
//       return setError("Photos can be up to 10 MB and videos up to 100 MB");
//     }
//     setError("");
//     setFile(f);
//   }

//   async function onSubmit(e: FormEvent) {
//     e.preventDefault();
//     setError("");
//     if (!text.trim()) return setError("Write something to post");
//     if (!selected.length) return setError("Choose at least one platform");
//     if (selected.includes("INSTAGRAM") && !file) return setError("Instagram needs a photo or video");
//     if (selected.includes("YOUTUBE") && (!file || file.type !== "video/mp4")) {
//       return setError("YouTube માટે MP4 video પસંદ કરો");
//     }
//     if (selected.includes("LINKEDIN") && file?.type.startsWith("video/")) {
//       return setError("LinkedIn video is not supported yet. Remove the video or untick LinkedIn.");
//     }
//     const date = new Date(when);
//     if (isNaN(date.getTime()) || date.getTime() < Date.now()) return setError("Pick a time in the future");

//     setBusy(true);
//     try {
//       let mediaKeys: string[] = [];
//       if (file) {
//         setStatus("Preparing file");
//         const needsPrep = file.type.startsWith("image/") && (selected.includes("INSTAGRAM") || selected.includes("LINKEDIN"));
//         const upload = needsPrep ? await prepareImage(file, selected.includes("INSTAGRAM")) : file;
//         setStatus("Uploading file");
//         const r = await fetch("/api/upload", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ filename: upload.name, contentType: upload.type, size: upload.size }),
//         });
//         if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not start the upload");
//         const { url, key } = await r.json();
//         const put = await fetch(url, { method: "PUT", headers: { "Content-Type": upload.type }, body: upload });
//         if (!put.ok) throw new Error("Upload failed. Check the storage and CORS settings.");
//         mediaKeys = [key];
//       }
//       setStatus("Saving post");
//       const res = await fetch("/api/posts", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text: text.trim(), platforms: selected, scheduledAt: date.toISOString(), mediaKeys }),
//       });
//       if (!res.ok) throw new Error("Could not save the post. Please try again.");
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
//           <div>
//             <label htmlFor="text" className="mb-1 block text-sm font-medium">Post text</label>
//             <textarea
//               id="text"
//               rows={6}
//               maxLength={3000}
//               value={text}
//               onChange={(e) => setText(e.target.value)}
//               className={field}
//               placeholder="What do you want to share?"
//             />
//             <p className="mt-1 text-right text-xs text-slate-500">{text.length} / 3000</p>
//           </div>

//           <div>
//             <p className="mb-1 text-sm font-medium">Photo or video (optional)</p>
//             {file && preview ? (
//               <div className="rounded-lg border border-slate-200 p-3">
//                 {file.type.startsWith("video/") ? (
//                   <video src={preview} controls className="max-h-64 w-full rounded-md bg-black" />
//                 ) : (
//                   // eslint-disable-next-line @next/next/no-img-element
//                   <img src={preview} alt="Selected file preview" className="max-h-64 rounded-md" />
//                 )}
//                 <div className="mt-2 flex items-center justify-between text-sm">
//                   <span className="truncate text-slate-600">{file.name} ({(file.size / MB).toFixed(1)} MB)</span>
//                   <button type="button" onClick={() => setFile(null)} className="font-medium text-red-600 hover:underline">
//                     Remove
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/40">
//                 <span className="font-medium text-indigo-700">Choose a file</span>
//                 <span>JPG, PNG, WebP up to 10 MB, or MP4 up to 100 MB</span>
//                 <input type="file" accept={TYPES.join(",")} onChange={onFile} className="sr-only" />
//               </label>
//             )}
//           </div>

//           <fieldset>
//             <legend className="mb-2 text-sm font-medium">Post to</legend>
//             {connected === null && <p className="text-sm text-slate-600">Loading accounts</p>}
//             {connected && connected.length === 0 && (
//               <p className="text-sm text-slate-600">
//                 No accounts connected yet.{" "}
//                 <Link href="/dashboard" className="font-medium underline">Connect one on the dashboard</Link>
//               </p>
//             )}
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
//                     {p.locked && <span className="block text-xs text-slate-600">{p.locked}</span>}
//                   </span>
//                 </label>
//               ))}
//             </div>
//           </fieldset>

//           <div>
//             <label htmlFor="when" className="mb-1 block text-sm font-medium">Schedule for</label>
//             <input
//               id="when"
//               type="datetime-local"
//               value={when}
//               min={when ? toLocalInput(new Date()) : undefined}
//               onChange={(e) => setWhen(e.target.value)}
//               className={field}
//             />
//           </div>

//           {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

//           <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
//             {busy ? status || "Please wait" : "Schedule post"}
//           </button>
//         </form>

//         <aside className="lg:sticky lg:top-6 lg:self-start">
//           <PostPreview
//             text={text}
//             platforms={selected}
//             mediaUrl={preview}
//             mediaType={file?.type ?? null}
//             handles={handles}
//             when={when}
//           />
//         </aside>
//       </div>
//     </div>
//   );
// }








"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
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
const TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"];

function toLocalInput(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

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

  const [when, setWhen] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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

  function toggle(key: PlatformKey) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>, platKey?: PlatformKey, isFacebook = false) {
    const chosenFiles = Array.from(e.target.files || []);
    e.target.value = "";
    if (!chosenFiles.length) return;

    for (const f of chosenFiles) {
      if (!TYPES.includes(f.type)) return setError("Use a JPG, PNG, WebP or MP4 file");
    }

    // Facebook માટે માત્ર 1 જ ઇમેજ Allow કરવી (Rule 4)
    if (isFacebook || (!isCustomized && selected.includes("FACEBOOK") && !selected.includes("INSTAGRAM"))) {
      if (chosenFiles[0].type.startsWith("image/")) {
        if (isCustomized && platKey) {
          setCustomFiles((prev) => ({ ...prev, [platKey]: [chosenFiles[0]] }));
        } else {
          setGlobalFiles([chosenFiles[0]]);
        }
        return;
      }
    }

    setError("");
    if (isCustomized && platKey) {
      setCustomFiles((prev) => ({ ...prev, [platKey]: [...prev[platKey], ...chosenFiles] }));
    } else {
      setGlobalFiles((prev) => [...prev, ...chosenFiles]);
    }
  }

  function removeFile(index: number, platKey?: PlatformKey) {
    if (isCustomized && platKey) {
      setCustomFiles((prev) => ({
        ...prev,
        [platKey]: prev[platKey].filter((_, i) => i !== index),
      }));
    } else {
      setGlobalFiles((prev) => prev.filter((_, i) => i !== index));
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

    setBusy(true);
    try {
      let mediaKeys: string[] = [];

      // ફાઇલ નક્કી કરવી: જો કસ્ટમાઇઝ્ડ હોય તો ઇન્સ્ટાગ્રામ કે સિલેક્ટ કરેલા પ્લેટફોર્મની પહેલી ફાઇલ લો, નહીંતર ગ્લોબલ
      let fileToUpload: File | null = null;
      if (isCustomized) {
        // જે પ્લેટફોર્મ પહેલું સિલેક્ટ કર્યું હોય તેની ફાઇલ લો
        const firstActivePlatform = selected[0];
        if (customFiles[firstActivePlatform] && customFiles[firstActivePlatform].length > 0) {
          fileToUpload = customFiles[firstActivePlatform][0];
        }
      } else {
        fileToUpload = globalFiles[0] || null;
      }

      if (fileToUpload) {
        setStatus("Uploading file");
        const r = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: fileToUpload.name, contentType: fileToUpload.type, size: fileToUpload.size }),
        });
        if (!r.ok) throw new Error("Could not start the upload");
        const { url, key } = await r.json();
        const putRes = await fetch(url, { method: "PUT", headers: { "Content-Type": fileToUpload.type }, body: fileToUpload });
        if (!putRes.ok) throw new Error("Failed to upload file to storage");
        mediaKeys = [key];
      }

      // જો Instagram કે Facebook પર Story સિલેક્ટ કરી હોય, તો mediaKeys જવું જ જોઈએ
      if (selected.includes("INSTAGRAM") && mediaKeys.length === 0) {
        return setError("Instagram needs a photo or video for Post, Reel, or Story");
      }

      setStatus("Saving post");
      const postPayload = isCustomized
        ? { customTexts, formats, platforms: selected, scheduledAt: date.toISOString(), mediaKeys }
        : { text: text.trim(), formats, platforms: selected, scheduledAt: date.toISOString(), mediaKeys };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload),
      });
      if (!res.ok) throw new Error("Could not save the post.");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600";

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
                <label key={p.key} className={`flex items-start gap-3 rounded-lg border border-slate-200 p-3 ${p.locked ? "opacity-60" : "cursor-pointer"}`}>
                  <input type="checkbox" disabled={!!p.locked} checked={selected.includes(p.key)} onChange={() => toggle(p.key)} className="mt-1 h-4 w-4" />
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
            <input type="checkbox" id="customizeToggle" checked={isCustomized} onChange={(e) => setIsCustomized(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            <label htmlFor="customizeToggle" className="text-sm font-medium text-slate-700 cursor-pointer">
              Customize for each network (દરેક નેટવર્ક માટે અલગ લખો અને ફોર્મેટ/મીડિયા સેટ કરો)
            </label>
          </div>

          {!isCustomized ? (
            <>
              <div>
                <label htmlFor="text" className="mb-1 block text-sm font-medium">Post text</label>
                <textarea id="text" rows={5} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} className={field} placeholder="What do you want to share?" />
              </div>

              <div>
                <p className="mb-1 text-sm font-medium">Photos or video (Facebook: single image, Instagram: carousel supported)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  {globalFiles.map((file, idx) => (
                    <div key={idx} className="relative rounded-lg border border-slate-200 p-2 bg-slate-50">
                      {file.type.startsWith("video/") ? (
                        <video src={URL.createObjectURL(file)} className="h-24 w-full object-cover rounded" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={URL.createObjectURL(file)} alt="Preview" className="h-24 w-full object-cover rounded" />
                      )}
                      <button type="button" onClick={() => removeFile(idx)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-5 w-5 text-xs flex items-center justify-center">×</button>
                    </div>
                  ))}
                  {globalFiles.length === 0 && (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 h-28 text-center text-xs text-slate-600 bg-slate-50 hover:border-indigo-400">
                      <span className="font-medium text-indigo-700">+ Add file</span>
                      <input type="file" accept={TYPES.join(",")} onChange={(e) => handleFilesChange(e)} className="sr-only" />
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
                const hasVideo = platFiles.some((f) => f.type.startsWith("video/"));

                return (
                  <div key={platKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pInfo?.color }} />
                      {pInfo?.name} Customization
                    </div>

                    {showFormatOptions && (
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-2">{pInfo?.name} Format:</label>
                        <div className="flex gap-4">
                          {(["POST", "REEL", "STORY"] as PostFormat[]).map((fmt) => {
                            // Rule 1: જો ફોટો એડ કરેલો હોય તો Reel disable કરવી
                            const isReelDisabled = fmt === "REEL" && platFiles.length > 0 && !hasVideo;
                            return (
                              <label key={fmt} className={`flex items-center gap-1.5 text-xs font-medium ${isReelDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                                <input
                                  type="radio"
                                  name={`format-${platKey}`}
                                  disabled={isReelDisabled}
                                  checked={formats[platKey] === fmt}
                                  onChange={() => setFormats({ ...formats, [platKey]: fmt })}
                                  className="text-indigo-600"
                                />
                                {fmt.charAt(0) + fmt.slice(1).toLowerCase()}
                              </label>
                            );
                          })}
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
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">
                        {pInfo?.name} Media {platKey === "FACEBOOK" ? "(Single image only)" : "(Multi-image / Carousel)"}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {platFiles.map((file, idx) => (
                          <div key={idx} className="relative rounded-lg border border-slate-200 p-1.5 bg-white">
                            {file.type.startsWith("video/") ? (
                              <video src={URL.createObjectURL(file)} className="h-20 w-full object-cover rounded" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={URL.createObjectURL(file)} alt="Preview" className="h-20 w-full object-cover rounded" />
                            )}
                            <button type="button" onClick={() => removeFile(idx, platKey)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-4 w-4 text-[10px] flex items-center justify-center">×</button>
                          </div>
                        ))}
                        {(platKey !== "FACEBOOK" || platFiles.length === 0) && (
                          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 h-24 text-center text-xs bg-white hover:border-indigo-400">
                            <span className="text-indigo-700 font-medium">+ Add file</span>
                            <input type="file" multiple={platKey !== "FACEBOOK"} accept={TYPES.join(",")} onChange={(e) => handleFilesChange(e, platKey, platKey === "FACEBOOK")} className="sr-only" />
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
            <input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white">
            {busy ? status || "Please wait" : "Schedule post"}
          </button>
        </form>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PostPreview
            text={text}
            customTexts={customTexts}
            isCustomized={isCustomized}
            platforms={selected}
            mediaUrl={globalFiles[0] ? URL.createObjectURL(globalFiles[0]) : null}
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