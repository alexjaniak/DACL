'use client';

import { useState } from 'react';
import { LogViewer } from './log-viewer';

export function LogPanel({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded border border-border/50 bg-background/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
      >
        <span className="inline-block transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▸
        </span>
        {open ? 'Hide logs' : 'View logs'}
      </button>
      {open && <LogViewer agentId={agentId} />}
    </div>
  );
}
