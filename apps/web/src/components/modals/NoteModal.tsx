'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Save,
  Check,
  Calendar,
  Clock,
  Search,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import {
  WorkspaceNote,
  getWorkspaceNotes,
  saveWorkspaceNote,
  deleteWorkspaceNote,
} from '@/data/notes-store';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  initialNote?: { title: string; content: string } | null;
}

export function NoteModal({
  isOpen,
  onClose,
  workspaceId = 'default',
  initialNote = null,
}: NoteModalProps) {
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSavedList, setShowSavedList] = useState(true);

  // Reload notes for active workspace
  const refreshNotes = useCallback(() => {
    if (!workspaceId) return;
    const loadedNotes = getWorkspaceNotes(workspaceId);
    setNotes(loadedNotes);
    return loadedNotes;
  }, [workspaceId]);

  // Synchronize notes when modal opens or workspace changes
  useEffect(() => {
    if (!isOpen) return;

    const loadedNotes = refreshNotes() || [];

    if (initialNote) {
      // User arrived from Template Gallery or external action
      setSelectedNoteId(null);
      setTitle(initialNote.title);
      setContent(initialNote.content);
    } else if (loadedNotes.length > 0) {
      // Open the most recently updated note by default
      const first = loadedNotes[0];
      setSelectedNoteId(first.id);
      setTitle(first.title);
      setContent(first.content);
    } else {
      // Clean slate for new note
      setSelectedNoteId(null);
      setTitle('');
      setContent('');
    }
  }, [isOpen, workspaceId, initialNote, refreshNotes]);

  // Handle Save
  const handleSave = () => {
    if (!title.trim() && !content.trim()) return;

    const saved = saveWorkspaceNote(workspaceId, {
      id: selectedNoteId || undefined,
      title: title.trim() || 'Untitled Note',
      content,
    });

    setSelectedNoteId(saved.id);
    refreshNotes();

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Handle Start New Note
  const handleStartNew = () => {
    setSelectedNoteId(null);
    setTitle('');
    setContent('');
  };

  // Handle Select an Existing Note
  const handleSelectNote = (note: WorkspaceNote) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  // Handle Delete
  const handleDelete = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      deleteWorkspaceNote(workspaceId, noteId);
      const remaining = refreshNotes() || [];
      if (selectedNoteId === noteId) {
        if (remaining.length > 0) {
          setSelectedNoteId(remaining[0].id);
          setTitle(remaining[0].title);
          setContent(remaining[0].content);
        } else {
          handleStartNew();
        }
      }
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[750px] bg-white rounded-2xl border border-[#E9EAF0] shadow-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E9EAF0] bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#242633] flex items-center gap-2">
                Workspace Notes
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-[#F7F8FA] border border-[#E9EAF0] text-[#858A99]">
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </span>
              </h2>
              <p className="text-[11px] text-[#858A99]">
                Create, capture and persist notes within your workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSavedList(!showSavedList)}
              className="px-2.5 py-1.5 rounded-lg border border-[#E9EAF0] text-xs font-medium text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-colors md:hidden"
            >
              {showSavedList ? 'Hide List' : 'Notes List'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split View (List + Editor) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Notes Sidebar / List */}
          <div
            className={`w-full md:w-72 border-r border-[#E9EAF0] bg-[#F7F8FA] flex flex-col shrink-0 ${
              showSavedList ? 'flex' : 'hidden md:flex'
            }`}
          >
            {/* New Note & Search bar */}
            <div className="p-3 border-b border-[#E9EAF0] space-y-2 bg-white">
              <button
                type="button"
                onClick={handleStartNew}
                className="w-full h-8 px-3 rounded-lg bg-[#7185E8] hover:bg-[#5F73DD] text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-subtle transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Note</span>
              </button>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#858A99] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-[#F7F8FA] border border-[#E9EAF0] rounded-lg text-[#242633] placeholder-[#858A99] focus:outline-none focus:border-[#7185E8]"
                />
              </div>
            </div>

            {/* Note items list */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E9EAF0]/60 p-2 space-y-1">
              {filteredNotes.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#858A99] space-y-1">
                  <p>No notes found</p>
                  <p className="text-[11px] text-[#A0A4B0]">Click &ldquo;+ New Note&rdquo; to start drafting</p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = selectedNoteId === note.id;
                  const dateStr = new Date(note.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={note.id}
                      onClick={() => {
                        handleSelectNote(note);
                        setShowSavedList(false);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all group ${
                        isSelected
                          ? 'bg-white border border-[#7185E8]/30 shadow-subtle text-[#242633]'
                          : 'hover:bg-white hover:border-[#E9EAF0] text-[#555966] border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-semibold truncate leading-tight flex-1">
                          {note.title || 'Untitled Note'}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(note.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#858A99] hover:text-[#E5484D] rounded transition-opacity"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#858A99] line-clamp-2 mt-1 leading-snug">
                        {note.content.replace(/^#+\s+/gm, '').trim() || 'No additional text'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#A0A4B0]">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Note Editor Area */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Note Title Input */}
            <div className="px-6 pt-4 pb-2 border-b border-[#E9EAF0]">
              <input
                type="text"
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-base sm:text-lg font-bold text-[#242633] placeholder-[#A0A4B0] border-none outline-none focus:ring-0 bg-transparent px-0"
              />
            </div>

            {/* Note Content Textarea */}
            <div className="flex-1 p-6 overflow-y-auto">
              <textarea
                placeholder="Start typing your note, documentation, or scratchpad thoughts... Markdown formatting is supported."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full resize-none border-none outline-none focus:ring-0 bg-transparent text-xs sm:text-sm text-[#242633] placeholder-[#A0A4B0] leading-relaxed font-normal"
              />
            </div>

            {/* Editor Footer / Action Bar */}
            <div className="px-6 py-3 border-t border-[#E9EAF0] bg-[#F7F8FA]/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 text-[11px] text-[#858A99]">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} characters</span>
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1 text-[#29A36A] font-medium bg-[#E8F8F0] px-2 py-0.5 rounded-full border border-[#29A36A]/20">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    Saved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl border border-[#E9EAF0] hover:bg-white text-xs font-medium text-[#858A99] hover:text-[#242633] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-white text-xs font-semibold flex items-center gap-1.5 shadow-subtle shadow-[#7185E8]/25 transition-all cursor-pointer active:scale-98"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

