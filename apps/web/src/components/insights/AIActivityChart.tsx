'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Sparkles, Bot } from 'lucide-react';
import { AIActivitySummary } from '@/lib/analytics';

interface AIActivityChartProps {
  summary: AIActivitySummary;
}

export function AIActivityChart({ summary }: AIActivityChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { points, totalQuestions, avgQuestionsPerConversation } = summary;

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-5 sm:p-6 flex flex-col justify-between h-[340px]">
      {/* Header with fixed height matching DocumentActivityChart */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E9EAF0] shrink-0 h-11">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#242633] tracking-tight truncate">
              AI Query Activity
            </h2>
            <p className="text-xs text-[#858A99] mt-0.5 truncate">
              Questions asked &bull; Avg {avgQuestionsPerConversation}/thread
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EEF0FF] border border-[#E0E4FA] text-[#7185E8] shrink-0">
          {totalQuestions} {totalQuestions === 1 ? 'query' : 'queries'}
        </span>
      </div>

      {/* Bar Chart Canvas taking up the full available vertical space */}
      <div className="w-full flex-1 min-h-[220px] pt-3 relative">
        {!mounted ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-[#858A99]">
            Loading query data...
          </div>
        ) : points.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#858A99] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#858A99]" />
            </div>
            <p className="font-semibold text-[#242633]">No queries logged</p>
            <p className="text-[11px] text-[#858A99]">Start a conversation in AI Workspace to see query activity.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              margin={{ top: 10, right: 10, left: -24, bottom: 2 }}
            >
              <CartesianGrid
                stroke="#E9EAF0"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: '#E9EAF0' }}
                tick={{ fill: '#858A99', fontSize: 11 }}
                dy={6}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#858A99', fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const count = payload[0].value;
                    return (
                      <div className="bg-white border border-[#E9EAF0] rounded-xl shadow-card px-3.5 py-2.5 text-xs space-y-1 pointer-events-none">
                        <div className="text-[11px] font-semibold text-[#858A99] pb-1 border-b border-[#E9EAF0]">
                          {label}
                        </div>
                        <div className="text-xs font-medium text-[#242633] flex items-center justify-between gap-5 pt-0.5">
                          <span className="text-[#858A99]">Questions:</span>
                          <span className="font-mono font-bold text-[#7185E8]">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="questions"
                fill="#7185E8"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
