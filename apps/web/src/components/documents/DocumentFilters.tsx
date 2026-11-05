'use client';

export type DocumentTypeFilter = 'ALL' | 'PDF' | 'DOCX' | 'TXT';
export type DocumentStatusFilter = 'ALL' | 'Ready' | 'Processing' | 'Failed';

interface DocumentFiltersProps {
  selectedType: DocumentTypeFilter;
  onTypeChange: (type: DocumentTypeFilter) => void;
  selectedStatus: DocumentStatusFilter;
  onStatusChange: (status: DocumentStatusFilter) => void;
  typeCounts?: Record<DocumentTypeFilter, number>;
  statusCounts?: Record<DocumentStatusFilter, number>;
}

export function DocumentFilters({
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  typeCounts,
  statusCounts,
}: DocumentFiltersProps) {
  const typeOptions: { id: DocumentTypeFilter; label: string }[] = [
    { id: 'ALL', label: 'All Files' },
    { id: 'PDF', label: 'PDF' },
    { id: 'DOCX', label: 'DOCX' },
    { id: 'TXT', label: 'TXT' },
  ];

  const statusOptions: {
    id: DocumentStatusFilter;
    label: string;
    dotColor?: string;
  }[] = [
    { id: 'ALL', label: 'All Status' },
    { id: 'Ready', label: 'Ready', dotColor: 'bg-[#29A36A]' },
    { id: 'Processing', label: 'Processing', dotColor: 'bg-[#7185E8]' },
    { id: 'Failed', label: 'Failed', dotColor: 'bg-[#E6A13A]' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs select-none">
      {/* File Types Segmented Control */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E9EAF0] shadow-subtle">
        {typeOptions.map((opt) => {
          const isSelected = selectedType === opt.id;
          const count = typeCounts ? typeCounts[opt.id] : undefined;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onTypeChange(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#7185E8] text-white shadow-xs'
                  : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
              }`}
            >
              <span>{opt.label}</span>
              {count !== undefined && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white font-semibold'
                      : 'bg-[#F0F1F6] text-[#858A99]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status Filter Segmented Control */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E9EAF0] shadow-subtle">
        {statusOptions.map((opt) => {
          const isSelected = selectedStatus === opt.id;
          const count = statusCounts ? statusCounts[opt.id] : undefined;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onStatusChange(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#242633] text-white shadow-xs'
                  : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
              }`}
            >
              {opt.dotColor && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${opt.dotColor} ${
                    opt.id === 'Processing' && !isSelected ? 'animate-pulse' : ''
                  }`}
                />
              )}
              <span>{opt.label}</span>
              {count !== undefined && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white font-semibold'
                      : 'bg-[#F0F1F6] text-[#858A99]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

