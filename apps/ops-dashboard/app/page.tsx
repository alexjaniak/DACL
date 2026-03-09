import { getAgents } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const agents = await getAgents();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-1.5">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">DACL</p>
        <h1 className="text-3xl font-semibold tracking-tight">Ops Dashboard</h1>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-medium">Agents ({agents.length})</h2>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agents found.</p>
        ) : (
          <ul className="grid gap-2">
            {agents.map((agent) => (
              <li
                key={agent.id}
                className="flex items-center justify-between rounded-lg border border-border/80 bg-card/80 px-4 py-3"
              >
                <span className="font-medium">{agent.id}</span>
                <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                  {agent.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
