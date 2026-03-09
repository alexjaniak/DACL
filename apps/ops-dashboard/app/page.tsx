import { getAgents } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const agents = await getAgents();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="space-y-1.5">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">DACL</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ops Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} registered
        </p>
      </header>

      <ul className="grid gap-3">
        {agents.map((agent) => (
          <li
            key={agent.id}
            className="flex items-center justify-between rounded-lg border border-border/80 bg-card/95 px-4 py-3"
          >
            <span className="text-sm font-medium">{agent.id}</span>
            <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-xs text-muted-foreground">
              {agent.role}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
