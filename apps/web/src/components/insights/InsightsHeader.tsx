'use client';

import { Calendar } from 'lucide-react';
import { DateRangeKey, DATE_RANGE_OPTIONS } from '@/lib/analytics';

interface InsightsHeaderProps {
  selectedRange: DateRangeKey;
  onRangeChange: (range: DateRangeKey) => void;
}

export function InsightsHeader({
  selectedRange,
  onRangeChange,
}: InsightsHeaderProps) {
  return (
    <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[#242633] tracking-tight">
            Insights & Analytics
          </h1>
          <span className="text-[11px] font-semibold text-[#7185E8] bg-[#EEF0FF] px-2 py-0.5 rounded-full border border-[#E0E4FA]">
            Live Trends
          </span>
        </div>
        <p className="text-xs text-[#858A99] mt-1">
          Monitor document ingestion volume, processing throughput, and AI conversation activity across your workspace.
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#858A99] mr-1">
          <Calendar className="w-3.5 h-3.5 text-[#7185E8]" />
          <span className="font-medium text-[#242633]">Period:</span>
        </div>
        <div
          role="radiogroup"
          aria-label="Filter analytics by time range"
          className="inline-flex p-1 rounded-xl bg-white border border-[#E9EAF0] shadow-card gap-1"
        >
          {DATE_RANGE_OPTIONS.map((option) => {
            const isSelected = selectedRange === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onRangeChange(option.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer font-medium ${
                  isSelected
                    ? 'bg-[#EEF0FF] text-[#7185E8] shadow-xs'
                    : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
