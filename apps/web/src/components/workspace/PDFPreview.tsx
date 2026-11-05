'use client';

import { useMemo } from 'react';
import { DocumentItem } from '@/data/mock-data';
import { ShieldCheck, Bookmark, Sparkles, FileText } from 'lucide-react';

interface PDFPreviewProps {
  document: DocumentItem;
  currentPage: number;
  zoom: number; // percentage e.g. 75, 100, 125
  highlightSection?: string | null;
}

export function PDFPreview({
  document,
  currentPage,
  zoom,
}: PDFPreviewProps) {
  const totalPages = document.pages || 10;

  // Generate realistic, document-grounded content based on currentPage
  const pageContent = useMemo(() => {
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;

    if (isFirstPage) {
      return {
        sectionTitle: 'Executive Overview & Ingestion Abstract',
        pageNumber: 1,
        content: (
          <div className="space-y-4 text-[#242633]">
            {/* Document Header Banner */}
            <div className="border-b border-[#E9EAF0] pb-4 mb-4">
              <div className="flex items-center justify-between text-[10px] text-[#858A99] mb-2 font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5 font-semibold text-[#7185E8]">
                  <FileText className="w-3.5 h-3.5" />
                  DocuMind Semantic Ledger
                </span>
                <span>Ref: {document.id.toUpperCase()}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#242633] tracking-tight">
                {document.title}
              </h1>
              <p className="text-xs text-[#858A99] mt-1">
                Author: {document.author || 'Designated Lead'} &bull; Indexed: {document.dateAdded}
              </p>
            </div>

            {/* Document Summary Abstract */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#7185E8] uppercase tracking-wider">
                <Bookmark className="w-3 h-3 text-[#7185E8]" />
                <span>Executive Summary Abstract</span>
              </div>
              <p className="text-xs text-[#525666] leading-relaxed">
                {document.summary}
              </p>
            </div>

            {/* Ingestion Parameters Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 text-[10px]">
              <div className="p-3 rounded-xl bg-white border border-[#E9EAF0] shadow-xs">
                <span className="text-[#858A99] block font-medium">File Size</span>
                <span className="font-mono font-semibold text-xs text-[#242633] mt-0.5 block">{document.size}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E9EAF0] shadow-xs">
                <span className="text-[#858A99] block font-medium">Indexed Pages</span>
                <span className="font-mono font-semibold text-xs text-[#242633] mt-0.5 block">{totalPages} Pages</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E9EAF0] shadow-xs">
                <span className="text-[#858A99] block font-medium">Vector Chunks</span>
                <span className="font-mono font-semibold text-xs text-[#7185E8] mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {document.chunksCount}
                </span>
              </div>
            </div>

            {/* Taxonomy Breakdown */}
            <div className="pt-2 space-y-2">
              <h4 className="text-[10px] font-semibold text-[#858A99] uppercase tracking-wider">
                Indexed Semantic Taxonomy
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {document.keyTopics.map((topic) => (
                  <span
                    key={topic}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F7F8FA] border border-[#E9EAF0] text-[#525666]"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Document Scope Disclaimer */}
            <div className="mt-4 pt-3 border-t border-[#E9EAF0] flex items-center justify-between text-[10px] text-[#858A99] font-mono">
              <span>Verified through OCR semantic pipeline</span>
              <span className="flex items-center gap-1 text-[#29A36A] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Integrity Verified</span>
              </span>
            </div>
          </div>
        ),
      };
    }

    if (isLastPage) {
      return {
        sectionTitle: `Section ${Math.min(5, Math.ceil(currentPage / 2))}: Conclusions & Appendix`,
        pageNumber: currentPage,
        content: (
          <div className="space-y-4 text-[#242633]">
            <div className="border-b border-[#E9EAF0] pb-3">
              <span className="text-[10px] font-mono text-[#858A99] uppercase">
                Appendix &amp; Final Sign-off
              </span>
              <h2 className="text-sm font-semibold text-[#242633] mt-1">
                Executive Synthesis &amp; Recommendations
              </h2>
            </div>

            <p className="text-xs text-[#525666] leading-relaxed">
              In accordance with findings across previous chapters, the strategic alignment of{' '}
              <strong className="text-[#242633]">{document.keyTopics[0]}</strong> remains intact. Operational risk assessments
              suggest low standard variance for planned deliverables over the coming quarters.
            </p>

            <div className="p-3.5 rounded-xl border border-[#E9EAF0] bg-[#F7F8FA] space-y-2 text-xs">
              <h3 className="font-semibold text-[#242633] text-xs">
                Audit Trail &amp; Verification
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-[#858A99] text-[11px]">
                <li>Initial document ingested: {document.dateAdded}</li>
                <li>Extracted chunks: {document.chunksCount} tokenized records</li>
                <li>Primary classification: {document.type} specification standard</li>
              </ul>
            </div>
          </div>
        ),
      };
    }

    // Intermediate Pages
    return {
      sectionTitle: `Section ${Math.min(4, Math.ceil(currentPage / 3))}: Deep Analysis & Observations`,
      pageNumber: currentPage,
      content: (
        <div className="space-y-4 text-[#242633]">
          <div className="border-b border-[#E9EAF0] pb-3">
            <span className="text-[10px] font-mono text-[#7185E8] font-semibold uppercase tracking-wider">
              {document.keyTopics[(currentPage - 1) % document.keyTopics.length] || 'Key Topic Review'}
            </span>
            <h2 className="text-sm font-semibold text-[#242633] mt-1">
              Structured Section Analysis &amp; Data Tables
            </h2>
          </div>

          <p className="text-xs text-[#525666] leading-relaxed">
            Observations recorded on page {currentPage} illustrate sustained progress toward
            milestones noted by <strong className="text-[#242633]">{document.author || 'the document lead'}</strong>. Critical
            measurements emphasize consistency across data pipelines and operational frameworks.
          </p>

          {/* Sample Data Table for realistic feel */}
          <div className="rounded-xl border border-[#E9EAF0] overflow-hidden my-3 shadow-xs">
            <div className="bg-[#FAFAFC] px-3.5 py-2 border-b border-[#E9EAF0] text-[11px] font-semibold text-[#242633]">
              Metrics Summary Table — Page {currentPage}
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFC]/70 text-[#858A99] border-b border-[#E9EAF0] text-[11px]">
                <tr>
                  <th className="py-2 px-3 font-medium">Indicator</th>
                  <th className="py-2 px-3 font-medium">Baseline</th>
                  <th className="py-2 px-3 font-medium">Current</th>
                  <th className="py-2 px-3 font-medium">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EAF0]/70">
                <tr className="hover:bg-[#F7F8FA]">
                  <td className="py-2 px-3 text-[#242633] font-medium">Primary Goal</td>
                  <td className="py-2 px-3 text-[#858A99] font-mono">100%</td>
                  <td className="py-2 px-3 text-[#242633] font-mono font-semibold">104.2%</td>
                  <td className="py-2 px-3 text-[#29A36A] font-mono font-semibold">+4.2%</td>
                </tr>
                <tr className="bg-[#FAFAFC]/40 hover:bg-[#F7F8FA]">
                  <td className="py-2 px-3 text-[#242633] font-medium">Throughput</td>
                  <td className="py-2 px-3 text-[#858A99] font-mono">98.0%</td>
                  <td className="py-2 px-3 text-[#242633] font-mono font-semibold">99.7%</td>
                  <td className="py-2 px-3 text-[#29A36A] font-mono font-semibold">+1.7%</td>
                </tr>
                <tr className="hover:bg-[#F7F8FA]">
                  <td className="py-2 px-3 text-[#242633] font-medium">Error Rate</td>
                  <td className="py-2 px-3 text-[#858A99] font-mono">&lt; 0.5%</td>
                  <td className="py-2 px-3 text-[#242633] font-mono font-semibold">0.08%</td>
                  <td className="py-2 px-3 text-[#29A36A] font-mono font-semibold">-0.42%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[#525666] leading-relaxed">
            Cross-tabulation with historical reference values confirms strong correlation with
            forecasted growth patterns. Continued monitoring is recommended for subsequent reviews.
          </p>
        </div>
      ),
    };
  }, [currentPage, totalPages, document]);

  const scale = zoom / 100;

  return (
    <div className="w-full flex justify-center py-4 px-2 overflow-auto">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease-out',
        }}
        className="w-full max-w-[580px] min-h-[700px] bg-white rounded-xl border border-[#DDE1EB] shadow-[0_2px_12px_rgba(36,38,51,0.08),0_1px_3px_rgba(36,38,51,0.06)] flex flex-col justify-between p-6 md:p-8 select-text relative ring-1 ring-black/[0.02]"
      >
        {/* Top Running Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DDE1EB] text-[10px] text-[#858A99] font-mono">
          <span className="truncate max-w-[280px]">{document.title}</span>
          <span className="font-semibold text-[#7185E8] bg-[#EEF0FF] px-2 py-0.5 rounded-md border border-[#E0E4FA]">
            PAGE {currentPage} OF {totalPages}
          </span>
        </div>

        {/* Dynamic Page Body */}
        <div className="flex-1 py-4">
          {pageContent.content}
        </div>

        {/* Bottom Running Footer */}
        <div className="pt-3 border-t border-[#DDE1EB] flex items-center justify-between text-[10px] text-[#858A99] font-mono">
          <span>DOCUMIND INTELLIGENCE</span>
          <span>CONFIDENTIAL &bull; INTERNAL</span>
        </div>
      </div>
    </div>
  );
}

