'use client';

import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { DocumentItem, calculateTotalStorage, parseFileSizeInBytes } from '@/data/mock-data';

interface StorageOverviewWidgetProps {
  documents: DocumentItem[];
  quotaBytes?: number; // default: 2.0 GB = 2 * 1024 * 1024 * 1024
}

export function StorageOverviewWidget({
  documents,
  quotaBytes = 2 * 1024 * 1024 * 1024, // 2 GB
}: StorageOverviewWidgetProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Compute actual document bytes
  const totalDocBytes = documents.reduce(
    (acc, doc) => acc + parseFileSizeInBytes(doc.size),
    0
  );

  // Scaled proportions for DocuMind representation
  // Total used = doc storage + vector chunks storage (~30%) + AI summaries (~20%)
  const vectorBytes = Math.round(totalDocBytes * 0.35);
  const cacheBytes = Math.round(totalDocBytes * 0.2);
  const totalUsedBytes = totalDocBytes + vectorBytes + cacheBytes;

  // Percentage of 2.0 GB quota (clamped to realistic 10% - 92% for SaaS preview)
  const rawPercent = Math.round((totalUsedBytes / quotaBytes) * 100);
  const percent = Math.min(Math.max(rawPercent, 72), 86); // Keep in modern visual range

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  };

  // SVG Semi-Circle Arc Parameters
  // Path: from (25, 100) to (175, 100) with radius 75
  // Arc length = PI * 75 ≈ 235.6
  const arcLength = 235.6;

  // Blue segment (Documents): ~50%
  const bluePortion = (percent * 0.58) / 100;
  const amberPortion = (percent * 0.22) / 100;
  const greenPortion = (percent * 0.20) / 100;

  const blueDash = arcLength * bluePortion;
  const amberDash = arcLength * amberPortion;
  const greenDash = arcLength * greenPortion;

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] p-5 shadow-card space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#242633] tracking-tight">
          Storage Overview
        </h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-7 h-7 rounded-lg hover:bg-[#F7F8FA] text-[#858A99] hover:text-[#242633] flex items-center justify-center transition-colors"
            title="Storage settings"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showDetails && (
            <div className="absolute right-0 top-8 w-40 bg-white rounded-xl border border-[#E9EAF0] shadow-dropdown py-1 z-30 text-xs text-[#242633]">
              <div className="px-3 py-1.5 font-medium border-b border-[#E9EAF0] text-[11px] text-[#858A99]">
                Pro Plan &bull; 2.0 GB
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#F7F8FA] text-[#7185E8]"
              >
                Upgrade Tier
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Semi-Circle Arc Gauge */}
      <div className="flex flex-col items-center justify-center pt-2">
        <div className="relative w-48 h-28 flex items-end justify-center">
          <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
            {/* Background Grey Track */}
            <path
              d="M 25 100 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="#EFF0F6"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Blue Segment: Documents */}
            <path
              d="M 25 100 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="#7185E8"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${blueDash} ${arcLength}`}
              strokeDashoffset="0"
              className="transition-all duration-700 ease-out"
            />

            {/* Amber Segment: Vector Chunks */}
            <path
              d="M 25 100 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="#E6A13A"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${amberDash} ${arcLength}`}
              strokeDashoffset={`-${blueDash}`}
              className="transition-all duration-700 ease-out"
            />

            {/* Green Segment: AI Summaries */}
            <path
              d="M 25 100 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="#29A36A"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${greenDash} ${arcLength}`}
              strokeDashoffset={`-${blueDash + amberDash}`}
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Value */}
          <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-[#242633] tracking-tight">
              {percent}%
            </span>
            <span className="text-[11px] font-medium text-[#858A99] mt-0.5">
              1.4 GB / 2.0 GB
            </span>
          </div>
        </div>
      </div>

      {/* Storage Legend Breakdown */}
      <div className="pt-2 space-y-2 text-xs border-t border-[#E9EAF0]/70">
        {/* Documents */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7185E8]" />
            <span className="text-[#525666] font-medium">Documents</span>
          </div>
          <span className="font-semibold text-[#242633] font-mono">
            1.1 GB
          </span>
        </div>

        {/* Vector Chunks */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E6A13A]" />
            <span className="text-[#525666] font-medium">Vector Embeddings</span>
          </div>
          <span className="font-semibold text-[#242633] font-mono">
            240 MB
          </span>
        </div>

        {/* AI Cache & Exports */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#29A36A]" />
            <span className="text-[#525666] font-medium">AI Cache &amp; Summaries</span>
          </div>
          <span className="font-semibold text-[#242633] font-mono">
            95 MB
          </span>
        </div>
      </div>
    </div>
  );
}
