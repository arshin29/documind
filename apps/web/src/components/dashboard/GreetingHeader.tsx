'use client';

import { useState } from 'react';
import { Calendar, FileText, LayoutTemplate, Sparkles, Plus, ChevronDown } from 'lucide-react';

interface GreetingHeaderProps {
  userName?: string;
  onOpenUpload: () => void;
  onOpenWorkspace: () => void;
  onOpenNote?: () => void;
  onOpenTemplate?: () => void;
}

export function GreetingHeader({
  userName = 'there',
  onOpenUpload,
  onOpenWorkspace,
  onOpenNote,
  onOpenTemplate,
}: GreetingHeaderProps) {
  const [dateRange, setDateRange] = useState('This Week');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dateOptions = ['Today', 'This Week', 'This Month', 'All Time'];

  return (
    <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
      {/* Greeting Title */}
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-[#242633] tracking-tight">
          Good morning, {userName}!
        </h1>
        <p className="text-xs text-[#858A99] mt-0.5">
          Knowledge repository and AI intelligence across your workspace.
        </p>
      </div>

      {/* Action Controls Group */}
      <div className="flex flex-wrap items-center gap-2 select-none">
        {/* Date Filter Pill Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-9 px-3 rounded-xl bg-white border border-[#E9EAF0] hover:border-[#D8DAE5] text-xs font-medium text-[#242633] flex items-center gap-2 shadow-subtle transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-[#858A99]" />
            <span>{dateRange}</span>
            <ChevronDown className="w-3 h-3 text-[#858A99]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl border border-[#E9EAF0] shadow-dropdown py-1 z-30">
              {dateOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setDateRange(opt);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    dateRange === opt
                      ? 'bg-[#EEF0FF] text-[#7185E8] font-medium'
                      : 'text-[#242633] hover:bg-[#F7F8FA]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Note Button */}
        <button
          type="button"
          onClick={onOpenNote}
          className="h-9 px-3 rounded-xl bg-white border border-[#E9EAF0] hover:border-[#D8DAE5] text-xs font-medium text-[#242633] flex items-center gap-1.5 shadow-subtle hover:bg-[#F7F8FA] transition-all"
          title="Create or View Workspace Notes"
        >
          <FileText className="w-3.5 h-3.5 text-[#858A99]" />
          <span className="hidden sm:inline">Note</span>
        </button>

        {/* Template Gallery Button */}
        <button
          type="button"
          onClick={onOpenTemplate}
          className="h-9 px-3 rounded-xl bg-white border border-[#E9EAF0] hover:border-[#D8DAE5] text-xs font-medium text-[#242633] flex items-center gap-1.5 shadow-subtle hover:bg-[#F7F8FA] transition-all"
          title="Browse Document & Operational Templates"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-[#858A99]" />
          <span className="hidden sm:inline">Template</span>
        </button>

        {/* AI Gradient Button */}
        <button
          type="button"
          onClick={onOpenWorkspace}
          className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#9A8AE8] via-[#E28AB2] to-[#FF9E79] hover:opacity-90 flex items-center justify-center text-white shadow-subtle transition-all"
          title="Ask AI Intelligence"
        >
          <Sparkles className="w-4 h-4 fill-white/20" />
        </button>

        {/* Primary Action Button: + New Doc */}
        <button
          type="button"
          onClick={onOpenUpload}
          className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-white text-xs font-semibold flex items-center gap-1.5 shadow-subtle shadow-[#7185E8]/25 transition-all cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Doc</span>
        </button>
      </div>
    </section>
  );
}
