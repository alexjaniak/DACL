import { getAgents } from '@/lib/data';
import { AgentGrid } from '@/components/agent-grid';
import { StatsBar } from '@/components/stats-bar';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const agents = await getAgents();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">DACL</p>
        <h1 className="text-3xl font-semibold tracking-tight">Ops Dashboard</h1>
        <StatsBar agents={agents} />
      </header>

      <AgentGrid agents={agents} />
    </main>
  );
}
