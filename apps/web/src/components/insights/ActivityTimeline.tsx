'use client';

import { ActivityItem } from '@/data/mock-data';
import { Clock, UploadCloud, CheckCircle2, Sparkles, FileText } from 'lucide-react';

interface ActivityTimelineProps {
  activities: ActivityItem[];
  onSelectDocumentTitle?: (title: string) => void;
}

export function ActivityTimeline({
  activities,
  onSelectDocumentTitle,
}: ActivityTimelineProps) {
  const getActivityIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('uploaded')) {
      return {
        icon: UploadCloud,
        bg: 'bg-[#EEF0FF] text-[#7185E8]',
      };
    }
    if (act.includes('processed') || act.includes('completed') || act.includes('ready')) {
      return {
        icon: CheckCircle2,
        bg: 'bg-[#EDF8F2] text-[#29A36A]',
      };
    }
    if (act.includes('question') || act.includes('queried') || act.includes('asked')) {
      return {
        icon: Sparkles,
        bg: 'bg-[#EEF0FF] text-[#7185E8]',
      };
    }
    return {
      icon: FileText,
      bg: 'bg-[#F7F8FA] text-[#858A99]',
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-5 sm:p-6 w-full space-y-4">
      {/* Header aligned with other sections */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E9EAF0] h-11">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#242633] tracking-tight truncate">
              Recent Activity
            </h2>
            <p className="text-xs text-[#858A99] mt-0.5 truncate">
              Chronological log of document events and AI inquiries
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F7F8FA] border border-[#E9EAF0] text-[#7185E8] shrink-0">
          {activities.length} {activities.length === 1 ? 'event' : 'events'} recorded
        </span>
      </div>

      {/* Feed List: 2-column balanced grid on desktop, single column on mobile */}
      {activities.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#858A99] space-y-2">
          <div className="w-9 h-9 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] flex items-center justify-center mx-auto">
            <Clock className="w-4 h-4 text-[#858A99]" />
          </div>
          <p className="font-semibold text-[#242633]">No activity logged</p>
          <p className="text-[11px] text-[#858A99]">No events were recorded within this selected timeframe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activities.slice(0, 8).map((item) => {
            const meta = getActivityIcon(item.action);
            const Icon = meta.icon;

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#F7F8FA]/70 border border-[#E9EAF0] flex items-center justify-between gap-3 text-xs hover:bg-[#F7F8FA] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${meta.bg}`}
                  >
                    <Icon className="w-3.5 h-3.5 stroke-[2]" />
                  </div>

                  <div className="min-w-0 flex-1 truncate">
                    <span className="text-[#858A99] font-normal">{item.action}</span>{' '}
                    {onSelectDocumentTitle && item.target ? (
                      <button
                        type="button"
                        onClick={() => onSelectDocumentTitle(item.target)}
                        className="font-semibold text-[#242633] hover:text-[#7185E8] transition-colors truncate text-left cursor-pointer inline"
                      >
                        {item.target}
                      </button>
                    ) : (
                      <span className="font-semibold text-[#242633] truncate">
                        {item.target}
                      </span>
                    )}
                  </div>
                </div>

                <span className="font-mono text-[10px] text-[#858A99] shrink-0 font-medium bg-white px-2 py-0.5 rounded-md border border-[#E9EAF0]">
                  {item.timestamp}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
