'use client';

import { Search, X, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import {
  DocumentFilters,
  DocumentTypeFilter,
  DocumentStatusFilter,
} from './DocumentFilters';

export type DocumentSortOption =
  | 'recently-added'
  | 'oldest-first'
  | 'name-asc'
  | 'name-desc'
  | 'largest-first'
  | 'smallest-first';

export type ViewMode = 'list' | 'grid';

interface DocumentsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: DocumentTypeFilter;
  onTypeChange: (type: DocumentTypeFilter) => void;
  selectedStatus: DocumentStatusFilter;
  onStatusChange: (status: DocumentStatusFilter) => void;
  sortBy: DocumentSortOption;
  onSortChange: (sort: DocumentSortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  typeCounts?: Record<DocumentTypeFilter, number>;
  statusCounts?: Record<DocumentStatusFilter, number>;
  totalFiltered: number;
}

export function DocumentsToolbar({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  typeCounts,
  statusCounts,
  totalFiltered,
}: DocumentsToolbarProps) {
  return (
    <div className="space-y-3.5">
      {/* Top Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Prominent Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-[#858A99] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.75]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, topics, author or content..."
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-white border border-[#E9EAF0] text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 shadow-subtle hover:border-[#D8DAE5] transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#858A99] hover:text-[#242633] p-1 rounded-md hover:bg-[#F7F8FA] transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Action Controls: Sort & View Toggle */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Sort Dropdown */}
          <div className="relative flex items-center h-9 px-3 rounded-xl bg-white border border-[#E9EAF0] hover:border-[#D8DAE5] shadow-subtle transition-all">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#858A99] mr-2 shrink-0 stroke-[1.75]" />
            <select
              value={sortBy}
              aria-label="Sort documents"
              onChange={(e) => onSortChange(e.target.value as DocumentSortOption)}
              className="bg-transparent text-xs font-medium text-[#242633] focus:outline-none cursor-pointer pr-1"
            >
              <option value="recently-added">Date Added (Newest)</option>
              <option value="oldest-first">Date Added (Oldest)</option>
              <option value="name-asc">Name (A &rarr; Z)</option>
              <option value="name-desc">Name (Z &rarr; A)</option>
              <option value="largest-first">File Size (Largest)</option>
              <option value="smallest-first">File Size (Smallest)</option>
            </select>
          </div>

          {/* Grid / List View Toggle */}
          <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E9EAF0] shadow-subtle select-none">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-all duration-150 flex items-center justify-center ${
                viewMode === 'list'
                  ? 'bg-[#EEF0FF] text-[#7185E8] shadow-xs'
                  : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
              }`}
              title="List View"
            >
              <List className="w-4 h-4 stroke-[1.75]" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-all duration-150 flex items-center justify-center ${
                viewMode === 'grid'
                  ? 'bg-[#EEF0FF] text-[#7185E8] shadow-xs'
                  : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4 stroke-[1.75]" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Active Filter Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <DocumentFilters
          selectedType={selectedType}
          onTypeChange={onTypeChange}
          selectedStatus={selectedStatus}
          onStatusChange={onStatusChange}
          typeCounts={typeCounts}
          statusCounts={statusCounts}
        />

        {/* Search / Filter match count */}
        <span className="text-[11px] font-medium text-[#858A99] self-start sm:self-center shrink-0">
          Showing <span className="font-semibold text-[#242633]">{totalFiltered}</span> documents
        </span>
      </div>
    </div>
  );
}

