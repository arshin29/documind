'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, useApp } from '@/components/layout/AppShell';
import { INITIAL_ACTIVITIES } from '@/data/mock-data';
import { GreetingHeader } from '@/components/dashboard/GreetingHeader';
import { RecentDocumentsGrid } from '@/components/dashboard/RecentDocumentsGrid';
import { AllDocumentsTable } from '@/components/dashboard/AllDocumentsTable';
import { ActivityFeedWidget } from '@/components/dashboard/ActivityFeedWidget';
import { StorageOverviewWidget } from '@/components/dashboard/StorageOverviewWidget';
import { NoteModal } from '@/components/modals/NoteModal';
import { TemplateGalleryModal } from '@/components/modals/TemplateGalleryModal';
import { DocumentTemplate } from '@/data/templates-data';

function OverviewContent() {
  const router = useRouter();
  const { documents, openUploadModal, openDocumentDrawer, deleteDocument, user, workspace } = useApp();

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [initialNote, setInitialNote] = useState<{ title: string; content: string } | null>(null);

  const handleOpenNote = () => {
    setInitialNote(null);
    setIsNoteModalOpen(true);
  };

  const handleOpenTemplate = () => {
    setIsTemplateModalOpen(true);
  };

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setIsTemplateModalOpen(false);
    setInitialNote({
      title: `${template.title} - Draft`,
      content: template.content,
    });
    setIsNoteModalOpen(true);
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {/* 1. Greeting & Action Buttons Header */}
      <GreetingHeader
        userName={user?.name ? user.name.split(' ')[0] : 'there'}
        onOpenUpload={openUploadModal}
        onOpenWorkspace={() => router.push('/workspace')}
        onOpenNote={handleOpenNote}
        onOpenTemplate={handleOpenTemplate}
      />

      {/* 2. Main Dashboard Composition (2-Column Grid matching reference) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Recent Documents & All Documents Table */}
        <div className="lg:col-span-8 space-y-6">
          {/* Recent Documents Visual Cards */}
          <RecentDocumentsGrid
            documents={documents}
            onOpenDrawer={openDocumentDrawer}
            maxDisplay={4}
          />

          {/* All Documents High-Density Table */}
          <AllDocumentsTable
            documents={documents}
            onOpenDrawer={openDocumentDrawer}
            onDeleteDocument={deleteDocument}
            maxDisplay={6}
          />
        </div>

        {/* Right 4 Columns: Activity Feed & Storage Overview */}
        <div className="lg:col-span-4 space-y-6">
          {/* Activity Feed Widget */}
          <ActivityFeedWidget
            activities={INITIAL_ACTIVITIES}
            onOpenWorkspace={() => router.push('/workspace')}
          />

          {/* Storage Overview Gauge Widget */}
          <StorageOverviewWidget documents={documents} />
        </div>
      </div>

      {/* Dedicated Workspace Note Creation & Management Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setInitialNote(null);
        }}
        workspaceId={workspace?.id || 'default'}
        initialNote={initialNote}
      />

      {/* Dedicated Document & Operational Template Gallery Modal */}
      <TemplateGalleryModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <AppShell>
      <OverviewContent />
    </AppShell>
  );
}
