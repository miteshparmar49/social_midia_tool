// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";

// type PlatformId = "instagram" | "whatsapp" | "facebook" | "linkedin" | "youtube";
// type Status = "scheduled" | "publishing" | "published" | "failed";

// interface Post {
//   id: string;
//   text: string;
//   platforms: PlatformId[];
//   when: string;
//   status: Status;
//   error: string | null;
// }

// // const PLATFORMS: { id: PlatformId; name: string; color: string; note: string }[] = [
// //   { id: "facebook", name: "Facebook", color: "#1877F2", note: "Pages you manage" },
// //   { id: "instagram", name: "Instagram", color: "#C13584", note: "Business or Creator account" },
// //   { id: "linkedin", name: "LinkedIn", color: "#0A66C2", note: "Profile or Company page" },
// //   { id: "whatsapp", name: "WhatsApp", color: "#1FA855", note: "Business number (Cloud API)" },
// // ];

// const PLATFORMS: { id: PlatformId; name: string; color: string; note: string }[] = [
//   { id: "facebook", name: "Facebook", color: "#1877F2", note: "Pages you manage" },
//   { id: "instagram", name: "Instagram", color: "#C13584", note: "Business or Creator account" },
//   { id: "linkedin", name: "LinkedIn", color: "#0A66C2", note: "Profile or Company page" },
//   { id: "whatsapp", name: "WhatsApp", color: "#1FA855", note: "Business number (Cloud API)" },
//   { id: "youtube", name: "YouTube", color: "#FF0000", note: "YouTube channel" },
// ];

// const STATUS_STYLE: Record<Status, string> = {
//   scheduled: "bg-amber-50 text-amber-700 ring-amber-200",
//   publishing: "bg-sky-50 text-sky-700 ring-sky-200",
//   published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
//   failed: "bg-red-50 text-red-700 ring-red-200",
// };

// const STATS: { key: Status; label: string; dot: string }[] = [
//   { key: "scheduled", label: "Scheduled", dot: "bg-amber-500" },
//   { key: "published", label: "Published", dot: "bg-emerald-500" },
//   { key: "failed", label: "Failed", dot: "bg-red-500" },
// ];

// const card = "rounded-xl border border-slate-200 bg-white";

// export default function DashboardPage() {
//   const [connected, setConnected] = useState<Record<PlatformId, string | null>>({
//     instagram: null,
//     facebook: null,
//     linkedin: null,
//     whatsapp: null,
//     youtube: null,
//   });
//   const [posts, setPosts] = useState<Post[]>([]);
//   const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

//   useEffect(() => {
//     const q = new URLSearchParams(window.location.search);
//     const err = q.get("error");
//     const ok = q.get("connected");
//     if (ok) setNotice({ ok: true, text: `${ok} connected` });
//     else if (err === "nopages")
//       setNotice({
//         ok: false,
//         text: `Facebook did not return any Page. Granted: ${q.get("granted") || "none"}. Pages from account: ${q.get("acct") ?? "?"}, ticked Pages: ${q.get("targets") ?? "?"}, businesses: ${q.get("biz") ?? "?"}. ${q.get("why") ? "Facebook says: " + q.get("why") : ""}`,
//       });
//     else if (err) setNotice({ ok: false, text: `Connect failed (${err}). ${q.get("why") ?? "Please try again."}` });
//   }, []);

//   useEffect(() => {
//     fetch("/api/accounts")
//       .then((r) => r.json())
//       .then((rows: { platform: string; handle: string }[]) =>
//         setConnected((c) => {
//           const next = { ...c };
//           rows.forEach((r) => (next[r.platform.toLowerCase() as PlatformId] = r.handle));
//           return next;
//         })
//       )
//       .catch(() => {});
//     fetch("/api/posts")
//       .then((r) => r.json())
//       .then((rows: any[]) =>
//         setPosts(
//           rows.map((p) => ({
//             id: p.id,
//             text: p.text,
//             platforms: p.platforms.map((x: string) => x.toLowerCase()),
//             when: new Date(p.scheduledAt).toLocaleString(),
//             status: p.status.toLowerCase(),
//             error: p.error ?? null,
//           }))
//         )
//       )
//       .catch(() => {});
//   }, []);

//   const anyConnected = Object.values(connected).some(Boolean);
//   const count = (s: Status) => posts.filter((p) => p.status === s).length;

//   async function toggle(id: PlatformId) {
//     if (connected[id]) {
//       await fetch(`/api/connect/${id}`, { method: "DELETE" });
//       setConnected((c) => ({ ...c, [id]: null }));
//     } else if (id === "whatsapp") {
//       const phoneNumberId = prompt("WhatsApp phone number ID");
//       const token = prompt("WhatsApp access token");
//       if (!phoneNumberId || !token) return;
//       await fetch("/api/connect/whatsapp", { method: "POST", body: JSON.stringify({ phoneNumberId, token }) });
//       setConnected((c) => ({ ...c, whatsapp: phoneNumberId }));
//     } else {
//       window.location.href = `/api/connect/${id}`;
//     }
//   }

//   return (
//     <div className="space-y-8">
//       {notice && (
//         <p role="status" className={`rounded-xl border p-3 text-sm ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
//           {notice.text}
//         </p>
//       )}
//       <div className="flex flex-wrap items-center justify-between gap-3">
//         <div>
//           <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
//           <p className="text-sm text-slate-500">Your posts and connected accounts</p>
//         </div>
//         {anyConnected ? (
//           <Link href="/composer" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
//             + New post
//           </Link>
//         ) : (
//           <p className="text-sm text-slate-500">Connect an account to create your first post</p>
//         )}
//       </div>

//       <section aria-label="Post counts" className="grid gap-4 sm:grid-cols-3">
//         {STATS.map((s) => (
//           <div key={s.key} className={`${card} p-5`}>
//             <div className="flex items-center gap-2 text-sm text-slate-500">
//               <span className={`h-2 w-2 rounded-full ${s.dot}`} />
//               {s.label}
//             </div>
//             <p className="mt-2 text-3xl font-semibold tracking-tight">{count(s.key)}</p>
//           </div>
//         ))}
//       </section>

//       <section aria-labelledby="accounts">
//         <h2 id="accounts" className="mb-3 text-base font-semibold">Connected accounts</h2>
//         <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
//           {PLATFORMS.map((p) => {
//             const handle = connected[p.id];
//             return (
//               <div key={p.id} className={`${card} flex flex-col gap-4 p-4`}>
//                 <div className="flex items-center gap-3">
//                   <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: p.color }} aria-hidden>
//                     {p.name[0]}
//                   </span>
//                   <div className="min-w-0">
//                     <p className="font-medium">{p.name}</p>
//                     <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
//                       <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${handle ? "bg-emerald-500" : "bg-slate-300"}`} />
//                       <span className="truncate">{handle ?? p.note}</span>
//                     </p>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => toggle(p.id)}
//                   className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
//                     handle ? "border border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-slate-900 text-white hover:bg-slate-700"
//                   }`}
//                 >
//                   {handle ? "Disconnect" : "Connect"}
//                 </button>
//               </div>
//             );
//           })}
//         </div>
//       </section>

//       <section aria-labelledby="recent">
//         <h2 id="recent" className="mb-3 text-base font-semibold">Recent posts</h2>
//         <div className={`${card} overflow-x-auto`}>
//           <table className="w-full min-w-[640px] text-left text-sm">
//             <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
//               <tr>
//                 <th className="px-4 py-3 font-medium">Post</th>
//                 <th className="px-4 py-3 font-medium">Platforms</th>
//                 <th className="px-4 py-3 font-medium">Scheduled for</th>
//                 <th className="px-4 py-3 font-medium">Status</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {posts.length === 0 && (
//                 <tr>
//                   <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No posts yet</td>
//                 </tr>
//               )}
//               {posts.map((post) => (
//                 <tr key={post.id}>
//                   <td className="max-w-xs px-4 py-3">
//                     <p className="truncate font-medium">{post.text}</p>
//                     {post.error && <p className="truncate text-xs text-red-600" title={post.error}>{post.error}</p>}
//                   </td>
//                   <td className="px-4 py-3">
//                     <div className="flex gap-1.5">
//                       {post.platforms.map((id) => {
//                         const p = PLATFORMS.find((x) => x.id === id)!;
//                         return (
//                           <span key={id} title={p.name} className="grid h-6 w-6 place-items-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: p.color }}>
//                             {p.name[0]}
//                           </span>
//                         );
//                       })}
//                     </div>
//                   </td>
//                   <td className="whitespace-nowrap px-4 py-3 text-slate-600">{post.when}</td>
//                   <td className="px-4 py-3">
//                     <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLE[post.status] ?? ""}`}>
//                       {post.status}
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </section>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PlatformId =
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "linkedin"
  | "youtube";

type Status = "scheduled" | "publishing" | "published" | "failed";

interface Post {
  id: string;
  text: string;
  // Platform-wise text, keys in lower case: { instagram: "...", facebook: "..." }
  customTexts: Partial<Record<PlatformId, string>>;
  platforms: PlatformId[];
  when: string;
  status: Status;
  error: string | null;
}

const PLATFORMS: {
  id: PlatformId;
  name: string;
  color: string;
  note: string;
}[] = [
  {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    note: "Pages you manage",
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "#C13584",
    note: "Business or Creator account",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    note: "Profile or Company page",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    color: "#1FA855",
    note: "Business number (Cloud API)",
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    note: "YouTube channel",
  },
];

const STATUS_STYLE: Record<Status, string> = {
  scheduled: "bg-amber-50 text-amber-700 ring-amber-200",
  publishing: "bg-sky-50 text-sky-700 ring-sky-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
};

const STATS: {
  key: Status;
  label: string;
  dot: string;
}[] = [
  {
    key: "scheduled",
    label: "Scheduled",
    dot: "bg-amber-500",
  },
  {
    key: "published",
    label: "Published",
    dot: "bg-emerald-500",
  },
  {
    key: "failed",
    label: "Failed",
    dot: "bg-red-500",
  },
];

const card = "rounded-xl border border-slate-200 bg-white";

const INITIAL_POSTS_LIMIT = 5;

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

export default function DashboardPage() {
  const [connected, setConnected] = useState<
    Record<PlatformId, string | null>
  >({
    instagram: null,
    facebook: null,
    linkedin: null,
    whatsapp: null,
    youtube: null,
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [showAllPosts, setShowAllPosts] = useState(false);

  const [notice, setNotice] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const err = q.get("error");
    const ok = q.get("connected");

    if (ok) {
      setNotice({
        ok: true,
        text: `${ok} connected`,
      });
    } else if (err === "nopages") {
      setNotice({
        ok: false,
        text: `Facebook did not return any Page. Granted: ${
          q.get("granted") || "none"
        }. Pages from account: ${q.get("acct") ?? "?"}, ticked Pages: ${
          q.get("targets") ?? "?"
        }, businesses: ${q.get("biz") ?? "?"}. ${
          q.get("why") ? "Facebook says: " + q.get("why") : ""
        }`,
      });
    } else if (err) {
      setNotice({
        ok: false,
        text: `Connect failed (${err}). ${
          q.get("why") ?? "Please try again."
        }`,
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

    fetch("/api/posts")
      .then((r) => r.json())
      .then((rows: any[]) => {
        setPosts(
          rows.map((p) => {
            // customTexts keys are upper case in the database (INSTAGRAM, FACEBOOK...)
            const customTexts: Partial<Record<PlatformId, string>> = {};
            const raw =
              p.customTexts && typeof p.customTexts === "object"
                ? (p.customTexts as Record<string, unknown>)
                : {};

            for (const [key, value] of Object.entries(raw)) {
              if (typeof value === "string") {
                customTexts[key.toLowerCase() as PlatformId] = value;
              }
            }

            return {
              id: p.id,
              text: p.text,
              customTexts,
              platforms: p.platforms.map(
                (platform: string) =>
                  platform.toLowerCase() as PlatformId
              ),
              when: new Date(p.scheduledAt).toLocaleString(),
              status: p.status.toLowerCase() as Status,
              error: p.error ?? null,
            };
          })
        );
      })
      .catch(() => {});
  }, []);

  const anyConnected = Object.values(connected).some(Boolean);

  const count = (status: Status) =>
    posts.filter((post) => post.status === status).length;

  // Show only the first 5 posts unless Show More is clicked.
  const visiblePosts = showAllPosts
    ? posts
    : posts.slice(0, INITIAL_POSTS_LIMIT);

  async function toggle(id: PlatformId) {
    if (connected[id]) {
      await fetch(`/api/connect/${id}`, {
        method: "DELETE",
      });

      setConnected((current) => ({
        ...current,
        [id]: null,
      }));
    } else if (id === "whatsapp") {
      const phoneNumberId = prompt("WhatsApp phone number ID");
      const token = prompt("WhatsApp access token");

      if (!phoneNumberId || !token) return;

      await fetch("/api/connect/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumberId,
          token,
        }),
      });

      setConnected((current) => ({
        ...current,
        whatsapp: phoneNumberId,
      }));
    } else {
      window.location.href = `/api/connect/${id}`;
    }
  }

  return (
    <div className="space-y-8">
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

      {/* Dashboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>

          <p className="text-sm text-slate-500">
            Your posts and connected accounts
          </p>
        </div>

        {anyConnected ? (
          <Link
            href="/composer"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New post
          </Link>
        ) : (
          <p className="text-sm text-slate-500">
            Connect an account to create your first post
          </p>
        )}
      </div>

      {/* Post Statistics */}
      <section
        aria-label="Post counts"
        className="grid gap-4 sm:grid-cols-3"
      >
        {STATS.map((stat) => (
          <div key={stat.key} className={`${card} p-5`}>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span
                className={`h-2 w-2 rounded-full ${stat.dot}`}
              />
              {stat.label}
            </div>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {count(stat.key)}
            </p>
          </div>
        ))}
      </section>

      {/* Connected Accounts */}
      <section aria-labelledby="accounts">
        <h2
          id="accounts"
          className="mb-3 text-base font-semibold"
        >
          Connected accounts
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {PLATFORMS.map((platform) => {
            const handle = connected[platform.id];

            return (
              <div
                key={platform.id}
                className={`${card} flex flex-col gap-4 p-4`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white"
                    style={{
                      backgroundColor: platform.color,
                    }}
                    aria-hidden="true"
                  >
                    {platform.name[0]}
                  </span>

                  <div className="min-w-0">
                    <p className="font-medium">
                      {platform.name}
                    </p>

                    <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          handle
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                        }`}
                      />

                      <span className="truncate">
                        {handle ?? platform.note}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggle(platform.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    handle
                      ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                      : "bg-slate-900 text-white hover:bg-slate-700"
                  }`}
                >
                  {handle ? "Disconnect" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Posts */}
      <section aria-labelledby="recent">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id="recent"
            className="text-base font-semibold"
          >
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
              <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    Post
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Platforms
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Scheduled for
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {posts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No posts yet
                    </td>
                  </tr>
                ) : (
                  visiblePosts.map((post) => {
                    const lines = getTextLines(post);

                    return (
                      <tr key={post.id}>
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
                                    style={{
                                      backgroundColor: line.color,
                                    }}
                                    aria-label={line.name}
                                  >
                                    {line.name[0]}
                                  </span>

                                  <span className="truncate font-medium text-slate-800">
                                    {line.short}
                                  </span>
                                </p>
                              ))}
                            </div>
                          ) : (
                            // Same text for all platforms
                            <p
                              className="truncate font-medium"
                              title={post.text}
                            >
                              {post.text}
                            </p>
                          )}

                          {post.error && (
                            <p
                              className="mt-1 truncate text-xs text-red-600"
                              title={post.error}
                            >
                              {post.error}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {post.platforms.map((id) => {
                              const platform = PLATFORMS.find(
                                (item) => item.id === id
                              );

                              if (!platform) return null;

                              return (
                                <span
                                  key={id}
                                  title={platform.name}
                                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                                  style={{
                                    backgroundColor: platform.color,
                                  }}
                                >
                                  {platform.name[0]}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {post.when}
                        </td>

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
                onClick={() =>
                  setShowAllPosts((previous) => !previous)
                }
                aria-expanded={showAllPosts}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {showAllPosts ? (
                  <>
                    Show Less
                    <span aria-hidden="true">↑</span>
                  </>
                ) : (
                  <>
                    Show More
                    <span className="text-slate-400">
                      ({posts.length - INITIAL_POSTS_LIMIT} more)
                    </span>
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