import { Dashboard } from '@/components/dashboard';
import { getAgents } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const agents = await getAgents();

  return <Dashboard initialAgents={agents} />;
}
