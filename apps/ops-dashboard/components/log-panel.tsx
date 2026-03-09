'use client';

import { useState } from 'react';
import { LogViewer } from './log-viewer';

export function LogPanel({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="inline-block transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
          ▶
        </span>
        {open ? 'Hide logs' : 'View logs'}
      </button>
      {open && <LogViewer agentId={agentId} />}
    </div>
  );
}
