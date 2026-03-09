'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-1 mt-2 text-base font-bold text-zinc-100">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1 mt-2 text-sm font-bold text-zinc-100">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-1 text-sm font-semibold text-zinc-200">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-bold text-zinc-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-1 ml-4 list-disc text-zinc-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-1 ml-4 list-decimal text-zinc-300">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-400 underline decoration-blue-400/40 hover:text-blue-300"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded bg-zinc-900 px-3 py-2 text-[12px] text-emerald-300">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-zinc-800 px-1 py-0.5 text-[12px] text-emerald-300">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-1 overflow-x-auto rounded bg-zinc-900 text-[12px]">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-zinc-600 pl-3 text-zinc-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-zinc-700" />,
};

function LogMarkdownInner({ content }: { content: string }) {
  return (
    <div className="log-markdown whitespace-pre-wrap break-words">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}

export const LogMarkdown = memo(LogMarkdownInner);
