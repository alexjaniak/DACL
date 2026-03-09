'use client';

import { useEffect, useState } from 'react';

function format(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;

  if (abs < 60_000) return future ? 'in <1m' : '<1m ago';

  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) {
    const label = `${minutes}m`;
    return future ? `in ${label}` : `${label} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const label = `${hours}h`;
    return future ? `in ${label}` : `${label} ago`;
  }

  const days = Math.floor(hours / 24);
  const label = `${days}d`;
  return future ? `in ${label}` : `${label} ago`;
}

export function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => format(iso));

  useEffect(() => {
    setText(format(iso));
    const id = setInterval(() => setText(format(iso)), 15_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()}>
      {text}
    </time>
  );
}
