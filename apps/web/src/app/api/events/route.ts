import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { eventsPath } from "@/lib/paths";

const MAX_EVENTS_PER_RESPONSE = 50;

export async function GET(request: NextRequest) {
  const offsetParam = request.nextUrl.searchParams.get("offset") ?? "0";
  const offset = parseInt(offsetParam, 10);

  if (isNaN(offset) || offset < 0) {
    return NextResponse.json(
      { error: "Invalid offset parameter" },
      { status: 400 }
    );
  }

  const filePath = eventsPath();

  let lines: string[];
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    lines = content.split("\n").filter((l) => l.trim() !== "");
  } catch {
    return NextResponse.json({ events: [], offset: 0, total: 0 });
  }

  const total = lines.length;

  // Reverse lines so index 0 = most recent, then paginate
  const reversed = [...lines].reverse();
  const slice = reversed.slice(offset, offset + MAX_EVENTS_PER_RESPONSE);

  const events: unknown[] = [];
  for (const line of slice) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }

  return NextResponse.json({
    events,
    offset: Math.min(offset + slice.length, total),
    total,
  });
}
