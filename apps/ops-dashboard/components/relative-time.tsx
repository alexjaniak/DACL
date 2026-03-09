'use client';

import { useEffect, useState } from 'react';

function format(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;

  const totalSeconds = Math.floor(abs / 1_000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  let label: string;

  if (totalHours >= 24) {
    const remainHours = totalHours % 24;
    label = `${totalDays}d ${remainHours}h`;
  } else if (totalMinutes >= 60) {
    const remainMinutes = totalMinutes % 60;
    label = `${totalHours}h ${remainMinutes}m`;
  } else {
    const remainSeconds = totalSeconds % 60;
    label = `${totalMinutes}m ${remainSeconds}s`;
  }

  return future ? `in ${label}` : `${label} ago`;
}

export function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => format(iso));

  useEffect(() => {
    setText(format(iso));
    const id = setInterval(() => setText(format(iso)), 1_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()}>
      {text}
    </time>
  );
}
