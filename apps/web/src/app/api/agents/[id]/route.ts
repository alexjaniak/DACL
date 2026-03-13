import { NextRequest, NextResponse } from "next/server";
import { spawnSync } from "child_process";
import fs from "fs";
import { managePyPath, cronJobsPath, getForgeRoot } from "@/lib/paths";

const SAFE_ID_RE = /^[a-z][a-z0-9-]{0,63}$/;

interface CronJob {
  id: string;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!SAFE_ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
  }

  // Verify agent exists
  try {
    const raw = fs.readFileSync(cronJobsPath(), "utf-8");
    const jobs: CronJob[] = JSON.parse(raw).jobs ?? [];
    if (!jobs.some((j) => j.id === id)) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to read agent config" },
      { status: 500 }
    );
  }

  try {
    const result = spawnSync("python3", [managePyPath(), "remove", id], {
      cwd: getForgeRoot(),
      encoding: "utf-8",
      timeout: 10000,
    });
    if (result.status !== 0) {
      return NextResponse.json(
        { ok: false, error: result.stderr || "Command failed" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, output: result.stdout });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
