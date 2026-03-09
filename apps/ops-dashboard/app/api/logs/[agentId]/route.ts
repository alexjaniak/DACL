import { NextResponse, type NextRequest } from 'next/server';
import { getAgentLog, getAgents } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const linesParam = request.nextUrl.searchParams.get('lines');
  const lines = Math.min(Math.max(parseInt(linesParam ?? '100', 10) || 100, 1), 500);

  try {
    // Check if this agent exists
    const agents = await getAgents();
    const exists = agents.some((a) => a.id === agentId);
    if (!exists) {
      return NextResponse.json(
        { error: `Agent '${agentId}' not found` },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const chunk = await getAgentLog(agentId, lines);
    return NextResponse.json(chunk, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read log' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
