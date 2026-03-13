import { NextResponse } from "next/server";
import fs from "fs";
import { atomicWriteJsonSync, cronJobsPath } from "@/lib/paths";

export async function POST() {
  try {
    const filePath = cronJobsPath();
    let count = 0;

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      count = Array.isArray(data.jobs) ? data.jobs.length : 0;
    } catch {
      // file doesn't exist or is invalid — will write fresh
    }

    atomicWriteJsonSync(filePath, { stagger: true, jobs: [] });

    return NextResponse.json({ ok: true, removed: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
