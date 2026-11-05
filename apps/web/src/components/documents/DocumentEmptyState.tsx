'use client';

import { Files, Search, Filter, Upload, RotateCcw } from 'lucide-react';

interface DocumentEmptyStateProps {
  type: 'no-documents' | 'no-search-results' | 'no-filter-matches';
  searchTerm?: string;
  onUpload?: () => void;
  onClearSearch?: () => void;
  onResetFilters?: () => void;
}

export function DocumentEmptyState({
  type,
  searchTerm,
  onUpload,
  onClearSearch,
  onResetFilters,
}: DocumentEmptyStateProps) {
  if (type === 'no-documents') {
    return (
      <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card py-16 px-6 text-center flex flex-col items-center justify-center animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center mb-4 shadow-subtle">
          <Files className="w-6 h-6 stroke-[1.75]" />
        </div>
        <h3 className="text-base font-semibold text-[#242633] tracking-tight">
          No documents uploaded yet
        </h3>
        <p className="text-xs text-[#858A99] mt-1.5 max-w-sm leading-relaxed">
          Upload PDF, DOCX, or TXT files to extract chunks, analyze key topics, and query with AI intelligence across your repository.
        </p>
        {onUpload && (
          <button
            type="button"
            onClick={onUpload}
            className="mt-6 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-white text-xs font-semibold shadow-subtle shadow-[#7185E8]/25 transition-all active:scale-98"
          >
            <Upload className="w-4 h-4 stroke-[2]" />
            <span>Upload Document</span>
          </button>
        )}
      </div>
    );
  }

  if (type === 'no-search-results') {
    return (
      <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card py-16 px-6 text-center flex flex-col items-center justify-center animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center mb-4 shadow-subtle">
          <Search className="w-6 h-6 stroke-[1.75]" />
        </div>
        <h3 className="text-base font-semibold text-[#242633] tracking-tight">
          No matching documents found
        </h3>
        <p className="text-xs text-[#858A99] mt-1.5 max-w-sm leading-relaxed">
          No documents matched &ldquo;<span className="text-[#242633] font-semibold">{searchTerm}</span>&rdquo;. Check your query for spelling or try broader keywords.
        </p>
        {onClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="mt-6 inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-[#E9EAF0] bg-white hover:bg-[#F7F8FA] hover:border-[#D8DAE5] text-[#242633] text-xs font-medium shadow-subtle transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#858A99]" />
            <span>Clear Search Query</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card py-16 px-6 text-center flex flex-col items-center justify-center animate-in fade-in duration-200">
      <div className="w-14 h-14 rounded-2xl bg-[#F7F8FA] border border-[#EFF0F6] text-[#858A99] flex items-center justify-center mb-4 shadow-subtle">
        <Filter className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-semibold text-[#242633] tracking-tight">
        No documents match selected filters
      </h3>
      <p className="text-xs text-[#858A99] mt-1.5 max-w-sm leading-relaxed">
        None of your documents match the active type or processing status criteria. Try selecting different filter combinations.
      </p>
      {onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-6 inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-[#E9EAF0] bg-white hover:bg-[#F7F8FA] hover:border-[#D8DAE5] text-[#242633] text-xs font-medium shadow-subtle transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#858A99]" />
          <span>Reset All Filters</span>
        </button>
      )}
    </div>
  );
}

