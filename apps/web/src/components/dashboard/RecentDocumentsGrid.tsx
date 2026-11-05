'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';

interface RecentDocumentsGridProps {
  documents: DocumentItem[];
  onOpenDrawer: (doc: DocumentItem) => void;
  maxDisplay?: number;
}

// Helpers for stylish visual document preview cards matching Inkwise aesthetics
function getCategoryForDoc(doc: DocumentItem): { label: string; bg: string; text: string } {
  const title = doc.title.toLowerCase();
  if (title.includes('report') || title.includes('annual')) {
    return { label: 'Product', bg: 'bg-[#EDF8F2]', text: 'text-[#29A36A]' };
  }
  if (title.includes('research') || title.includes('user')) {
    return { label: 'Research', bg: 'bg-[#EEF0FF]', text: 'text-[#7185E8]' };
  }
  if (title.includes('market') || title.includes('growth')) {
    return { label: 'Marketing', bg: 'bg-[#FEF7ED]', text: 'text-[#E6A13A]' };
  }
  if (title.includes('financial') || title.includes('earning')) {
    return { label: 'Operations', bg: 'bg-[#F4EEFB]', text: 'text-[#9A8AE8]' };
  }
  if (title.includes('legal') || title.includes('nda')) {
    return { label: 'Legal', bg: 'bg-[#EDF5FD]', text: 'text-[#4A88D9]' };
  }
  return { label: 'Document', bg: 'bg-[#F7F8FA]', text: 'text-[#858A99]' };
}

function getAvatarForAuthor(author?: string): { initials: string; bg: string } {
  if (!author) return { initials: 'U', bg: 'bg-[#7185E8]' };
  if (author.includes('Finance')) return { initials: 'FT', bg: 'bg-[#29A36A]' };
  if (author.includes('UX') || author.includes('Product')) return { initials: 'PR', bg: 'bg-[#7185E8]' };
  if (author.includes('Marketing') || author.includes('Growth')) return { initials: 'MK', bg: 'bg-[#E6A13A]' };
  if (author.includes('Legal')) return { initials: 'LC', bg: 'bg-[#9A8AE8]' };
  return { initials: 'U', bg: 'bg-[#7185E8]' };
}

export function RecentDocumentsGrid({
  documents,
  onOpenDrawer,
  maxDisplay = 4,
}: RecentDocumentsGridProps) {
  const displayDocs = documents.slice(0, maxDisplay);

  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#242633] tracking-tight">
          Recent Documents
        </h2>
        <Link
          href="/documents"
          className="w-7 h-7 rounded-lg bg-white border border-[#E9EAF0] hover:border-[#D8DAE5] flex items-center justify-center text-[#858A99] hover:text-[#242633] shadow-subtle transition-all"
          title="View all documents"
        >
          <ArrowUpRight className="w-4 h-4 stroke-[1.75]" />
        </Link>
      </div>

      {/* 4 Visual Document Preview Cards Grid or Empty State */}
      {displayDocs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9EAF0] p-6 text-center shadow-card">
          <p className="text-xs text-[#858A99]">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {displayDocs.map((doc, idx) => {
            const category = getCategoryForDoc(doc);
            const author = getAvatarForAuthor(doc.author);
            const displayTitle = doc.title.replace(/\.[^/.]+$/, '');

            return (
              <div
                key={doc.id}
                onClick={() => onOpenDrawer(doc)}
                className="group bg-white rounded-2xl border border-[#E9EAF0] p-3 shadow-subtle hover:shadow-card hover:border-[#D8DAE5] transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                {/* Document Visual Preview Canvas */}
                <div className="w-full h-28 bg-[#F7F8FA] rounded-xl border border-[#EFF0F6] p-2.5 flex flex-col justify-between overflow-hidden relative group-hover:bg-[#F2F4FA] transition-colors">
                  {/* Category Pill */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${category.bg} ${category.text}`}
                    >
                      {category.label}
                    </span>
                    <span className="text-[10px] font-mono text-[#A2A7B5]">
                      {doc.type}
                    </span>
                  </div>

                  {/* Simulated Document Layout Graphics */}
                  <div className="space-y-1.5 py-1">
                    {/* Document miniature headline */}
                    <div className="w-3/4 h-1.5 rounded-full bg-[#D8DAE5]" />
                    {/* Miniature text lines */}
                    <div className="w-full h-1 rounded-full bg-[#E9EAF0]" />
                    <div className="w-5/6 h-1 rounded-full bg-[#E9EAF0]" />
                    <div className="w-2/3 h-1 rounded-full bg-[#E9EAF0]" />

                    {/* Visual accent element based on index */}
                    {idx % 2 === 0 ? (
                      <div className="pt-1 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-xs bg-[#7185E8]/30" />
                        <div className="w-1/2 h-1 rounded-full bg-[#7185E8]/20" />
                      </div>
                    ) : (
                      <div className="pt-1 flex items-center gap-1.5">
                        <div className="w-4 h-1.5 rounded-xs bg-[#9A8AE8]/30" />
                        <div className="w-4 h-1.5 rounded-xs bg-[#9A8AE8]/20" />
                        <div className="w-4 h-1.5 rounded-xs bg-[#9A8AE8]/10" />
                      </div>
                    )}
                  </div>

                  {/* Subtle bottom fade */}
                  <div className="w-full flex items-center justify-between text-[9px] text-[#A2A7B5] border-t border-[#E9EAF0]/50 pt-1">
                    <span>{doc.pages || 1} pages</span>
                    <span>{doc.chunksCount} chunks</span>
                  </div>
                </div>

                {/* Title & Metadata */}
                <div className="pt-3">
                  <h3
                    className="font-semibold text-xs text-[#242633] truncate group-hover:text-[#7185E8] transition-colors"
                    title={doc.title}
                  >
                    {displayTitle}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#858A99]">
                    <div
                      className={`w-4 h-4 rounded-full ${author.bg} text-white flex items-center justify-center text-[8px] font-semibold shrink-0`}
                    >
                      {author.initials}
                    </div>
                    <span className="truncate">
                      {doc.author || 'You'}
                    </span>
                    <span>&bull;</span>
                    <span className="truncate">{doc.dateAdded}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
