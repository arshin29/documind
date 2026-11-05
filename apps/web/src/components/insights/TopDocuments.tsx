'use client';

import { TopDocumentItem } from '@/lib/analytics';
import { ArrowUpRight, Award, FileText } from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';

interface TopDocumentsProps {
  documents: TopDocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
}

export function TopDocuments({ documents, onSelectDocument }: TopDocumentsProps) {
  const getFormatBadge = (type: TopDocumentItem['type']) => {
    switch (type) {
      case 'PDF':
        return 'text-[#7185E8] bg-[#EEF0FF] border-[#E0E4FA]';
      case 'DOCX':
        return 'text-[#29A36A] bg-[#EDF8F2] border-[#D4EEDB]';
      case 'TXT':
        return 'text-[#E6A13A] bg-[#FEF7ED] border-[#FCE7D0]';
      default:
        return 'text-[#858A99] bg-[#F7F8FA] border-[#E9EAF0]';
    }
  };

  // Max questions among documents for visual engagement bar calculation
  const maxQuestions = Math.max(...documents.map((d) => d.questionsCount), 1);

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-5 sm:p-6 flex flex-col justify-between h-[380px]">
      {/* Header with fixed height matching DocumentTypeChart */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E9EAF0] shrink-0 h-11">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#242633] tracking-tight truncate">
              Top Documents
            </h2>
            <p className="text-xs text-[#858A99] mt-0.5 truncate">
              Ranked by AI question volume and inquiry threads
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F7F8FA] border border-[#E9EAF0] text-[#7185E8] shrink-0">
          Ranked by Usage
        </span>
      </div>

      {/* List or Empty State */}
      <div className="flex-1 overflow-hidden py-1 flex flex-col justify-around">
        {documents.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#858A99] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] flex items-center justify-center mx-auto">
              <FileText className="w-4 h-4 text-[#858A99]" />
            </div>
            <p className="font-semibold text-[#242633]">No document activity found</p>
            <p className="text-[11px] text-[#858A99]">No interactions were recorded for this selected date range.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E9EAF0] flex flex-col justify-around h-full">
            {documents.slice(0, 4).map((item, idx) => {
              const engagementPct = Math.round((item.questionsCount / maxQuestions) * 100);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectDocument(item.doc)}
                  className="py-2.5 flex items-center justify-between gap-3 group cursor-pointer hover:bg-[#F7F8FA]/60 rounded-xl px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-mono text-xs font-bold text-[#858A99] group-hover:text-[#7185E8] w-5 text-center shrink-0">
                      0{idx + 1}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="font-semibold text-xs text-[#242633] group-hover:text-[#7185E8] transition-colors truncate"
                          title={item.title}
                        >
                          {item.title}
                        </p>
                        <span
                          className={`font-mono text-[9px] font-semibold px-1.5 py-0.2 rounded-md border shrink-0 ${getFormatBadge(
                            item.type
                          )}`}
                        >
                          {item.type}
                        </span>
                      </div>

                      {/* Visual Engagement Indicator */}
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-[#E9EAF0] rounded-full overflow-hidden shrink-0">
                          <div
                            className="h-full bg-[#7185E8] rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(8, engagementPct)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#858A99] font-mono">
                          {item.conversationsCount} {item.conversationsCount === 1 ? 'thread' : 'threads'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Jump Button */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-[#242633] block">
                        {item.questionsCount}
                      </span>
                      <span className="text-[10px] text-[#858A99] block font-medium">
                        questions
                      </span>
                    </div>

                    <div className="w-6 h-6 rounded-lg text-[#858A99] group-hover:text-[#7185E8] group-hover:bg-[#EEF0FF] flex items-center justify-center transition-all">
                      <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
