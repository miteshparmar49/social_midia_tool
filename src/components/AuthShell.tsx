import Image from "next/image";
import { Inter } from "next/font/google";

const font = Inter({ subsets: ["latin"] });

const POINTS = [
  "Schedule posts with photos and videos",
  "See everything on a drag and drop calendar",
  "Connect Facebook and Instagram securely",
];

// Split screen layout shared by login, register and password pages.
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={`${font.className} min-h-screen lg:grid lg:grid-cols-2`}>
      <section
        className="relative hidden overflow-hidden bg-[#0a1a44] p-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 15% 10%, rgba(37,99,235,.6), transparent 60%), radial-gradient(55% 45% at 95% 95%, rgba(56,189,248,.35), transparent 60%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <Image src="/logo.png" alt="MVP InfoTech" width={48} height={48} priority className="rounded-full bg-white" />
          <span className="text-lg font-semibold tracking-tight">MVP InfoTech</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Plan once. Publish everywhere.</h2>
          <p className="mt-4 text-blue-100">
            Social Tool helps small businesses schedule posts, keep a clear calendar and manage every account in one workspace.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-blue-50">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-xs">✓</span>
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-10 w-72 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full bg-white" />
              <div>
                <p className="text-sm font-medium">MVP InfoTech</p>
                <p className="text-xs text-blue-200">Scheduled for tomorrow, 10:30 AM</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-2 w-full rounded bg-white/20" />
              <div className="h-2 w-4/5 rounded bg-white/20" />
              <div className="h-2 w-3/5 rounded bg-white/20" />
            </div>
            <div className="mt-4 flex gap-2 text-xs">
              <span className="rounded-full bg-[#1877F2] px-2.5 py-1">Facebook</span>
              <span className="rounded-full bg-[#C13584] px-2.5 py-1">Instagram</span>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-blue-200">© {new Date().getFullYear()} MVP InfoTech. Build · Grow · Sell</p>
      </section>

      <section
        className="relative flex min-h-screen items-center justify-center px-4 py-10"
        style={{
          background:
            "radial-gradient(60% 40% at 85% 0%, #dbeafe, transparent 60%), radial-gradient(50% 40% at 0% 100%, #e0f2fe, transparent 60%), #f8fafc",
        }}
      >
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <Image src="/logo.png" alt="MVP InfoTech" width={44} height={44} priority className="rounded-full" />
            <span className="text-lg font-semibold tracking-tight text-slate-900">MVP InfoTech</span>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-xl shadow-blue-900/5 backdrop-blur">{children}</div>
        </div>
      </section>
    </main>
  );
}
