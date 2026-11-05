'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { DocumentTypeSlice } from '@/lib/analytics';

interface DocumentTypeChartProps {
  slices: DocumentTypeSlice[];
  total: number;
}

export function DocumentTypeChart({ slices, total }: DocumentTypeChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeSlices = slices.filter((s) => s.value > 0);

  const formatMeta: Record<
    string,
    { label: string; bg: string; text: string; border: string; barColor: string }
  > = {
    PDF: {
      label: 'PDF Documents',
      bg: 'bg-[#EEF0FF]',
      text: 'text-[#7185E8]',
      border: 'border-[#E0E4FA]',
      barColor: 'bg-[#7185E8]',
    },
    DOCX: {
      label: 'Word Documents',
      bg: 'bg-[#EDF8F2]',
      text: 'text-[#29A36A]',
      border: 'border-[#D4EEDB]',
      barColor: 'bg-[#29A36A]',
    },
    TXT: {
      label: 'Plain Text Files',
      bg: 'bg-[#FEF7ED]',
      text: 'text-[#E6A13A]',
      border: 'border-[#FCE7D0]',
      barColor: 'bg-[#E6A13A]',
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-5 sm:p-6 flex flex-col justify-between h-[380px]">
      {/* Header with fixed height for alignment */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E9EAF0] shrink-0 h-11">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0 shadow-xs">
            <PieIcon className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#242633] tracking-tight truncate">
              Document Breakdown
            </h2>
            <p className="text-xs text-[#858A99] mt-0.5 truncate">
              Format composition across active knowledge base
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F7F8FA] border border-[#E9EAF0] text-[#7185E8] shrink-0">
          {total} {total === 1 ? 'doc' : 'docs'}
        </span>
      </div>

      {/* Chart Canvas & Legend */}
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
        {/* Donut Chart with Center Stat */}
        <div className="relative w-[170px] h-[170px] shrink-0 mx-auto sm:mx-0">
          {!mounted ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-[#858A99]">
              Loading...
            </div>
          ) : total === 0 ? (
            <div className="w-full h-full rounded-full border border-dashed border-[#E9EAF0] flex flex-col items-center justify-center">
              <span className="text-xl font-mono text-[#858A99]">0</span>
              <span className="text-[10px] text-[#858A99]">Documents</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DocumentTypeSlice;
                        return (
                          <div className="bg-white border border-[#E9EAF0] rounded-xl shadow-card px-3 py-2 text-xs pointer-events-none">
                            <span className="font-semibold text-[#242633]">
                              {data.name}:
                            </span>{' '}
                            <span className="font-mono font-bold" style={{ color: data.color }}>
                              {data.value} ({data.percentage}%)
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={activeSlices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={3}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {activeSlices.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Total Documents Count in Center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-bold font-mono text-[#242633] leading-none">
                  {total}
                </span>
                <span className="text-[10px] font-semibold text-[#858A99] uppercase tracking-wider mt-1">
                  Files
                </span>
              </div>
            </>
          )}
        </div>

        {/* Proportional Breakdown Bars and Legend */}
        <div className="flex-1 w-full space-y-3">
          {slices.map((slice) => {
            const meta = formatMeta[slice.name] || {
              label: slice.name,
              bg: 'bg-[#F7F8FA]',
              text: 'text-[#858A99]',
              border: 'border-[#E9EAF0]',
              barColor: 'bg-[#858A99]',
            };

            return (
              <div key={slice.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-md border shrink-0 ${meta.bg} ${meta.text} ${meta.border}`}
                    >
                      {slice.name}
                    </span>
                    <span className="font-medium text-[#242633] text-xs">
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-semibold text-[#242633] text-xs">
                      {slice.value}
                    </span>
                    <span className="text-[11px] text-[#858A99]">
                      ({slice.percentage}%)
                    </span>
                  </div>
                </div>

                {/* Proportional Bar */}
                <div className="h-1.5 w-full bg-[#E9EAF0] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${meta.barColor} rounded-full transition-all duration-300`}
                    style={{ width: `${slice.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
