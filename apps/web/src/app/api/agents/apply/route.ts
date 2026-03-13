import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import { managePyPath, getForgeRoot } from "@/lib/paths";

export async function POST() {
  try {
    const result = spawnSync(
      "python3",
      [managePyPath(), "apply"],
      {
        cwd: getForgeRoot(),
        timeout: 30_000,
        encoding: "utf-8",
      }
    );

    return NextResponse.json({
      ok: result.status === 0,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
