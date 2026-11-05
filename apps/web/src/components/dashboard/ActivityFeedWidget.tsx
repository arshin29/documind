'use client';

import Link from 'next/link';
import { ArrowUpRight, Sparkles, HelpCircle, FileCheck, UploadCloud } from 'lucide-react';
import { ActivityItem } from '@/data/mock-data';

interface ActivityFeedWidgetProps {
  activities: ActivityItem[];
  onOpenWorkspace?: () => void;
}

export function ActivityFeedWidget({ activities }: ActivityFeedWidgetProps) {
  // Display top 4-5 activities for a balanced widget
  const displayActivities = activities.slice(0, 4);

  const getActivityVisual = (act: ActivityItem) => {
    switch (act.type) {
      case 'summary':
        return {
          icon: Sparkles,
          bg: 'bg-[#EEF0FF]',
          text: 'text-[#7185E8]',
          actor: 'AI Assistant',
          verb: 'generated summary for',
        };
      case 'qa':
        return {
          icon: HelpCircle,
          bg: 'bg-[#FEF7ED]',
          text: 'text-[#E6A13A]',
          actor: 'You',
          verb: 'asked question in',
        };
      case 'processed':
        return {
          icon: FileCheck,
          bg: 'bg-[#EDF8F2]',
          text: 'text-[#29A36A]',
          actor: 'DocuMind Engine',
          verb: 'indexed chunks for',
        };
      case 'upload':
      default:
        return {
          icon: UploadCloud,
          bg: 'bg-[#F4EEFB]',
          text: 'text-[#9A8AE8]',
          actor: 'You',
          verb: 'uploaded new document',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] p-5 shadow-card space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#242633] tracking-tight">
          Activity Feed
        </h2>
        <Link
          href="/workspace"
          className="w-7 h-7 rounded-lg bg-[#F7F8FA] border border-[#E9EAF0] hover:border-[#D8DAE5] flex items-center justify-center text-[#858A99] hover:text-[#242633] transition-all"
          title="Open AI Workspace history"
        >
          <ArrowUpRight className="w-4 h-4 stroke-[1.75]" />
        </Link>
      </div>

      {/* Grouping label: Today */}
      <div>
        <p className="text-[11px] font-semibold text-[#858A99] tracking-wider uppercase mb-3">
          Today
        </p>

        {/* Activity Items */}
        <div className="space-y-3.5">
          {displayActivities.map((act) => {
            const visual = getActivityVisual(act);
            const Icon = visual.icon;

            return (
              <div key={act.id} className="flex items-start gap-3 text-xs group">
                {/* Visual Avatar / Icon */}
                <div
                  className={`w-8 h-8 rounded-full ${visual.bg} ${visual.text} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-4 h-4 stroke-[1.75]" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 leading-snug">
                  <p className="text-[#242633]">
                    <span className="font-semibold text-[#242633]">
                      {visual.actor}
                    </span>{' '}
                    <span className="text-[#525666]">{visual.verb}</span>{' '}
                    <span className="font-medium text-[#242633] hover:text-[#7185E8] transition-colors cursor-pointer">
                      {act.target}
                    </span>
                  </p>
                  <span className="text-[11px] text-[#858A99] mt-1 block">
                    {act.timestamp}
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
