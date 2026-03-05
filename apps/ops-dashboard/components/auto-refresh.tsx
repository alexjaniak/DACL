'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_INTERVAL_MS = 15000;

export function AutoRefresh({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
      setLastRefresh(new Date());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, router]);

  return (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      Auto-refreshing every {Math.round(intervalMs / 1000)}s · last refresh {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}
    </p>
  );
}
