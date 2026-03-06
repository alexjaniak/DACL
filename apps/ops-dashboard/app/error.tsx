'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:gap-7 lg:px-8 lg:py-12">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">DACL</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ops Dashboard</h1>
      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-6 text-sm text-rose-200">
        <p>Dashboard data failed to load.</p>
        <button
          type="button"
          className="mt-3 rounded-md border border-rose-300/40 px-3 py-1.5 text-xs font-medium hover:bg-rose-500/20"
          onClick={reset}
        >
          Retry
        </button>
      </div>
    </main>
  );
}
