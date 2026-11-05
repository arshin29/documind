'use client';

import { FileText, ArrowRight } from 'lucide-react';

interface SourceCitationProps {
  documentTitle: string;
  documentId?: string;
  page?: number;
  section?: string;
  quote: string;
  onNavigateToPage?: (page: number, documentId?: string) => void;
}

export function SourceCitation({
  documentTitle,
  documentId,
  page,
  quote,
  onNavigateToPage,
}: SourceCitationProps) {
  const handleClick = () => {
    if (page && onNavigateToPage) {
      onNavigateToPage(page, documentId);
    }
  };

  return (
    <div
      onClick={handleClick}
      role={page && onNavigateToPage ? 'button' : undefined}
      tabIndex={page && onNavigateToPage ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && page && onNavigateToPage) {
          onNavigateToPage(page);
        }
      }}
      className={`p-3 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] text-xs text-left transition-all group shadow-xs ${page && onNavigateToPage
          ? 'hover:border-[#7185E8]/50 hover:bg-[#F2F4FA] cursor-pointer'
          : ''
        }`}
    >
      <div className="flex items-center justify-between text-[#858A99] text-[11px] mb-1.5">
        <span className="flex items-center gap-1.5 truncate max-w-[70%]">
          <FileText className="w-3.5 h-3.5 stroke-[1.75] text-[#7185E8] shrink-0" />
          <span className="truncate font-medium text-[#242633] group-hover:text-[#7185E8] transition-colors">
            {documentTitle}
          </span>
        </span>
        {page && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#7185E8] font-semibold bg-[#EEF0FF] px-2 py-0.5 rounded-md border border-[#E0E4FA] shrink-0">
            <span>Page {page}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
          </span>
        )}
      </div>

      <p className="text-[11px] text-[#525666] italic leading-relaxed line-clamp-2">
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}

