import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import type { Plan } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, PLANS_ENFORCED } from "@/lib/plans";

const font = Bricolage_Grotesque({ subsets: ["latin"] });

export default async function PricingPage() {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  const current = id ? (await prisma.user.findUnique({ where: { id }, select: { plan: true } }))?.plan : undefined;

  return (
    <main className={`${font.className} min-h-screen bg-slate-100 text-slate-900`}>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/dashboard" className="text-sm text-slate-600 underline">Back to dashboard</Link>
        <h1 className="mb-2 mt-3 text-3xl font-semibold tracking-tight">Plans</h1>
        {!PLANS_ENFORCED && (
          <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-emerald-900">
            Launch offer: every feature is free for everyone right now. Paid plans start with our next features.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(PLANS) as Plan[]).map((key) => {
            const p = PLANS[key];
            return (
              <section key={key} className="flex flex-col rounded-xl bg-white p-5">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="mt-2 text-3xl font-semibold">
                  {p.priceInr === 0 ? "Free" : `₹${p.priceInr}`}
                  {p.priceInr > 0 && <span className="text-base font-normal text-slate-600"> / month</span>}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                  {p.perks.map((perk) => <li key={perk}>{perk}</li>)}
                </ul>
                <p className="mt-5 rounded-lg border border-slate-200 py-2 text-center text-sm font-medium">
                  {current === key ? "Your plan" : PLANS_ENFORCED ? "Upgrade (coming soon)" : "Included free for now"}
                </p>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
