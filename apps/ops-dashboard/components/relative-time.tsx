'use client';

import { useEffect, useState } from 'react';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;

  if (abs < 60_000) return future ? 'in <1m' : '<1m ago';

  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return future ? `in ${days}d` : `${days}d ago`;
}

export function RelativeTime({ iso, fallback = 'never' }: { iso: string | null; fallback?: string }) {
  const [text, setText] = useState(() => (iso ? formatRelative(iso) : fallback));

  useEffect(() => {
    if (!iso) return;
    setText(formatRelative(iso));
    const id = setInterval(() => setText(formatRelative(iso)), 15_000);
    return () => clearInterval(id);
  }, [iso]);

  return <span>{text}</span>;
}
