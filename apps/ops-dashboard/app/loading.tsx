export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:gap-7 lg:px-8 lg:py-12">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">DACL</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ops Dashboard</h1>
      <p className="rounded-lg border border-dashed border-border/70 bg-background/20 px-4 py-6 text-sm text-muted-foreground">
        Loading live dashboard data...
      </p>
    </main>
  );
}
