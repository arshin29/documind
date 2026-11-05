'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { UploadCloud, Layers } from 'lucide-react';
import { DocumentActivityPoint } from '@/lib/analytics';

interface DocumentActivityChartProps {
  data: DocumentActivityPoint[];
}

export function DocumentActivityChart({ data }: DocumentActivityChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalUploads = data.reduce((acc, curr) => acc + curr.uploads, 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-5 sm:p-6 flex flex-col justify-between h-[340px]">
      {/* Header with fixed height for alignment */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E9EAF0] shrink-0 h-11">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0 shadow-xs">
            <UploadCloud className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#242633] tracking-tight truncate">
              Document Activity
            </h2>
            <p className="text-xs text-[#858A99] mt-0.5 truncate">
              Upload frequency and cumulative volume
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F7F8FA] border border-[#E9EAF0] text-[#7185E8] shrink-0">
          {totalUploads} {totalUploads === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* Chart Canvas filling available vertical space */}
      <div className="w-full flex-1 min-h-[220px] pt-3 relative">
        {!mounted ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-[#858A99]">
            Loading chart...
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#858A99] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#858A99]" />
            </div>
            <p className="font-semibold text-[#242633]">No uploads recorded</p>
            <p className="text-[11px] text-[#858A99]">No documents were added during this selected timeframe.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -24, bottom: 2 }}
            >
              <defs>
                <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7185E8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7185E8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
                    const uploads = payload[0].value;
                    const cumulative = payload[0].payload.cumulative;
                    return (
                      <div className="bg-white border border-[#E9EAF0] rounded-xl shadow-card px-3.5 py-2.5 text-xs space-y-1.5 pointer-events-none">
                        <div className="text-[11px] font-semibold text-[#858A99] pb-1 border-b border-[#E9EAF0]">
                          {label}
                        </div>
                        <div className="text-xs font-medium text-[#242633] flex items-center justify-between gap-5">
                          <span className="text-[#858A99]">New Uploads:</span>
                          <span className="font-mono font-bold text-[#7185E8]">
                            {uploads}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#858A99] flex items-center justify-between gap-5 pt-0.5">
                          <span>Total Ingested:</span>
                          <span className="font-mono font-semibold text-[#242633]">
                            {cumulative}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="uploads"
                stroke="#7185E8"
                strokeWidth={2}
                fill="url(#uploadGradient)"
                dot={{ r: 3, fill: '#7185E8', strokeWidth: 1, stroke: '#FFFFFF' }}
                activeDot={{ r: 5, fill: '#7185E8', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
