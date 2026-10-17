"use client";

import { useMemo, useState } from "react";

type PlanKey = "FREE" | "PRO" | "BUSINESS";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  plan: PlanKey;
  accounts: { platform: string; handle: string }[];
  posts: { total: number; published: number; failed: number };
}

const COLOR: Record<string, string> = {
  FACEBOOK: "#1877F2",
  INSTAGRAM: "#C13584",
  LINKEDIN: "#0A66C2",
  WHATSAPP: "#1FA855",
};

export default function AdminUsers({ users }: { users: AdminUser[] }) {
  const [rows, setRows] = useState(users);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.email.toLowerCase().includes(s) || r.name.toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  async function changePlan(u: AdminUser, plan: PlanKey) {
    setSaving(u.id);
    setMsg(null);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    }).catch(() => null);
    setSaving(null);
    if (!res?.ok) return setMsg({ ok: false, text: `Could not change the plan for ${u.email}` });
    setRows((rs) => rs.map((r) => (r.id === u.id ? { ...r, plan } : r)));
    setMsg({ ok: true, text: `${u.email} is now on the ${plan.toLowerCase()} plan` });
  }

  return (
    <section aria-labelledby="users" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="users" className="text-base font-semibold">Users ({shown.length})</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search users"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-72"
        />
      </div>

      {msg && (
        <p role="status" className={`rounded-xl border p-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {msg.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Accounts</th>
              <th className="px-4 py-3 font-medium">Posts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No users found</td>
              </tr>
            )}
            {shown.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.name || "No name"}</td>
                <td className="px-4 py-3">
                  <p>{u.email}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${u.verified ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                    {u.verified ? "Verified" : "Not verified"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.plan}
                    disabled={saving === u.id}
                    onChange={(e) => changePlan(u, e.target.value as PlanKey)}
                    aria-label={`Plan for ${u.email}`}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
                  >
                    <option value="FREE">Free</option>
                    <option value="PRO">Pro</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {u.accounts.length === 0 ? (
                    <span className="text-slate-400">None</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {u.accounts.map((a, i) => (
                        <span
                          key={i}
                          title={`${a.platform.toLowerCase()}: ${a.handle}`}
                          className="grid h-6 w-6 place-items-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: COLOR[a.platform] ?? "#64748b" }}
                        >
                          {a.platform[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {u.posts.total} total · {u.posts.published} published
                  {u.posts.failed > 0 && <span className="text-red-600"> · {u.posts.failed} failed</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
