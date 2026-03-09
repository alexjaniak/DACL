import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/data';

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load agent data', details: error instanceof Error ? error.message : 'unknown error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
