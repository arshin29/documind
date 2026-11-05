'use client';

import { useState, useMemo } from 'react';
import { AppShell, useApp } from '@/components/layout/AppShell';
import { INITIAL_ACTIVITIES, DocumentItem } from '@/data/mock-data';
import { INITIAL_CONVERSATIONS } from '@/data/workspace-data';
import {
  DateRangeKey,
  calculateAnalyticsStats,
  getDocumentActivityData,
  getDocumentTypeDistribution,
  getAIActivityData,
  getTopDocuments,
  getChronologicalActivities,
} from '@/lib/analytics';
import { InsightsHeader } from '@/components/insights/InsightsHeader';
import { AnalyticsStats } from '@/components/insights/AnalyticsStats';
import { DocumentActivityChart } from '@/components/insights/DocumentActivityChart';
import { DocumentTypeChart } from '@/components/insights/DocumentTypeChart';
import { AIActivityChart } from '@/components/insights/AIActivityChart';
import { TopDocuments } from '@/components/insights/TopDocuments';
import { ActivityTimeline } from '@/components/insights/ActivityTimeline';

function InsightsContent() {
  const { documents, openDocumentDrawer } = useApp();
  const [selectedRange, setSelectedRange] = useState<DateRangeKey>('30d');

  // Set of active document IDs for filtering related conversations and activities
  const activeDocIds = useMemo(() => new Set(documents.map((d) => d.id)), [documents]);

  // Handle document selection to open drawer
  const handleSelectDocument = (doc: DocumentItem) => {
    openDocumentDrawer(doc);
  };

  const handleSelectDocumentByTitle = (title: string) => {
    const found = documents.find(
      (d) => d.title.toLowerCase() === title.toLowerCase()
    );
    if (found) {
      openDocumentDrawer(found);
    }
  };

  // 1. Five overview KPI metrics
  const stats = useMemo(
    () => calculateAnalyticsStats(documents, INITIAL_CONVERSATIONS, selectedRange),
    [documents, selectedRange]
  );

  // 2. Document upload activity area chart
  const docActivity = useMemo(
    () => getDocumentActivityData(documents, selectedRange),
    [documents, selectedRange]
  );

  // 3. Document format distribution donut chart
  const typeDistribution = useMemo(
    () => getDocumentTypeDistribution(documents, selectedRange),
    [documents, selectedRange]
  );

  // 4. AI query activity chart
  const aiActivity = useMemo(
    () => getAIActivityData(INITIAL_CONVERSATIONS, activeDocIds, selectedRange),
    [activeDocIds, selectedRange]
  );

  // 5. Top documents ranked list
  const topDocs = useMemo(
    () => getTopDocuments(documents, INITIAL_CONVERSATIONS, selectedRange),
    [documents, selectedRange]
  );

  // 6. Chronological activity timeline
  const activities = useMemo(
    () => getChronologicalActivities(INITIAL_ACTIVITIES, activeDocIds, selectedRange),
    [activeDocIds, selectedRange]
  );

  return (
    <div className="space-y-6 w-full pb-8">
      {/* 1. Page Header with Title & Date Range Selector */}
      <InsightsHeader
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
      />

      {/* 2. KPI Section: All 5 Metrics in 1 Row on Desktop, 3-then-2 on Tablet, 2 on Mobile */}
      <AnalyticsStats stats={stats} />

      {/* 3. Chart Section: 2 Balanced Columns with Matching Heights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <DocumentActivityChart data={docActivity} />
        <AIActivityChart summary={aiActivity} />
      </div>

      {/* 4. Document Insights Section: Breakdown and Top Documents Side by Side with Matching Heights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <DocumentTypeChart
          slices={typeDistribution.slices}
          total={typeDistribution.total}
        />
        <TopDocuments
          documents={topDocs}
          onSelectDocument={handleSelectDocument}
        />
      </div>

      {/* 5. Recent Activity: Clean Chronological List Aligned with Content Grid */}
      <ActivityTimeline
        activities={activities}
        onSelectDocumentTitle={handleSelectDocumentByTitle}
      />
    </div>
  );
}

export default function InsightsPage() {
  return (
    <AppShell>
      <InsightsContent />
    </AppShell>
  );
}
