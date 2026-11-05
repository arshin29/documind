'use client';

import { FileText, CheckCircle2, Sparkles, MessagesSquare, HardDrive } from 'lucide-react';
import { AnalyticsStatsData } from '@/lib/analytics';

interface AnalyticsStatsProps {
  stats: AnalyticsStatsData;
}

export function AnalyticsStats({ stats }: AnalyticsStatsProps) {
  const readyRate =
    stats.totalDocuments > 0
      ? Math.round((stats.processedDocuments / stats.totalDocuments) * 100)
      : 100;

  const cards = [
    {
      label: 'Total Documents',
      value: stats.totalDocuments,
      subtext: `${stats.processedDocuments} active in library`,
      icon: FileText,
      iconBg: 'bg-[#EEF0FF] text-[#7185E8]',
      colClass: 'col-span-1 md:col-span-2 lg:col-span-1',
    },
    {
      label: 'Processed Documents',
      value: stats.processedDocuments,
      subtext: `${readyRate}% completion rate`,
      icon: CheckCircle2,
      iconBg: 'bg-[#EDF8F2] text-[#29A36A]',
      colClass: 'col-span-1 md:col-span-2 lg:col-span-1',
    },
    {
      label: 'AI Queries',
      value: stats.questionsAnswered,
      subtext: 'Grounded citation responses',
      icon: Sparkles,
      iconBg: 'bg-[#EEF0FF] text-[#7185E8]',
      colClass: 'col-span-1 md:col-span-2 lg:col-span-1',
    },
    {
      label: 'Conversations',
      value: stats.totalConversations,
      subtext: 'Interactive query threads',
      icon: MessagesSquare,
      iconBg: 'bg-[#EEF0FF] text-[#7185E8]',
      colClass: 'col-span-1 md:col-span-3 lg:col-span-1',
    },
    {
      label: 'Storage Used',
      value: stats.storageUsed,
      subtext: '2.0 GB quota allocation',
      icon: HardDrive,
      iconBg: 'bg-[#FEF7ED] text-[#E6A13A]',
      colClass: 'col-span-2 md:col-span-3 lg:col-span-1',
    },
  ];

  return (
    <section aria-label="Analytics summary metrics" className="w-full">
      {/* 
        Responsive Grid Strategy:
        - Desktop (lg:): 5 equal columns in 1 single horizontal row
        - Tablet (md:): 6-column base grid where Row 1 has 3 items (span-2 each), Row 2 has 2 items (span-3 each)
        - Mobile: 2-column grid where items 1-4 take 1 column, item 5 spans 2 columns
      */}
      <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-5 gap-3.5 sm:gap-4 w-full">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-white rounded-2xl border border-[#E9EAF0] p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between h-full min-h-[110px] ${card.colClass}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#858A99] truncate">
                  {card.label}
                </span>
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${card.iconBg}`}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[2]" />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-2xl font-bold font-mono text-[#242633] tracking-tight">
                  {card.value}
                </p>
                <p className="text-[11px] text-[#858A99] mt-1 font-medium truncate">
                  {card.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
