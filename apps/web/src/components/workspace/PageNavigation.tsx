'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
}: PageNavigationProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handleInputBlurOrSubmit = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-[#242633] select-none">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className="w-7 h-7 rounded-lg hover:bg-[#EEF0FF] text-[#858A99] hover:text-[#7185E8] flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#858A99]"
        title="Previous Page"
        aria-label="Previous Page"
      >
        <ChevronLeft className="w-4 h-4 stroke-[1.75]" />
      </button>

      <div className="flex items-center gap-1.5 font-mono text-xs px-1">
        <input
          type="text"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={handleInputBlurOrSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleInputBlurOrSubmit();
            }
          }}
          className="w-8 h-6 text-center font-semibold rounded-lg border border-[#E9EAF0] bg-white text-[#242633] focus:border-[#7185E8] focus:outline-none transition-colors shadow-xs"
          aria-label="Current page number"
        />
        <span className="text-[#858A99]">/ {totalPages}</span>
      </div>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="w-7 h-7 rounded-lg hover:bg-[#EEF0FF] text-[#858A99] hover:text-[#7185E8] flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#858A99]"
        title="Next Page"
        aria-label="Next Page"
      >
        <ChevronRight className="w-4 h-4 stroke-[1.75]" />
      </button>
    </div>
  );
}

