'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Parse markdown blocks: headers, lists, tables, paragraphs
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: number) => {
    if (tableHeader.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={`table-wrapper-${key}`} className="my-2.5 overflow-x-auto rounded-xl border border-[#E9EAF0] shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            {tableHeader.length > 0 && (
              <thead className="bg-[#FAFAFC] border-b border-[#E9EAF0]">
                <tr>
                  {tableHeader.map((h, i) => (
                    <th key={i} className="py-2 px-3 font-semibold text-[#242633]">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-[#E9EAF0]/70">
              {tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={rIdx % 2 === 1 ? 'bg-[#FAFAFC]/50' : 'bg-white'}
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-[#525666]">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Markdown Table Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // Check if it's separator line like | :--- | :--- |
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // Blank line
    if (!trimmed) {
      elements.push(<div key={`spacer-${i}`} className="h-1.5" />);
      continue;
    }

    // Heading 3: ###
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold text-[#242633] mt-3 mb-1 tracking-tight">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }

    // Heading 4: ####
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4-${i}`} className="text-[11px] font-semibold text-[#858A99] uppercase tracking-wider mt-3 mb-1">
          {renderInline(trimmed.slice(5))}
        </h5>
      );
      continue;
    }

    // Bullet List: • or - or *
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.slice(2);
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7185E8] shrink-0 mt-1.5" />
          <span className="leading-relaxed text-[#242633]">{renderInline(text)}</span>
        </div>
      );
      continue;
    }

    // Numbered List: 1. 2. etc
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const [, num, text] = numMatch;
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-1 pl-1">
          <span className="font-mono text-[10px] text-[#7185E8] font-bold shrink-0 mt-0.5">
            {num}.
          </span>
          <span className="leading-relaxed text-[#242633]">{renderInline(text)}</span>
        </div>
      );
      continue;
    }

    // Regular Paragraph
    elements.push(
      <p key={`p-${i}`} className="leading-relaxed text-[#242633] my-1 font-normal">
        {renderInline(trimmed)}
      </p>
    );
  }

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className="space-y-0.5 text-xs">{elements}</div>;
}

// Inline formatting: **bold**, `code`, *italic*
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    const bIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
    const cIndex = codeMatch ? remaining.indexOf(codeMatch[0]) : -1;

    if (bIndex === -1 && cIndex === -1) {
      parts.push(remaining);
      break;
    }

    if (bIndex !== -1 && (cIndex === -1 || bIndex < cIndex)) {
      if (bIndex > 0) {
        parts.push(remaining.substring(0, bIndex));
      }
      parts.push(
        <strong key={`bold-${key++}`} className="font-semibold text-[#242633]">
          {boldMatch![1]}
        </strong>
      );
      remaining = remaining.substring(bIndex + boldMatch![0].length);
    } else if (cIndex !== -1) {
      if (cIndex > 0) {
        parts.push(remaining.substring(0, cIndex));
      }
      parts.push(
        <code
          key={`code-${key++}`}
          className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-[#EEF0FF] border border-[#E0E4FA] text-[#7185E8] font-semibold"
        >
          {codeMatch![1]}
        </code>
      );
      remaining = remaining.substring(cIndex + codeMatch![0].length);
    }
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

