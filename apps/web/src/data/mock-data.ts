export interface DocumentItem {
  id: string;
  workspaceId?: string;
  title: string;
  type: 'PDF' | 'DOCX' | 'TXT';
  size: string;
  dateAdded: string;
  status: 'Ready' | 'Processing' | 'Failed';
  embeddingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  embeddedChunksCount?: number;
  pages?: number;
  chunksCount: number;
  summary: string;
  keyTopics: string[];
  recentQuestion?: string;
  author?: string;
}

export interface MetricItem {
  label: string;
  value: string;
  change?: string;
  subtext: string;
}

export type ActivityType =
  | 'upload'
  | 'processed'
  | 'summary'
  | 'qa'
  | 'conversation'
  | 'insight';

export interface ActivityItem {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  type: ActivityType;
  date?: string;
  docId?: string;
}

export interface WorkspaceMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: {
    documentId?: string;
    documentTitle: string;
    originalFilename?: string;
    chunkId?: string;
    page?: number;
    quote: string;
  }[];
}

export function parseFileSizeInBytes(sizeStr: string): number {
  const parts = sizeStr.trim().split(/\s+/);
  const num = parseFloat(parts[0]) || 0;
  const unit = (parts[1] || 'MB').toUpperCase();
  if (unit === 'KB') return num * 1024;
  if (unit === 'GB') return num * 1024 * 1024 * 1024;
  return num * 1024 * 1024; // MB default
}

export function parseDateAdded(dateStr: string): number {
  if (!dateStr) return 0;
  if (dateStr.toLowerCase().includes('just now')) return Date.now();
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function calculateTotalStorage(docs: DocumentItem[]): string {
  const totalBytes = docs.reduce((acc, doc) => acc + parseFileSizeInBytes(doc.size), 0);
  return formatBytes(totalBytes);
}

export function getDashboardMetrics(docs: DocumentItem[]): MetricItem[] {
  const total = docs.length;
  const readyCount = docs.filter((d) => d.status === 'Ready').length;
  const storageStr = calculateTotalStorage(docs);

  return [
    {
      label: 'Total Documents',
      value: String(total),
      subtext: `Across ${total > 0 ? 1 : 0} workspace`,
    },
    {
      label: 'Processed',
      value: String(readyCount),
      subtext: `${readyCount} of ${total} documents ready`,
    },
    {
      label: 'AI Conversations',
      value: '18',
      subtext: '142 queries answered',
    },
    {
      label: 'Storage Used',
      value: storageStr,
      subtext: 'Of 2.0 GB tier limit',
    },
  ];
}

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Annual Business Report 2026.pdf',
    type: 'PDF',
    size: '4.2 MB',
    dateAdded: 'Oct 28, 2026',
    status: 'Ready',
    pages: 48,
    chunksCount: 142,
    author: 'Finance & Strategy Group',
    summary:
      'Executive summary outlining year-over-year revenue growth of 34%, expansion into enterprise tier accounts, operating margin optimizations, and FY2027 strategic investments.',
    keyTopics: ['Revenue Growth', 'Operating Margins', 'Enterprise Expansion', 'FY27 Forecast'],
    recentQuestion: 'What are the main projected revenue drivers for Q4?',
  },
  {
    id: 'doc-2',
    title: 'Product Research.pdf',
    type: 'PDF',
    size: '2.8 MB',
    dateAdded: 'Oct 24, 2026',
    status: 'Ready',
    pages: 26,
    chunksCount: 78,
    author: 'UX & Product Research',
    summary:
      'Qualitative interview findings from 65 product managers and knowledge workers detailing pain points in multi-format document retrieval and semantic search accuracy.',
    keyTopics: ['User Friction Points', 'Retrieval Latency', 'Information Architecture', 'Workflow Tools'],
    recentQuestion: 'What were the most cited friction points in document search?',
  },
  {
    id: 'doc-3',
    title: 'Marketing Strategy.docx',
    type: 'DOCX',
    size: '1.4 MB',
    dateAdded: 'Oct 21, 2026',
    status: 'Ready',
    pages: 18,
    chunksCount: 52,
    author: 'Growth Marketing',
    summary:
      'Comprehensive go-to-market plan covering B2B organic acquisition, developer advocacy program, partner ecosystems, and product-led growth trial onboarding metrics.',
    keyTopics: ['GTM Strategy', 'Developer Advocacy', 'Customer Acquisition Cost', 'PLG Conversion'],
    recentQuestion: 'What are the target CAC and payback period assumptions?',
  },
  {
    id: 'doc-4',
    title: 'Financial Overview.pdf',
    type: 'PDF',
    size: '3.1 MB',
    dateAdded: 'Oct 19, 2026',
    status: 'Ready',
    pages: 32,
    chunksCount: 96,
    author: 'Treasury & FP&A',
    summary:
      'Audited balance sheet, cash flow statements, runway scenario modeling at standard and accelerated burn rates, and capital expenditure breakdown for infrastructure.',
    keyTopics: ['Cash Flow', 'Runway Modeling', 'Infrastructure CapEx', 'Burn Multiple'],
    recentQuestion: 'How many months of runway are projected under accelerated hiring?',
  },
  {
    id: 'doc-5',
    title: 'Legal Agreement - NDA.pdf',
    type: 'PDF',
    size: '620 KB',
    dateAdded: 'Oct 15, 2026',
    status: 'Ready',
    pages: 8,
    chunksCount: 22,
    author: 'Legal Counsel',
    summary:
      'Standard mutual non-disclosure and intellectual property protection terms, confidential information definitions, non-solicitation covenants, and governing jurisdiction.',
    keyTopics: ['Confidentiality Terms', 'IP Assignment', 'Governing Law', 'Term & Termination'],
    recentQuestion: 'What is the duration of confidentiality obligations after termination?',
  },
  {
    id: 'doc-6',
    title: 'Q3 Earnings Transcript.txt',
    type: 'TXT',
    size: '340 KB',
    dateAdded: 'Oct 11, 2026',
    status: 'Ready',
    pages: 12,
    chunksCount: 36,
    author: 'Investor Relations',
    summary:
      'Verbatim transcript of Q3 analyst conference call including prepared leadership remarks, guidance commentary, and Q&A session regarding customer net retention.',
    keyTopics: ['Net Revenue Retention', 'Analyst Q&A', 'Enterprise ACV', 'Guidance Revision'],
    recentQuestion: 'What was leadership commentary on customer retention trends?',
  },
  {
    id: 'doc-7',
    title: 'Security Compliance Guidelines.pdf',
    type: 'PDF',
    size: '1.9 MB',
    dateAdded: 'Oct 08, 2026',
    status: 'Processing',
    pages: 24,
    chunksCount: 0,
    author: 'Infosec & Governance',
    summary:
      'Enterprise security framework covering SOC 2 Type II controls, cryptographic key lifecycle, automated data retention policies, and disaster recovery SLA targets.',
    keyTopics: ['SOC 2 Compliance', 'Access Control', 'Data Encryption', 'Incident Response'],
  },
  {
    id: 'doc-8',
    title: 'Vendor Contract Draft.docx',
    type: 'DOCX',
    size: '480 KB',
    dateAdded: 'Oct 04, 2026',
    status: 'Failed',
    pages: 6,
    chunksCount: 0,
    author: 'Procurement Operations',
    summary:
      'Third-party cloud software procurement template containing standard terms, liability caps, and service level agreements. Ingestion failed due to an unsupported encrypted macro.',
    keyTopics: ['Vendor Contract', 'SLA Terms', 'Liability Cap'],
  },
];

// In-memory document store to synchronize all views across the client application
let documentsStore: DocumentItem[] = [...INITIAL_DOCUMENTS];
type DocumentListener = () => void;
const documentListeners = new Set<DocumentListener>();

export function getDocuments(): DocumentItem[] {
  return documentsStore;
}

export function addDocument(newDoc: DocumentItem): void {
  documentsStore = [newDoc, ...documentsStore];
  documentListeners.forEach((fn) => fn());
}

export function deleteDocument(id: string): void {
  documentsStore = documentsStore.filter((d) => d.id !== id);
  documentListeners.forEach((fn) => fn());
}

export function renameDocument(id: string, newTitle: string): void {
  documentsStore = documentsStore.map((d) => (d.id === id ? { ...d, title: newTitle } : d));
  documentListeners.forEach((fn) => fn());
}

export function subscribeDocuments(listener: DocumentListener): () => void {
  documentListeners.add(listener);
  return () => {
    documentListeners.delete(listener);
  };
}

export const INITIAL_METRICS: MetricItem[] = getDashboardMetrics(INITIAL_DOCUMENTS);

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    action: 'Generated summary for',
    target: 'Annual Business Report 2026.pdf',
    timestamp: '25 mins ago',
    type: 'summary',
    date: '2026-11-01T23:25:00.000Z',
    docId: 'doc-1',
  },
  {
    id: 'act-2',
    action: 'Answered question in',
    target: 'Marketing Strategy.docx',
    timestamp: '2 hours ago',
    type: 'qa',
    date: '2026-11-01T21:40:00.000Z',
    docId: 'doc-3',
  },
  {
    id: 'act-3',
    action: 'Created conversation for',
    target: 'Product Research.pdf',
    timestamp: '5 hours ago',
    type: 'conversation',
    date: '2026-11-01T18:45:00.000Z',
    docId: 'doc-2',
  },
  {
    id: 'act-4',
    action: 'Completed processing for',
    target: 'Annual Business Report 2026.pdf',
    timestamp: 'Yesterday',
    type: 'processed',
    date: '2026-10-31T15:20:00.000Z',
    docId: 'doc-1',
  },
  {
    id: 'act-5',
    action: 'Uploaded new document',
    target: 'Annual Business Report 2026.pdf',
    timestamp: 'Oct 28, 2026',
    type: 'upload',
    date: '2026-10-28T09:14:00.000Z',
    docId: 'doc-1',
  },
  {
    id: 'act-6',
    action: 'Answered question in',
    target: 'Financial Overview.pdf',
    timestamp: 'Oct 27, 2026',
    type: 'qa',
    date: '2026-10-27T14:15:00.000Z',
    docId: 'doc-4',
  },
  {
    id: 'act-7',
    action: 'Completed processing for',
    target: 'Product Research.pdf',
    timestamp: 'Oct 24, 2026',
    type: 'processed',
    date: '2026-10-24T12:00:00.000Z',
    docId: 'doc-2',
  },
  {
    id: 'act-8',
    action: 'Uploaded new document',
    target: 'Product Research.pdf',
    timestamp: 'Oct 24, 2026',
    type: 'upload',
    date: '2026-10-24T11:45:00.000Z',
    docId: 'doc-2',
  },
  {
    id: 'act-9',
    action: 'Created conversation for',
    target: 'Marketing Strategy.docx',
    timestamp: 'Oct 22, 2026',
    type: 'conversation',
    date: '2026-10-22T09:20:00.000Z',
    docId: 'doc-3',
  },
  {
    id: 'act-10',
    action: 'Completed processing for',
    target: 'Marketing Strategy.docx',
    timestamp: 'Oct 21, 2026',
    type: 'processed',
    date: '2026-10-21T10:35:00.000Z',
    docId: 'doc-3',
  },
  {
    id: 'act-11',
    action: 'Uploaded new document',
    target: 'Marketing Strategy.docx',
    timestamp: 'Oct 21, 2026',
    type: 'upload',
    date: '2026-10-21T10:30:00.000Z',
    docId: 'doc-3',
  },
  {
    id: 'act-12',
    action: 'Generated summary for',
    target: 'Financial Overview.pdf',
    timestamp: 'Oct 20, 2026',
    type: 'summary',
    date: '2026-10-20T16:10:00.000Z',
    docId: 'doc-4',
  },
  {
    id: 'act-13',
    action: 'Completed processing for',
    target: 'Financial Overview.pdf',
    timestamp: 'Oct 19, 2026',
    type: 'processed',
    date: '2026-10-19T14:40:00.000Z',
    docId: 'doc-4',
  },
  {
    id: 'act-14',
    action: 'Uploaded new document',
    target: 'Financial Overview.pdf',
    timestamp: 'Oct 19, 2026',
    type: 'upload',
    date: '2026-10-19T14:30:00.000Z',
    docId: 'doc-4',
  },
  {
    id: 'act-15',
    action: 'Answered question in',
    target: 'Legal Agreement - NDA.pdf',
    timestamp: 'Oct 16, 2026',
    type: 'qa',
    date: '2026-10-16T15:20:00.000Z',
    docId: 'doc-5',
  },
  {
    id: 'act-16',
    action: 'Completed processing for',
    target: 'Legal Agreement - NDA.pdf',
    timestamp: 'Oct 15, 2026',
    type: 'processed',
    date: '2026-10-15T09:12:00.000Z',
    docId: 'doc-5',
  },
  {
    id: 'act-17',
    action: 'Uploaded new document',
    target: 'Legal Agreement - NDA.pdf',
    timestamp: 'Oct 15, 2026',
    type: 'upload',
    date: '2026-10-15T09:05:00.000Z',
    docId: 'doc-5',
  },
  {
    id: 'act-18',
    action: 'Answered question in',
    target: 'Q3 Earnings Transcript.txt',
    timestamp: 'Oct 12, 2026',
    type: 'qa',
    date: '2026-10-12T14:30:00.000Z',
    docId: 'doc-6',
  },
  {
    id: 'act-19',
    action: 'Completed processing for',
    target: 'Q3 Earnings Transcript.txt',
    timestamp: 'Oct 11, 2026',
    type: 'processed',
    date: '2026-10-11T11:20:00.000Z',
    docId: 'doc-6',
  },
  {
    id: 'act-20',
    action: 'Uploaded new document',
    target: 'Q3 Earnings Transcript.txt',
    timestamp: 'Oct 11, 2026',
    type: 'upload',
    date: '2026-10-11T11:15:00.000Z',
    docId: 'doc-6',
  },
];

export const SAMPLE_CONVERSATION: Record<string, WorkspaceMessage[]> = {
  'doc-1': [
    {
      id: 'msg-1',
      sender: 'user',
      content: 'What are the key drivers behind the 34% revenue growth reported for 2026?',
      timestamp: '10:14 AM',
    },
    {
      id: 'msg-2',
      sender: 'assistant',
      content:
        'Based on Section 2.1 (Revenue Breakdown, Page 14), the 34% year-over-year revenue growth is primarily driven by three factors:\n\n1. **Enterprise Tier Expansion**: A 52% increase in annual contract value (ACV) from accounts exceeding $50k ARR.\n2. **Net Revenue Retention (NRR)**: Reached 128%, driven by seat expansions and the document intelligence add-on module.\n3. **New Customer Acquisition**: 118 new mid-market and enterprise logos onboarded with an average time-to-value of 11 days.',
      timestamp: '10:14 AM',
      citations: [
        {
          documentTitle: 'Annual Business Report 2026.pdf',
          page: 14,
          quote: 'Enterprise cohort revenue expanded by 52% YoY, lifting total blended NRR to 128%.',
        },
        {
          documentTitle: 'Annual Business Report 2026.pdf',
          page: 19,
          quote: 'Gross margins for the SaaS intelligence platform sustained at 81.4% throughout Q3 and Q4.',
        },
      ],
    },
  ],
  'doc-2': [
    {
      id: 'msg-3',
      sender: 'user',
      content: 'Summarize the primary pain points discovered in user search behavior.',
      timestamp: '11:30 AM',
    },
    {
      id: 'msg-4',
      sender: 'assistant',
      content:
        'According to the user research synthesis (Pages 8-12):\n\n• **Format Fragmentation**: 74% of participants reported losing 2.5+ hours weekly switching between PDFs, Google Docs, and local file storage.\n• **Keyword Search Failures**: Traditional exact-match search failed to surface answers when phrasing differed from source documents.\n• **Citation Distrust**: Users demanded exact page-level source references before trusting extracted answers for executive briefings.',
      timestamp: '11:31 AM',
      citations: [
        {
          documentTitle: 'Product Research.pdf',
          page: 9,
          quote: '74% of knowledge workers cited multi-repository document search as their top productivity drain.',
        },
      ],
    },
  ],
};
