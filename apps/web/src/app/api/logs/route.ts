import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { logsDir } from "@/lib/paths";

const SEED_READ_BYTES = 64 * 1024;

interface LogResult {
  data: string;
  offset: number;
  fileSize: number;
}

function readLog(logPath: string, offset: number): LogResult {
  let fileSize: number;
  try {
    fileSize = fs.statSync(logPath).size;
  } catch {
    return { data: "", offset: 0, fileSize: 0 };
  }

  const effectiveOffset = offset > fileSize ? 0 : offset;

  if (effectiveOffset === 0 && fileSize > SEED_READ_BYTES) {
    const fd = fs.openSync(logPath, "r");
    const buffer = Buffer.alloc(SEED_READ_BYTES);
    fs.readSync(fd, buffer, 0, SEED_READ_BYTES, fileSize - SEED_READ_BYTES);
    fs.closeSync(fd);
    return { data: buffer.toString("utf-8"), offset: fileSize, fileSize };
  }

  const bytesToRead = fileSize - effectiveOffset;
  if (bytesToRead <= 0) {
    return { data: "", offset: fileSize, fileSize };
  }

  const fd = fs.openSync(logPath, "r");
  const buffer = Buffer.alloc(bytesToRead);
  fs.readSync(fd, buffer, 0, bytesToRead, effectiveOffset);
  fs.closeSync(fd);
  return { data: buffer.toString("utf-8"), offset: fileSize, fileSize };
}

export async function GET(request: NextRequest) {
  const offsetParam = request.nextUrl.searchParams.get("offset") ?? "0";
  const defaultOffset = parseInt(offsetParam, 10);

  if (isNaN(defaultOffset) || defaultOffset < 0) {
    return NextResponse.json(
      { error: "Invalid offset parameter" },
      { status: 400 }
    );
  }

  const dir = logsDir();
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".log"));
  } catch {
    return NextResponse.json({ agents: {} });
  }

  const agents: Record<string, LogResult> = {};
  for (const file of files) {
    const agentId = path.basename(file, ".log");
    agents[agentId] = readLog(path.join(dir, file), defaultOffset);
  }

  return NextResponse.json({ agents });
}
