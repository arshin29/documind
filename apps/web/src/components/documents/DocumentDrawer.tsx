'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Sparkles,
  Download,
  Calendar,
  Layers,
  User,
  Copy,
  FileText,
  Loader2,
  FileCode,
} from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';
import { triggerDocumentDownload } from '@/lib/documents';
import { getDocumentContentApi, ApiDocumentContent } from '@/lib/api';

interface DocumentDrawerProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export function DocumentDrawer({ document, onClose }: DocumentDrawerProps) {
  const router = useRouter();
  const [contentData, setContentData] = useState<ApiDocumentContent | null>(
    null,
  );
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (document?.id && !document.id.startsWith('mock-')) {
      setLoadingContent(true);
      getDocumentContentApi(document.id)
        .then((data) => setContentData(data))
        .catch(() => setContentData(null))
        .finally(() => setLoadingContent(false));
    } else {
      setContentData(null);
    }
  }, [document?.id]);

  if (!document) return null;

  const handleOpenWorkspace = () => {
    router.push(`/workspace?doc=${document.id}`);
    onClose();
  };

  const getStatusBadge = (status: DocumentItem['status']) => {
    switch (status) {
      case 'Ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EDF8F2] text-[#29A36A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#29A36A]" />
            Ready
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EEF0FF] text-[#7185E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7185E8] animate-pulse" />
            Processing
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF7ED] text-[#E6A13A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E6A13A]" />
            Failed
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#242633]/20 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#E9EAF0] shadow-floating flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div>
            {/* Header */}
            <div className="h-14 px-6 border-b border-[#E9EAF0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center">
                  <FileText className="w-4 h-4 stroke-[1.75]" />
                </div>
                <span className="font-mono text-xs text-[#858A99] font-medium">
                  {document.type} &bull; {document.size}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg hover:bg-[#F7F8FA] text-[#858A99] hover:text-[#242633] inline-flex items-center justify-center transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Details Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
              {/* Title & Author */}
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-[#242633] leading-snug">
                  {document.title}
                </h2>
                {document.author && (
                  <p className="text-xs text-[#858A99] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>{document.author}</span>
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleOpenWorkspace}
                  disabled={document.status !== 'Ready'}
                  className="flex-1 flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-white text-xs font-semibold shadow-subtle shadow-[#7185E8]/25 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Open in AI Workspace</span>
                </button>
                <button
                  onClick={() => triggerDocumentDownload(document)}
                  className="h-9 px-3 rounded-xl border border-[#E9EAF0] hover:border-[#D8DAE5] bg-white text-[#858A99] hover:text-[#242633] shadow-subtle transition-all"
                  title="Download File Metadata"
                >
                  <Download className="w-4 h-4 stroke-[1.75]" />
                </button>
              </div>

              {/* Metadata Cards Grid */}
              <div className="grid grid-cols-2 gap-3 py-4 border-y border-[#E9EAF0] text-xs">
                <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#EFF0F6]">
                  <span className="text-[#858A99] text-[11px] block font-medium">
                    Date Added
                  </span>
                  <span className="text-[#242633] font-semibold mt-1 flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-[#858A99] stroke-[1.75]" />
                    {document.dateAdded}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#EFF0F6]">
                  <span className="text-[#858A99] text-[11px] block font-medium">
                    Status
                  </span>
                  <div className="mt-1">{getStatusBadge(document.status)}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#EFF0F6]">
                  <span className="text-[#858A99] text-[11px] block font-medium">
                    Pages
                  </span>
                  <span className="text-[#242633] font-semibold mt-1 block font-mono">
                    {document.pages ?? 'N/A'} pages
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#EFF0F6]">
                  <span className="text-[#858A99] text-[11px] block font-medium">
                    Chunks
                  </span>
                  <span className="text-[#242633] font-semibold mt-1 flex items-center gap-1.5 font-mono">
                    <Layers className="w-3.5 h-3.5 text-[#7185E8] stroke-[1.75]" />
                    {document.chunksCount} chunks
                  </span>
                </div>
              </div>

              {/* Extracted Chunks / Content Section */}
              {loadingContent ? (
                <div className="py-4 flex items-center justify-center gap-2 text-xs text-[#858A99]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#7185E8]" />
                  <span>Loading extracted chunks...</span>
                </div>
              ) : contentData && contentData.chunks.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#858A99] uppercase tracking-wider flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-[#7185E8]" />
                      <span>Extracted Chunks ({contentData.chunks.length})</span>
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {contentData.chunks.slice(0, 5).map((chunk) => (
                      <div
                        key={chunk.id}
                        className="p-3 rounded-xl bg-[#F7F8FA] border border-[#EFF0F6] text-xs text-[#525666] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#858A99]">
                          <span>Chunk #{chunk.chunkIndex + 1}</span>
                          <span>Page {chunk.pageNumber ?? 1}</span>
                        </div>
                        <p className="line-clamp-3 leading-relaxed">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                    {contentData.chunks.length > 5 && (
                      <p className="text-[11px] text-[#858A99] text-center pt-1">
                        + {contentData.chunks.length - 5} more chunks
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Summary fallback */
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#858A99] uppercase tracking-wider">
                    Summary
                  </h3>
                  <p className="text-xs text-[#525666] leading-relaxed bg-[#F7F8FA] p-3.5 rounded-xl border border-[#EFF0F6]">
                    {document.summary}
                  </p>
                </div>
              )}

              {/* Topics */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[#858A99] uppercase tracking-wider">
                  Key Topics
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {document.keyTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E9EAF0] text-xs font-medium text-[#525666] shadow-xs"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#E9EAF0] bg-[#FAFAFC] flex items-center justify-between text-xs text-[#858A99]">
            <span className="font-mono text-[11px]">{document.id}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(document.title);
              }}
              className="flex items-center gap-1.5 hover:text-[#242633] text-[11px] font-medium"
            >
              <Copy className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Copy Title</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
