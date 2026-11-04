import type { Plan } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

// WhatsApp number for upgrade requests (country code + number, no + or spaces)
const WHATSAPP_NUMBER = "919574927922";

// Monthly AI writer uses for each plan.
// Keep these the same as AI_LIMITS in src/app/api/ai/generate/route.ts
const AI_USES: Record<Plan, number> = {
  FREE: 20,
  PRO: 300,
  BUSINESS: 1500,
};

function upgradeLink(planName: string, price: number, email?: string | null) {
  const message =
    `Hi, I want to upgrade to the ${planName} plan (₹${price}/month).` + (email ? ` My account email: ${email}` : "");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default async function PricingPage() {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email;
  const current = id ? (await prisma.user.findUnique({ where: { id }, select: { plan: true } }))?.plan : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-slate-500">Pick what fits your team</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(PLANS) as Plan[]).map((key) => {
          const p = PLANS[key];
          const isCurrent = current === key;
          const perks = [...p.perks, `${AI_USES[key]} AI writer uses per month`];

          return (
            <section
              key={key}
              className={`flex flex-col rounded-xl border bg-white p-5 ${
                isCurrent ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200"
              }`}
            >
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {p.priceInr === 0 ? "Free" : `₹${p.priceInr}`}
                {p.priceInr > 0 && <span className="text-sm font-normal text-slate-500"> / month</span>}
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                {perks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span className="text-indigo-600">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <p className="mt-5 rounded-lg bg-indigo-600 py-2 text-center text-sm font-medium text-white">
                  Your plan
                </p>
              ) : p.priceInr === 0 ? (
                <p className="mt-5 rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-500">
                  Free forever
                </p>
              ) : (
                <a
                  href={upgradeLink(p.name, p.priceInr, email)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 cursor-pointer rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Request upgrade
                </a>
              )}
            </section>
          );
        })}
      </div>

      <p className="text-sm text-slate-500">
        Click <span className="font-medium text-slate-700">Request upgrade</span> to message us on WhatsApp. We will
        activate your plan after you confirm.
      </p>
    </div>
  );
}