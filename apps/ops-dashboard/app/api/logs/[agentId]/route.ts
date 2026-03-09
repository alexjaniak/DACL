import { NextRequest, NextResponse } from 'next/server';
import { agentExists, getAgentLog } from '@/lib/data';

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const linesParam = request.nextUrl.searchParams.get('lines');
  let lines = 100;
  if (linesParam) {
    const parsed = parseInt(linesParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      lines = Math.min(parsed, 500);
    }
  }

  try {
    const exists = await agentExists(agentId);
    if (!exists) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const result = await getAgentLog(agentId, lines);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read log', details: error instanceof Error ? error.message : 'unknown error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
