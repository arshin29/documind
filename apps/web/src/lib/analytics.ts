import {
  DocumentItem,
  ActivityItem,
  parseDateAdded,
  parseFileSizeInBytes,
  formatBytes,
} from '@/data/mock-data';
import { WorkspaceConversation } from '@/data/workspace-data';

export type DateRangeKey = '7d' | '30d' | '90d' | 'all';

export interface DateRangeOption {
  key: DateRangeKey;
  label: string;
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
];

// Reference date for mock timeline (November 1, 2026)
const MOCK_CURRENT_DATE = new Date('2026-11-01T23:59:59.999Z').getTime();

export function getCutoffTimestamp(range: DateRangeKey, refDateMs: number = MOCK_CURRENT_DATE): number {
  switch (range) {
    case '7d':
      return refDateMs - 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return refDateMs - 30 * 24 * 60 * 60 * 1000;
    case '90d':
      return refDateMs - 90 * 24 * 60 * 60 * 1000;
    case 'all':
    default:
      return 0;
  }
}

export function parseItemDate(dateStr?: string): number {
  if (!dateStr) return 0;
  if (dateStr.toLowerCase().includes('just now')) return MOCK_CURRENT_DATE;
  if (dateStr.toLowerCase().includes('today')) return MOCK_CURRENT_DATE;
  if (dateStr.toLowerCase().includes('yesterday')) return MOCK_CURRENT_DATE - 24 * 60 * 60 * 1000;
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Filter documents added within the selected date range
 */
export function filterDocumentsByRange(
  documents: DocumentItem[],
  range: DateRangeKey
): DocumentItem[] {
  if (range === 'all') return documents;
  const cutoff = getCutoffTimestamp(range);
  return documents.filter((doc) => {
    const timestamp = parseDateAdded(doc.dateAdded);
    return timestamp >= cutoff;
  });
}

/**
 * Filter conversations within the selected date range
 */
export function filterConversationsByRange(
  conversations: Record<string, WorkspaceConversation[]>,
  activeDocIds: Set<string>,
  range: DateRangeKey
): Record<string, WorkspaceConversation[]> {
  const cutoff = getCutoffTimestamp(range);
  const result: Record<string, WorkspaceConversation[]> = {};

  Object.entries(conversations).forEach(([docId, convList]) => {
    if (!activeDocIds.has(docId)) return;
    const filtered = convList.filter((c) => {
      if (range === 'all') return true;
      const t = parseItemDate(c.createdAt);
      return t >= cutoff;
    });
    if (filtered.length > 0) {
      result[docId] = filtered;
    }
  });

  return result;
}

/**
 * Five compact metrics calculation
 */
export interface AnalyticsStatsData {
  totalDocuments: number;
  processedDocuments: number;
  totalConversations: number;
  questionsAnswered: number;
  storageUsed: string;
}

export function calculateAnalyticsStats(
  documents: DocumentItem[],
  conversations: Record<string, WorkspaceConversation[]>,
  range: DateRangeKey
): AnalyticsStatsData {
  const filteredDocs = filterDocumentsByRange(documents, range);
  const activeDocIds = new Set(filteredDocs.map((d) => d.id));
  const filteredConvs = filterConversationsByRange(conversations, activeDocIds, range);

  const totalDocuments = filteredDocs.length;
  const processedDocuments = filteredDocs.filter((d) => d.status === 'Ready').length;

  let totalConversations = 0;
  let questionsAnswered = 0;

  Object.values(filteredConvs).forEach((convList) => {
    totalConversations += convList.length;
    convList.forEach((conv) => {
      questionsAnswered += conv.totalQuestions ?? conv.messages.filter((m) => m.sender === 'user').length;
    });
  });

  const totalBytes = filteredDocs.reduce(
    (acc, doc) => acc + parseFileSizeInBytes(doc.size),
    0
  );
  const storageUsed = formatBytes(totalBytes);

  return {
    totalDocuments,
    processedDocuments,
    totalConversations,
    questionsAnswered,
    storageUsed,
  };
}

/**
 * Document uploads over time for Line Chart
 */
export interface DocumentActivityPoint {
  date: string;
  uploads: number;
  cumulative: number;
}

export function getDocumentActivityData(
  documents: DocumentItem[],
  range: DateRangeKey
): DocumentActivityPoint[] {
  const filteredDocs = filterDocumentsByRange(documents, range);
  if (filteredDocs.length === 0) return [];

  // Sort chronologically
  const sorted = [...filteredDocs].sort(
    (a, b) => parseDateAdded(a.dateAdded) - parseDateAdded(b.dateAdded)
  );

  // Group by date label
  const dateMap = new Map<string, number>();

  sorted.forEach((doc) => {
    const ts = parseDateAdded(doc.dateAdded);
    const dateObj = new Date(ts);
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dateMap.set(label, (dateMap.get(label) || 0) + 1);
  });

  let runningTotal = 0;
  const points: DocumentActivityPoint[] = [];

  dateMap.forEach((count, date) => {
    runningTotal += count;
    points.push({
      date,
      uploads: count,
      cumulative: runningTotal,
    });
  });

  return points;
}

/**
 * Document format distribution for Donut Chart
 */
export interface DocumentTypeSlice {
  name: 'PDF' | 'DOCX' | 'TXT';
  value: number;
  percentage: number;
  color: string;
}

export function getDocumentTypeDistribution(
  documents: DocumentItem[],
  range: DateRangeKey
): { slices: DocumentTypeSlice[]; total: number } {
  const filteredDocs = filterDocumentsByRange(documents, range);
  const total = filteredDocs.length;

  const counts: Record<'PDF' | 'DOCX' | 'TXT', number> = {
    PDF: 0,
    DOCX: 0,
    TXT: 0,
  };

  filteredDocs.forEach((doc) => {
    if (counts[doc.type] !== undefined) {
      counts[doc.type]++;
    }
  });

  const colorMap: Record<'PDF' | 'DOCX' | 'TXT', string> = {
    PDF: '#7185E8',
    DOCX: '#29A36A',
    TXT: '#E6A13A',
  };

  const slices: DocumentTypeSlice[] = (['PDF', 'DOCX', 'TXT'] as const).map((type) => {
    const value = counts[type];
    const percentage = total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
    return {
      name: type,
      value,
      percentage,
      color: colorMap[type],
    };
  });

  return { slices, total };
}

/**
 * AI questions asked over time for Bar/Line Chart
 */
export interface AIActivityPoint {
  date: string;
  questions: number;
}

export interface AIActivitySummary {
  points: AIActivityPoint[];
  totalQuestions: number;
  avgQuestionsPerConversation: string;
  mostActiveDay: string;
}

export function getAIActivityData(
  conversations: Record<string, WorkspaceConversation[]>,
  activeDocIds: Set<string>,
  range: DateRangeKey
): AIActivitySummary {
  const filteredConvs = filterConversationsByRange(conversations, activeDocIds, range);

  const dayMap = new Map<string, number>();
  let totalQuestions = 0;
  let totalConversations = 0;

  Object.values(filteredConvs).forEach((convList) => {
    totalConversations += convList.length;
    convList.forEach((c) => {
      const qCount = c.totalQuestions ?? c.messages.filter((m) => m.sender === 'user').length;
      totalQuestions += qCount;

      const ts = parseItemDate(c.createdAt);
      const dateObj = new Date(ts);
      const dayLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap.set(dayLabel, (dayMap.get(dayLabel) || 0) + qCount);
    });
  });

  // Sort chronological
  const points: AIActivityPoint[] = Array.from(dayMap.entries())
    .map(([date, questions]) => ({ date, questions }))
    .sort((a, b) => {
      const da = Date.parse(`${a.date}, 2026`);
      const db = Date.parse(`${b.date}, 2026`);
      return da - db;
    });

  const avgQuestions =
    totalConversations > 0 ? (totalQuestions / totalConversations).toFixed(1) : '0.0';

  let mostActiveDay = 'No activity';
  let maxQueries = 0;

  dayMap.forEach((q, day) => {
    if (q > maxQueries) {
      maxQueries = q;
      mostActiveDay = `${day} (${q} queries)`;
    }
  });

  return {
    points,
    totalQuestions,
    avgQuestionsPerConversation: avgQuestions,
    mostActiveDay,
  };
}

/**
 * Top engaged documents
 */
export interface TopDocumentItem {
  id: string;
  title: string;
  type: 'PDF' | 'DOCX' | 'TXT';
  conversationsCount: number;
  questionsCount: number;
  doc: DocumentItem;
}

export function getTopDocuments(
  documents: DocumentItem[],
  conversations: Record<string, WorkspaceConversation[]>,
  range: DateRangeKey
): TopDocumentItem[] {
  const filteredDocs = filterDocumentsByRange(documents, range);
  const activeDocIds = new Set(filteredDocs.map((d) => d.id));
  const filteredConvs = filterConversationsByRange(conversations, activeDocIds, range);

  const items: TopDocumentItem[] = filteredDocs.map((doc) => {
    const convList = filteredConvs[doc.id] || [];
    const convCount = convList.length;
    const qCount = convList.reduce((sum, c) => {
      return sum + (c.totalQuestions ?? c.messages.filter((m) => m.sender === 'user').length);
    }, 0);

    return {
      id: doc.id,
      title: doc.title,
      type: doc.type,
      conversationsCount: convCount,
      questionsCount: qCount,
      doc,
    };
  });

  // Sort by engagement: question volume primarily, then conversation count
  return items.sort((a, b) => {
    if (b.questionsCount !== a.questionsCount) {
      return b.questionsCount - a.questionsCount;
    }
    return b.conversationsCount - a.conversationsCount;
  });
}

/**
 * Chronological activity timeline
 */
export function getChronologicalActivities(
  activities: ActivityItem[],
  activeDocIds: Set<string>,
  range: DateRangeKey
): ActivityItem[] {
  const cutoff = getCutoffTimestamp(range);

  return activities
    .filter((act) => {
      // If activity has an associated docId, ensure document exists
      if (act.docId && !activeDocIds.has(act.docId)) {
        return false;
      }
      if (range === 'all') return true;
      const ts = act.date ? Date.parse(act.date) : parseItemDate(act.timestamp);
      return ts >= cutoff;
    })
    .sort((a, b) => {
      const ta = a.date ? Date.parse(a.date) : parseItemDate(a.timestamp);
      const tb = b.date ? Date.parse(b.date) : parseItemDate(b.timestamp);
      return tb - ta;
    });
}

/**
 * Deep document insights calculation
 */
export interface DocumentInsightsData {
  mostDiscussedDoc: {
    doc: DocumentItem;
    conversationsCount: number;
    questionsCount: number;
  } | null;
  mostRecentDoc: {
    doc: DocumentItem;
    date: string;
  } | null;
  mostActiveCategory: {
    name: string;
    docCount: number;
    questionsCount: number;
  } | null;
  indexedHealth: {
    totalDocs: number;
    indexedDocs: number;
    totalChunks: number;
    percentage: number;
    processingDocs: number;
    failedDocs: number;
  };
}

export function getDocumentInsights(
  documents: DocumentItem[],
  conversations: Record<string, WorkspaceConversation[]>,
  range: DateRangeKey
): DocumentInsightsData {
  const filteredDocs = filterDocumentsByRange(documents, range);
  const topDocs = getTopDocuments(filteredDocs, conversations, range);

  // 1. Most discussed document
  const mostDiscussedDoc =
    topDocs.length > 0 && topDocs[0].questionsCount > 0
      ? {
          doc: topDocs[0].doc,
          conversationsCount: topDocs[0].conversationsCount,
          questionsCount: topDocs[0].questionsCount,
        }
      : null;

  // 2. Most recently uploaded document
  let mostRecentDoc: { doc: DocumentItem; date: string } | null = null;
  if (filteredDocs.length > 0) {
    const sortedByDate = [...filteredDocs].sort(
      (a, b) => parseDateAdded(b.dateAdded) - parseDateAdded(a.dateAdded)
    );
    mostRecentDoc = {
      doc: sortedByDate[0],
      date: sortedByDate[0].dateAdded,
    };
  }

  // 3. Most active document category
  // Group by author / department as primary business domain category
  const categoryMap = new Map<string, { docCount: number; questionsCount: number }>();
  topDocs.forEach((item) => {
    const cat = item.doc.author || item.doc.keyTopics[0] || 'General';
    const current = categoryMap.get(cat) || { docCount: 0, questionsCount: 0 };
    current.docCount += 1;
    current.questionsCount += item.questionsCount;
    categoryMap.set(cat, current);
  });

  let mostActiveCategory: { name: string; docCount: number; questionsCount: number } | null = null;
  let maxCatQueries = -1;
  categoryMap.forEach((data, name) => {
    if (data.questionsCount > maxCatQueries) {
      maxCatQueries = data.questionsCount;
      mostActiveCategory = {
        name,
        docCount: data.docCount,
        questionsCount: data.questionsCount,
      };
    }
  });

  // 4. Document indexing health
  const totalDocs = filteredDocs.length;
  const readyDocs = filteredDocs.filter((d) => d.status === 'Ready');
  const indexedDocs = readyDocs.length;
  const totalChunks = readyDocs.reduce((acc, d) => acc + (d.chunksCount || 0), 0);
  const processingDocs = filteredDocs.filter((d) => d.status === 'Processing').length;
  const failedDocs = filteredDocs.filter((d) => d.status === 'Failed').length;
  const percentage = totalDocs > 0 ? Math.round((indexedDocs / totalDocs) * 100) : 0;

  return {
    mostDiscussedDoc,
    mostRecentDoc,
    mostActiveCategory,
    indexedHealth: {
      totalDocs,
      indexedDocs,
      totalChunks,
      percentage,
      processingDocs,
      failedDocs,
    },
  };
}
