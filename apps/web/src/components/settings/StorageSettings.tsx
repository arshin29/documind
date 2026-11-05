'use client';

import React from 'react';
import { HardDrive, FileText, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';
import { calculateStorageAnalytics } from '@/lib/storage-utils';

interface StorageSettingsProps {
  documents: DocumentItem[];
  onOpenDocument?: (doc: DocumentItem) => void;
}

export function StorageSettings({ documents, onOpenDocument }: StorageSettingsProps) {
  const analytics = calculateStorageAnalytics(documents);

  const typeMeta: Record<string, { color: string; bg: string; text: string; border: string }> = {
    PDF: {
      color: '#7185E8',
      bg: 'bg-[#EEF0FF]',
      text: 'text-[#7185E8]',
      border: 'border-[#E0E4FA]',
    },
    DOCX: {
      color: '#29A36A',
      bg: 'bg-[#EDF8F2]',
      text: 'text-[#29A36A]',
      border: 'border-[#D4EEDB]',
    },
    TXT: {
      color: '#E6A13A',
      bg: 'bg-[#FEF7ED]',
      text: 'text-[#E6A13A]',
      border: 'border-[#FCE7D0]',
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E9EAF0]">
        <div>
          <h2 className="text-base font-bold text-[#242633] tracking-tight">
            Storage & Quota
          </h2>
          <p className="text-xs text-[#858A99] mt-0.5">
            Capacity utilization, tier allocation limits and document storage breakdown.
          </p>
        </div>
        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EEF0FF] border border-[#E0E4FA] text-[#7185E8] self-start sm:self-auto">
          Pro Tier (2.0 GB Quota)
        </span>
      </div>

      {/* Metrics Row: 4 Equal Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] space-y-1">
          <p className="text-xs font-semibold text-[#858A99]">Used Storage</p>
          <p className="text-xl font-mono font-bold text-[#242633]">{analytics.formattedTotalUsed}</p>
          <p className="text-[10px] text-[#858A99] font-medium">Across active files</p>
        </div>

        <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] space-y-1">
          <p className="text-xs font-semibold text-[#858A99]">Remaining Space</p>
          <p className="text-xl font-mono font-bold text-[#29A36A]">{analytics.formattedRemaining}</p>
          <p className="text-[10px] text-[#858A99] font-medium">Available to upload</p>
        </div>

        <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] space-y-1">
          <p className="text-xs font-semibold text-[#858A99]">Quota Utilized</p>
          <p className="text-xl font-mono font-bold text-[#7185E8]">{analytics.usagePercentage}%</p>
          <p className="text-[10px] text-[#858A99] font-medium">Of 2.0 GB allocation</p>
        </div>

        <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] space-y-1">
          <p className="text-xs font-semibold text-[#858A99]">Indexed Documents</p>
          <p className="text-xl font-mono font-bold text-[#242633]">{analytics.totalDocuments}</p>
          <p className="text-[10px] text-[#858A99] font-medium">Ready for AI Q&amp;A</p>
        </div>
      </div>

      {/* Attractive Segmented Storage Visualization */}
      <div className="space-y-3 p-5 rounded-2xl bg-[#F7F8FA] border border-[#E9EAF0]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#242633]">Capacity Utilization</span>
          <span className="font-mono text-xs text-[#858A99]">
            <strong className="text-[#242633] font-semibold">{analytics.formattedTotalUsed}</strong> of {analytics.formattedLimit}
          </span>
        </div>

        {/* Multi-segment progress bar */}
        <div className="w-full bg-[#E9EAF0] h-3.5 rounded-full overflow-hidden flex shadow-xs p-0.5">
          {analytics.totalBytes > 0 ? (
            analytics.typeBreakdown.map((item) => {
              const widthPercent = (item.totalBytes / analytics.limitBytes) * 100;
              if (widthPercent <= 0) return null;
              const meta = typeMeta[item.type] || { color: '#7185E8' };
              return (
                <div
                  key={item.type}
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(widthPercent, 1)}%`,
                    backgroundColor: meta.color,
                  }}
                  title={`${item.type}: ${item.formattedSize}`}
                />
              );
            })
          ) : (
            <div className="h-full w-0" />
          )}
        </div>

        {/* Segment Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
          {analytics.typeBreakdown.map((item) => {
            const meta = typeMeta[item.type] || { color: '#7185E8' };
            return (
              <div key={item.type} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="font-medium text-[#242633]">{item.type}</span>
                <span className="font-mono text-[11px] text-[#858A99]">{item.formattedSize}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Breakdown by Format */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-[#242633]">Document Format Breakdown</h3>
        <div className="divide-y divide-[#E9EAF0]">
          {analytics.typeBreakdown.map((item) => {
            const meta = typeMeta[item.type] || {
              color: '#7185E8',
              bg: 'bg-[#F7F8FA]',
              text: 'text-[#858A99]',
              border: 'border-[#E9EAF0]',
            };

            const percentageOfUsed =
              analytics.totalBytes > 0
                ? Math.round((item.totalBytes / analytics.totalBytes) * 100)
                : 0;

            return (
              <div key={item.type} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.bg} ${meta.text} ${meta.border}`}
                  >
                    {item.type}
                  </span>
                  <div>
                    <span className="font-semibold text-[#242633] block">
                      {item.type === 'PDF'
                        ? 'Portable Document Format'
                        : item.type === 'DOCX'
                        ? 'Microsoft Word Document'
                        : 'Plain Text File'}
                    </span>
                    <span className="text-[11px] text-[#858A99]">
                      {item.count} {item.count === 1 ? 'file' : 'files'} indexed
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-semibold text-xs text-[#242633] block">
                    {item.formattedSize}
                  </span>
                  <span className="font-mono text-[11px] text-[#858A99]">
                    {percentageOfUsed}% of volume
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
