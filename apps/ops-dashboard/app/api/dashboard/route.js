import { NextResponse } from 'next/server';
import { getDashboardData } from '../../../lib/data';

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        agents: [],
        cronJobs: [],
        activity: [],
        runlogs: [],
        error: 'Failed to load dashboard data',
        details: error instanceof Error ? error.message : 'unknown error'
      },
      { status: 200 }
    );
  }
}
