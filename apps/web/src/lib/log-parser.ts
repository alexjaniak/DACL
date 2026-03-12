export interface LogBlock {
  agentId: string;
  timestamp: string;
  displayTime: string;
  content: string;
  key: string;
}

const RUN_MARKER = /^=== RUN (\S+) ===$/;

function formatTime(isoTimestamp: string): string {
  try {
    const d = new Date(isoTimestamp);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoTimestamp;
  }
}

export function parseLogBlocks(
  agentId: string,
  raw: string
): LogBlock[] {
  const lines = raw.split("\n");
  const blocks: LogBlock[] = [];
  let currentTimestamp: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(RUN_MARKER);
    if (match) {
      if (currentTimestamp && currentLines.length > 0) {
        const content = currentLines.join("\n").trim();
        if (content) {
          blocks.push({
            agentId,
            timestamp: currentTimestamp,
            displayTime: formatTime(currentTimestamp),
            content,
            key: `${agentId}-${currentTimestamp}`,
          });
        }
      }
      currentTimestamp = match[1];
      currentLines = [];
    } else if (line === '=== END RUN ===') {
      if (currentTimestamp && currentLines.length > 0) {
        const content = currentLines.join("\n").trim();
        if (content) {
          blocks.push({
            agentId,
            timestamp: currentTimestamp,
            displayTime: formatTime(currentTimestamp),
            content,
            key: `${agentId}-${currentTimestamp}`,
          });
        }
      }
      currentTimestamp = null;
      currentLines = [];
    } else if (currentTimestamp) {
      currentLines.push(line);
    }
  }

  if (currentTimestamp && currentLines.length > 0) {
    const content = currentLines.join("\n").trim();
    if (content) {
      blocks.push({
        agentId,
        timestamp: currentTimestamp,
        displayTime: formatTime(currentTimestamp),
        content,
        key: `${agentId}-${currentTimestamp}`,
      });
    }
  }

  return blocks;
}
