'use client';

import { useState } from 'react';
import {
  Download,
  ZoomIn,
  ZoomOut,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  Maximize2,
  FileText,
} from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';
import { triggerDocumentDownload } from '@/lib/documents';
import { PageNavigation } from './PageNavigation';
import { PDFPreview } from './PDFPreview';

interface DocumentViewerProps {
  document: DocumentItem;
  allDocuments: DocumentItem[];
  onSelectDocument: (docId: string) => void;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  highlightSection?: string | null;
}

export function DocumentViewer({
  document,
  allDocuments,
  onSelectDocument,
  currentPage,
  onPageChange,
  isCollapsed = false,
  onToggleCollapse,
  highlightSection,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const totalPages = document.pages || 10;

  const handleZoomIn = () => setZoom((prev) => Math.min(150, prev + 15));
  const handleZoomOut = () => setZoom((prev) => Math.max(70, prev - 15));
  const handleResetZoom = () => setZoom(100);
  const handleFitToWidth = () => setZoom(115);

  if (isCollapsed) {
    return (
      <div className="hidden lg:flex w-12 bg-white flex-col items-center py-4 justify-between shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-xl hover:bg-[#EEF0FF] text-[#858A99] hover:text-[#7185E8] flex items-center justify-center transition-colors"
          title="Expand Document Viewer"
        >
          <PanelLeft className="w-4 h-4 stroke-[1.75]" />
        </button>
        <span className="font-mono text-[10px] font-semibold text-[#858A99] rotate-90 whitespace-nowrap tracking-wider">
          DOCUMENT
        </span>
        <div className="w-2 h-2 rounded-full bg-[#7185E8]" />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#F0F2F8] flex flex-col overflow-hidden">
      {/* Top Toolbar: Clearly separated white surface */}
      <div className="h-12 px-4 border-b border-[#DDE1EB] flex items-center justify-between gap-2 shrink-0 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Uppercase Section Label */}
          <span className="font-mono text-[10px] font-bold tracking-wider text-[#686D7F] uppercase bg-[#F0F2F8] px-2 py-0.5 rounded border border-[#DDE1EB] shrink-0">
            DOCUMENT
          </span>

          <div className="w-6 h-6 rounded-lg bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 stroke-[1.75]" />
          </div>

          <div className="relative flex items-center min-w-0">
            <select
              value={document.id}
              aria-label="Active document in viewer"
              onChange={(e) => onSelectDocument(e.target.value)}
              className="appearance-none pl-2.5 pr-7 py-1 rounded-lg bg-[#F7F8FA] border border-[#DDE1EB] hover:border-[#C8CBD6] text-xs font-semibold text-[#242633] cursor-pointer focus:outline-none focus:border-[#7185E8] max-w-[180px] sm:max-w-[220px] truncate transition-colors"
            >
              {allDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#858A99] absolute right-2 pointer-events-none" />
          </div>

          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EEF0FF] border border-[#E0E4FA] text-[#7185E8] shrink-0">
            {document.type}
          </span>
        </div>

        {/* Right Actions: Download & Collapse */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => triggerDocumentDownload(document)}
            className="w-7 h-7 rounded-lg hover:bg-[#F0F2F8] text-[#858A99] hover:text-[#242633] flex items-center justify-center transition-colors"
            title="Download document metadata"
          >
            <Download className="w-4 h-4 stroke-[1.75]" />
          </button>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex w-7 h-7 rounded-lg hover:bg-[#F0F2F8] text-[#858A99] hover:text-[#242633] items-center justify-center transition-colors"
              title="Collapse document viewer"
            >
              <PanelLeftClose className="w-4 h-4 stroke-[1.75]" />
            </button>
          )}
        </div>
      </div>

      {/* Secondary Controls Bar: Page Navigation & Zoom Controls on white surface */}
      <div className="h-10 px-4 border-b border-[#DDE1EB] bg-white flex items-center justify-between text-xs shrink-0 select-none">
        {/* Page navigation */}
        <PageNavigation
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 text-[#858A99]">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 70}
            className="w-6 h-6 rounded hover:bg-[#F0F2F8] text-[#858A99] hover:text-[#242633] flex items-center justify-center transition-colors disabled:opacity-30"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="font-mono text-xs px-1.5 py-0.5 rounded hover:bg-[#F0F2F8] text-[#242633] font-medium transition-colors"
            title="Click to reset zoom (100%)"
          >
            {zoom}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 150}
            className="w-6 h-6 rounded hover:bg-[#F0F2F8] text-[#858A99] hover:text-[#242633] flex items-center justify-center transition-colors disabled:opacity-30"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5 stroke-[1.75]" />
          </button>

          <div className="h-3.5 w-px bg-[#DDE1EB] mx-1" />

          <button
            type="button"
            onClick={handleFitToWidth}
            className="w-6 h-6 rounded hover:bg-[#F0F2F8] text-[#858A99] hover:text-[#7185E8] flex items-center justify-center transition-colors"
            title="Fit to Width"
          >
            <Maximize2 className="w-3 h-3 stroke-[1.75]" />
          </button>
        </div>
      </div>

      {/* Main Document Preview Container: Cooler blue-grey desk canvas */}
      <div className="flex-1 overflow-auto bg-[#F0F2F8] p-3 sm:p-5 flex items-start justify-center">
        <PDFPreview
          document={document}
          currentPage={currentPage}
          zoom={zoom}
          highlightSection={highlightSection}
        />
      </div>
    </div>
  );
}

