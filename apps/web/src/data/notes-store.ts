'use client';

export interface WorkspaceNote {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_PREFIX = 'documind_notes_';

function getStorageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}${workspaceId || 'default'}`;
}

const DEFAULT_SAMPLE_NOTES: Omit<WorkspaceNote, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Q4 Product Strategy & Intelligence',
    content: `# Q4 Strategy Objectives\n- Accelerate document ingestion latency below 500ms.\n- Expand multi-vector semantic retrieval with pgvector.\n- Launch automated compliance extraction for enterprise clients.\n\nNext milestone check-in scheduled for next Tuesday with the engineering leads.`,
    tags: ['Strategy', 'Roadmap'],
  },
  {
    title: 'RAG Retrieval Optimization Checklist',
    content: `# Retrieval Pipeline Notes\n- Verified cosine distance threshold at 0.50 for high-precision semantic matching.\n- Chunk size tuned to 1,000 characters with 150 overlap.\n- Top-K set to 8 chunks with workspace boundary isolation.\n- Gemini grounding prompt updated with multi-chunk synthesis rules.`,
    tags: ['Engineering', 'RAG'],
  },
];

export function getWorkspaceNotes(workspaceId: string): WorkspaceNote[] {
  if (typeof window === 'undefined') return [];
  const key = getStorageKey(workspaceId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Seed default notes on first workspace visit
      const now = new Date().toISOString();
      const seededNotes: WorkspaceNote[] = DEFAULT_SAMPLE_NOTES.map((sample, idx) => ({
        ...sample,
        id: `note-${Date.now()}-${idx}`,
        workspaceId: workspaceId || 'default',
        createdAt: new Date(Date.now() - (idx + 1) * 3600000 * 24).toISOString(),
        updatedAt: now,
      }));
      localStorage.setItem(key, JSON.stringify(seededNotes));
      return seededNotes;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read workspace notes from storage', err);
    return [];
  }
}

export function saveWorkspaceNote(
  workspaceId: string,
  noteData: { id?: string; title: string; content: string; tags?: string[] },
): WorkspaceNote {
  if (typeof window === 'undefined') {
    throw new Error('Storage is not available in non-browser environment');
  }

  const notes = getWorkspaceNotes(workspaceId);
  const now = new Date().toISOString();

  if (noteData.id) {
    // Update existing note
    const existingIndex = notes.findIndex((n) => n.id === noteData.id);
    if (existingIndex >= 0) {
      const updatedNote: WorkspaceNote = {
        ...notes[existingIndex],
        title: noteData.title.trim() || 'Untitled Note',
        content: noteData.content,
        tags: noteData.tags || notes[existingIndex].tags || [],
        updatedAt: now,
      };
      notes[existingIndex] = updatedNote;
      localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(notes));
      return updatedNote;
    }
  }

  // Create new note
  const newNote: WorkspaceNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    workspaceId: workspaceId || 'default',
    title: noteData.title.trim() || 'Untitled Note',
    content: noteData.content,
    tags: noteData.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  const updatedNotes = [newNote, ...notes];
  localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(updatedNotes));
  return newNote;
}

export function deleteWorkspaceNote(workspaceId: string, noteId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const notes = getWorkspaceNotes(workspaceId);
    const filtered = notes.filter((n) => n.id !== noteId);
    localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete workspace note', err);
    return false;
  }
}

