import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { agentLogPath, logsDir } from "@/lib/paths";

const SAFE_ID_RE = /^[a-z][a-z0-9-]{0,63}$/;
const SEED_READ_BYTES = 64 * 1024; // 64KB

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  if (!SAFE_ID_RE.test(agentId)) {
    return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
  }

  const logPath = agentLogPath(agentId);

  // Path traversal guard
  const resolvedLogsDir = path.resolve(logsDir());
  const resolvedLogPath = path.resolve(logPath);
  if (!resolvedLogPath.startsWith(resolvedLogsDir + path.sep)) {
    return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
  }

  const offsetParam = request.nextUrl.searchParams.get("offset") ?? "0";
  const offset = parseInt(offsetParam, 10);

  if (isNaN(offset) || offset < 0) {
    return NextResponse.json(
      { error: "Invalid offset parameter" },
      { status: 400 }
    );
  }

  let fileSize: number;
  try {
    const stat = fs.statSync(logPath);
    fileSize = stat.size;
  } catch {
    return NextResponse.json({ data: "", offset: 0, fileSize: 0 });
  }

  // Handle file truncation (log rotation, etc.)
  const effectiveOffset = offset > fileSize ? 0 : offset;

  let data: string;
  if (effectiveOffset === 0 && fileSize > SEED_READ_BYTES) {
    // Seed read: return last 64KB
    const fd = fs.openSync(logPath, "r");
    const buffer = Buffer.alloc(SEED_READ_BYTES);
    const startPos = fileSize - SEED_READ_BYTES;
    fs.readSync(fd, buffer, 0, SEED_READ_BYTES, startPos);
    fs.closeSync(fd);
    data = buffer.toString("utf-8");
    return NextResponse.json({
      data,
      offset: fileSize,
      fileSize,
    });
  }

  // Incremental read from offset
  const fd = fs.openSync(logPath, "r");
  const bytesToRead = fileSize - effectiveOffset;
  if (bytesToRead <= 0) {
    fs.closeSync(fd);
    return NextResponse.json({ data: "", offset: fileSize, fileSize });
  }
  const buffer = Buffer.alloc(bytesToRead);
  fs.readSync(fd, buffer, 0, bytesToRead, effectiveOffset);
  fs.closeSync(fd);
  data = buffer.toString("utf-8");

  return NextResponse.json({
    data,
    offset: fileSize,
    fileSize,
  });
}
