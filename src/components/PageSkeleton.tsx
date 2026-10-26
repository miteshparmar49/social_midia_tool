// Shown by loading.tsx while a page is being fetched. The sidebar stays visible.
export default function PageSkeleton() {
  const bar = "animate-pulse rounded-lg bg-slate-200";
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="space-y-2">
        <div className={`${bar} h-7 w-48`} />
        <div className={`${bar} h-4 w-72`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className={`${bar} h-4 w-20`} />
            <div className={`${bar} mt-3 h-8 w-16`} />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${bar} ${i ? "mt-3" : ""} h-5 w-full`} />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
