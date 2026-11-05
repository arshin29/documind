'use client';

import { Sparkles, ArrowUpRight } from 'lucide-react';
import { SUGGESTED_QUESTIONS } from '@/data/workspace-data';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
  documentTitle?: string;
}

export function SuggestedQuestions({
  onSelectQuestion,
  documentTitle,
}: SuggestedQuestionsProps) {
  return (
    <div className="py-8 px-4 md:px-6 flex flex-col items-center text-center max-w-xl mx-auto my-auto animate-in fade-in duration-200">
      {/* Icon Badge */}
      <div className="w-12 h-12 rounded-2xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center mb-4 shadow-subtle">
        <Sparkles className="w-6 h-6 stroke-[1.75]" />
      </div>

      {/* Welcome Title */}
      <h2 className="text-base sm:text-lg font-bold text-[#242633] tracking-tight">
        Explore and synthesize this document
      </h2>

      {/* Supporting Text */}
      <p className="text-xs text-[#858A99] mt-1.5 mb-5 max-w-md leading-relaxed">
        Ask natural-language questions, uncover key drivers, and verify citations grounded directly in source pages.
      </p>

      {/* Active Document Reference Chip */}
      {documentTitle && (
        <div className="mb-5 px-3 py-1 rounded-full bg-white border border-[#E9EAF0] text-xs text-[#242633] flex items-center gap-2 max-w-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#29A36A]" />
          <span className="truncate text-[11px] text-[#525666]">
            Active context: <strong className="font-semibold text-[#242633]">{documentTitle}</strong>
          </span>
        </div>
      )}

      {/* Question Buttons List */}
      <div className="w-full space-y-2 text-left">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#858A99] block text-center mb-2">
          Suggested Inquiries
        </span>
        {SUGGESTED_QUESTIONS.map((question, index) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelectQuestion(question)}
            className="w-full p-3 rounded-xl border border-[#E9EAF0] bg-white hover:border-[#7185E8]/50 hover:bg-[#F2F4FA] transition-all duration-150 text-xs text-[#242633] flex items-center justify-between group shadow-subtle cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <span className="font-mono text-xs text-[#858A99] group-hover:text-[#7185E8] font-semibold w-4 text-center shrink-0">
                0{index + 1}
              </span>
              <span className="font-medium text-[#242633] group-hover:text-[#7185E8] transition-colors truncate">
                {question}
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#858A99] group-hover:text-[#7185E8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 stroke-[1.75]" />
          </button>
        ))}
      </div>
    </div>
  );
}

