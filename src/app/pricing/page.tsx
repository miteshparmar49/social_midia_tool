import type { Plan } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, PLANS_ENFORCED } from "@/lib/plans";

export default async function PricingPage() {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  const current = id ? (await prisma.user.findUnique({ where: { id }, select: { plan: true } }))?.plan : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-slate-500">Pick what fits your team</p>
      </div>
      {!PLANS_ENFORCED && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Launch offer: every feature is free for everyone right now. Paid plans start with our next features.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(PLANS) as Plan[]).map((key) => {
          const p = PLANS[key];
          const isCurrent = current === key;
          return (
            <section key={key} className={`flex flex-col rounded-xl border bg-white p-5 ${isCurrent ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200"}`}>
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {p.priceInr === 0 ? "Free" : `₹${p.priceInr}`}
                {p.priceInr > 0 && <span className="text-sm font-normal text-slate-500"> / month</span>}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span className="text-indigo-600">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
              <p className={`mt-5 rounded-lg py-2 text-center text-sm font-medium ${isCurrent ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-700"}`}>
                {isCurrent ? "Your plan" : PLANS_ENFORCED ? "Upgrade (coming soon)" : "Included free for now"}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
