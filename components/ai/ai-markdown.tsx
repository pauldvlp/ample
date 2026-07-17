'use client';

import * as React from 'react';

/**
 * Tiny, dependency-free markdown renderer for the short, controlled outputs our
 * prompts produce (headings, bullet lists, bold, paragraphs). Not a general
 * markdown engine — just enough to render assistant text cleanly and safely
 * (no dangerouslySetInnerHTML).
 */
export function AiMarkdown({ text }: { text: string }) {
  const blocks = React.useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === 'h')
          return (
            <p key={i} className="font-display text-base text-foreground">
              {inline(b.text)}
            </p>
          );
        if (b.type === 'ul')
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />
                  <span className="min-w-0 flex-1">{inline(it)}</span>
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="text-foreground/90">
            {inline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  { type: 'p'; text: string } | { type: 'h'; text: string } | { type: 'ul'; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ').trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list && list.length) blocks.push({ type: 'ul', items: list });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ type: 'h', text: heading[1] });
    } else if (bullet) {
      flushPara();
      list ??= [];
      list.push(bullet[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Inline **bold** and `code`. */
function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`(.+?)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] != null)
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {m[1]}
        </strong>,
      );
    else if (m[2] != null)
      parts.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {m[2]}
        </code>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
