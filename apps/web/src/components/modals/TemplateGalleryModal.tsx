'use client';

import { useState } from 'react';
import {
  X,
  LayoutTemplate,
  Briefcase,
  Code2,
  Users,
  FileCheck,
  TrendingUp,
  BookOpen,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { DOCUMENT_TEMPLATES, DocumentTemplate } from '@/data/templates-data';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: DocumentTemplate) => void;
}

export function TemplateGalleryModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplateGalleryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const categories = ['All', 'Executive', 'Technical', 'Meeting', 'Operations', 'Research'];

  const filteredTemplates = DOCUMENT_TEMPLATES.filter((tpl) => {
    const matchesCategory =
      selectedCategory === 'All' || tpl.category === selectedCategory;
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'Briefcase':
        return <Briefcase className="w-5 h-5 text-[#7185E8]" />;
      case 'Code2':
        return <Code2 className="w-5 h-5 text-[#38B2AC]" />;
      case 'Users':
        return <Users className="w-5 h-5 text-[#E28AB2]" />;
      case 'FileCheck':
        return <FileCheck className="w-5 h-5 text-[#29A36A]" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5 text-[#F59E0B]" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-[#8B5CF6]" />;
      default:
        return <LayoutTemplate className="w-5 h-5 text-[#7185E8]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[750px] bg-white rounded-2xl border border-[#E9EAF0] shadow-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E9EAF0] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#242633]">Template Gallery</h2>
              <p className="text-xs text-[#858A99]">
                Choose from pre-built structured documentation and operational templates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-[#E9EAF0] bg-[#F7F8FA]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#7185E8] text-white shadow-subtle'
                    : 'bg-white border border-[#E9EAF0] text-[#858A99] hover:text-[#242633] hover:border-[#D8DAE5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#858A99] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[#E9EAF0] rounded-xl text-[#242633] placeholder-[#858A99] focus:outline-none focus:border-[#7185E8] shadow-subtle"
            />
          </div>
        </div>

        {/* Template Cards Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#858A99]">
              <LayoutTemplate className="w-10 h-10 stroke-1 text-[#C4C7D4] mb-2" />
              <p className="text-sm font-medium text-[#242633]">No templates found</p>
              <p className="text-xs text-[#858A99] mt-0.5">
                Try searching for a different keyword or select &ldquo;All&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-5 rounded-2xl border border-[#E9EAF0] bg-white hover:border-[#7185E8]/40 hover:shadow-card transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Icon & Category */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] flex items-center justify-center group-hover:scale-105 transition-transform">
                        {getTemplateIcon(template.icon)}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#EEF0FF] text-[#7185E8]">
                        {template.category}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-bold text-[#242633] group-hover:text-[#7185E8] transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-xs text-[#858A99] mt-1.5 leading-relaxed">
                      {template.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-[#F7F8FA] border border-[#E9EAF0] text-[10px] text-[#858A99] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 mt-4 border-t border-[#E9EAF0]/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => onSelectTemplate(template)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F7F8FA] group-hover:bg-[#7185E8] text-[#242633] group-hover:text-white border border-[#E9EAF0] group-hover:border-[#7185E8] text-xs font-semibold flex items-center gap-1.5 shadow-subtle transition-all cursor-pointer"
                    >
                      <span>Use Template</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E9EAF0] bg-[#F7F8FA]/60 flex items-center justify-between shrink-0">
          <p className="text-xs text-[#858A99]">
            Selecting a template initializes a pre-formatted workspace document note
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-[#E9EAF0] hover:bg-white text-xs font-medium text-[#858A99] hover:text-[#242633] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

