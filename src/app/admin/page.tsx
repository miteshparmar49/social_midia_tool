import { prisma } from "@/lib/prisma";
import AdminUsers, { type AdminUser } from "@/components/AdminUsers";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [users, stats] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        plan: true,
        // Access tokens are never selected, only the platform and the account name.
        accounts: { select: { platform: true, handle: true } },
      },
      orderBy: { email: "asc" },
      take: 1000,
    }),
    prisma.post.groupBy({ by: ["userId", "status"], _count: { _all: true } }),
  ]);

  const byUser = new Map<string, { total: number; published: number; failed: number }>();
  let published = 0;
  let failed = 0;
  for (const s of stats) {
    const e = byUser.get(s.userId) ?? { total: 0, published: 0, failed: 0 };
    e.total += s._count._all;
    if (s.status === "PUBLISHED") {
      e.published += s._count._all;
      published += s._count._all;
    }
    if (s.status === "FAILED") {
      e.failed += s._count._all;
      failed += s._count._all;
    }
    byUser.set(s.userId, e);
  }

  const rows: AdminUser[] = users.map((u) => ({
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    verified: Boolean(u.emailVerified),
    plan: u.plan,
    accounts: u.accounts,
    posts: byUser.get(u.id) ?? { total: 0, published: 0, failed: 0 },
  }));

  const verified = rows.filter((r) => r.verified).length;
  const count = (p: string) => rows.filter((r) => r.plan === p).length;
  const card = "rounded-xl border border-slate-200 bg-white p-5";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-slate-500">All users, their plans and activity</p>
      </div>

      <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={card}>
          <p className="text-sm text-slate-500">Total users</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{rows.length}</p>
          <p className="mt-1 text-xs text-slate-500">
            Free {count("FREE")} · Pro {count("PRO")} · Business {count("BUSINESS")}
          </p>
        </div>
        <div className={card}>
          <p className="text-sm text-slate-500">Verified emails</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{verified}</p>
          <p className="mt-1 text-xs text-slate-500">{rows.length - verified} not verified yet</p>
        </div>
        <div className={card}>
          <p className="text-sm text-slate-500">Posts published</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{published}</p>
        </div>
        <div className={card}>
          <p className="text-sm text-slate-500">Posts failed</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{failed}</p>
        </div>
      </section>

      <AdminUsers users={rows} />
    </div>
  );
}
