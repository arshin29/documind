import { DocumentItem, WorkspaceMessage } from './mock-data';

export interface SourceCitationData {
  documentTitle: string;
  page: number;
  section: string;
  quote: string;
}

export interface WorkspaceConversation {
  id: string;
  docId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: WorkspaceMessage[];
  totalQuestions?: number;
}

export const SUGGESTED_QUESTIONS = [
  'Summarise this document.',
  'What are the main findings?',
  'Extract important dates and figures.',
  'Explain the key concepts.',
  'What are the key conclusions?',
] as const;

export type SuggestedQuestion = (typeof SUGGESTED_QUESTIONS)[number];

// Initial mock conversations structured per document (18 total conversations, 142 total questions)
export const INITIAL_CONVERSATIONS: Record<string, WorkspaceConversation[]> = {
  'doc-1': [
    {
      id: 'conv-1-1',
      docId: 'doc-1',
      title: 'Revenue & Growth Breakdown',
      createdAt: 'Oct 28, 2026, 10:14 AM',
      updatedAt: '10:15 AM',
      totalQuestions: 12,
      messages: [
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
            'Based on **Section 2.1: Revenue Trajectory (Page 14)**, the 34% year-over-year revenue expansion is driven by three primary operational pillars:\n\n1. **Enterprise Tier Expansion**: A **52% increase** in annual contract value (ACV) from accounts exceeding $50k ARR.\n2. **Net Revenue Retention (NRR)**: Reached **128%**, driven by seat expansions and the document intelligence add-on module.\n3. **New Customer Acquisition**: 118 new mid-market and enterprise logos onboarded with an average time-to-value of 11 days.\n\n### Operational Summary\n| Metric | FY2025 | FY2026 | Growth |\n| :--- | :--- | :--- | :--- |\n| Blended ARR | $18.2M | $24.4M | +34.1% |\n| Enterprise Logos | 84 | 142 | +69.0% |\n| Gross Margin | 78.2% | 81.4% | +320 bps |',
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
    },
    {
      id: 'conv-1-2',
      docId: 'doc-1',
      title: 'FY2027 Capital Allocation',
      createdAt: 'Oct 27, 2026, 3:20 PM',
      updatedAt: '3:24 PM',
      totalQuestions: 8,
      messages: [
        {
          id: 'msg-prev-1',
          sender: 'user',
          content: 'What are the planned strategic investments for FY2027?',
          timestamp: '3:20 PM',
        },
        {
          id: 'msg-prev-2',
          sender: 'assistant',
          content:
            'According to **Section 4: Strategic Roadmaps & CapEx (Page 38)**, management has prioritized two strategic investment pools for FY2027:\n\n• **Core Infrastructure & R&D**: $4.8M allocated for distributed vector search and private model residency.\n• **Global Go-to-Market**: $3.2M earmarked for European data sovereignty expansion and local sales pods.',
          timestamp: '3:24 PM',
          citations: [
            {
              documentTitle: 'Annual Business Report 2026.pdf',
              page: 38,
              quote: 'Strategic CapEx allocation commits $8.0M to vector infrastructure and geographic compliance.',
            },
          ],
        },
      ],
    },
    {
      id: 'conv-1-3',
      docId: 'doc-1',
      title: 'Operating Margin Optimization',
      createdAt: 'Oct 24, 2026, 11:05 AM',
      updatedAt: '11:15 AM',
      totalQuestions: 7,
      messages: [
        {
          id: 'msg-1-3-1',
          sender: 'user',
          content: 'How did operating margins improve across H2?',
          timestamp: '11:05 AM',
        },
        {
          id: 'msg-1-3-2',
          sender: 'assistant',
          content:
            'Operating margins improved by 320 basis points to 81.4%, primarily driven by reduced cloud compute unit costs and automated document extraction workflows.',
          timestamp: '11:06 AM',
        },
      ],
    },
    {
      id: 'conv-1-4',
      docId: 'doc-1',
      title: 'Enterprise Contract Expansion',
      createdAt: 'Oct 20, 2026, 02:15 PM',
      updatedAt: '02:22 PM',
      totalQuestions: 6,
      messages: [
        {
          id: 'msg-1-4-1',
          sender: 'user',
          content: 'What is the average contract duration for enterprise accounts?',
          timestamp: '02:15 PM',
        },
        {
          id: 'msg-1-4-2',
          sender: 'assistant',
          content:
            'Multi-year commitments represent 68% of enterprise ARR, with an average initial term length of 24.5 months.',
          timestamp: '02:16 PM',
        },
      ],
    },
    {
      id: 'conv-1-5',
      docId: 'doc-1',
      title: 'Executive Compensation & Headcount',
      createdAt: 'Oct 14, 2026, 04:30 PM',
      updatedAt: '04:38 PM',
      totalQuestions: 5,
      messages: [
        {
          id: 'msg-1-5-1',
          sender: 'user',
          content: 'Summarize planned headcount additions for engineering.',
          timestamp: '04:30 PM',
        },
        {
          id: 'msg-1-5-2',
          sender: 'assistant',
          content:
            'Engineering headcount is projected to grow by 18 net new roles in Q1 and Q2, focusing on distributed systems and vector database indexing.',
          timestamp: '04:31 PM',
        },
      ],
    },
    {
      id: 'conv-1-6',
      docId: 'doc-1',
      title: 'Blended NRR & Customer Retention',
      createdAt: 'Oct 06, 2026, 09:45 AM',
      updatedAt: '09:50 AM',
      totalQuestions: 4,
      messages: [
        {
          id: 'msg-1-6-1',
          sender: 'user',
          content: 'What cohorts drove the highest net retention rate?',
          timestamp: '09:45 AM',
        },
        {
          id: 'msg-1-6-2',
          sender: 'assistant',
          content:
            'The FY2024 enterprise cohort reached 134% NRR through document automation license expansions.',
          timestamp: '09:46 AM',
        },
      ],
    },
  ],
  'doc-2': [
    {
      id: 'conv-2-1',
      docId: 'doc-2',
      title: 'User Friction Points Synthesis',
      createdAt: 'Oct 25, 2026, 11:30 AM',
      updatedAt: '11:31 AM',
      totalQuestions: 11,
      messages: [
        {
          id: 'msg-3',
          sender: 'user',
          content: 'Summarise the primary pain points discovered in user search behavior.',
          timestamp: '11:30 AM',
        },
        {
          id: 'msg-4',
          sender: 'assistant',
          content:
            'According to the user research synthesis (**Pages 8-12: Field Discovery**):\n\n• **Format Fragmentation**: 74% of participants reported losing 2.5+ hours weekly switching between PDFs, Docs, and cloud storage.\n• **Keyword Search Failures**: Traditional exact-match search failed to surface answers when phrasing differed from source documents.\n• **Citation Distrust**: Users demanded exact page-level source references before trusting extracted answers for executive briefings.',
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
    },
    {
      id: 'conv-2-2',
      docId: 'doc-2',
      title: 'Citation Distrust & Source Referencing',
      createdAt: 'Oct 22, 2026, 01:15 PM',
      updatedAt: '01:25 PM',
      totalQuestions: 8,
      messages: [
        {
          id: 'msg-2-2-1',
          sender: 'user',
          content: 'What percentage of knowledge workers require exact page citations?',
          timestamp: '01:15 PM',
        },
        {
          id: 'msg-2-2-2',
          sender: 'assistant',
          content:
            'Trust scores increased from 41% to 89% when answers displayed exact page number references alongside extracted quotes.',
          timestamp: '01:16 PM',
        },
      ],
    },
    {
      id: 'conv-2-3',
      docId: 'doc-2',
      title: 'Multi-Format Document Workflow Analysis',
      createdAt: 'Oct 17, 2026, 10:40 AM',
      updatedAt: '10:50 AM',
      totalQuestions: 6,
      messages: [
        {
          id: 'msg-2-3-1',
          sender: 'user',
          content: 'Which file formats caused the most user friction?',
          timestamp: '10:40 AM',
        },
        {
          id: 'msg-2-3-2',
          sender: 'assistant',
          content:
            'Scanned PDFs without OCR and formatted docx tables were cited by 82% of respondents as difficult to search reliably.',
          timestamp: '10:41 AM',
        },
      ],
    },
    {
      id: 'conv-2-4',
      docId: 'doc-2',
      title: 'Search Latency & User Productivity',
      createdAt: 'Oct 10, 2026, 03:25 PM',
      updatedAt: '03:32 PM',
      totalQuestions: 5,
      messages: [
        {
          id: 'msg-2-4-1',
          sender: 'user',
          content: 'What is the acceptable latency threshold for answer generation?',
          timestamp: '03:25 PM',
        },
        {
          id: 'msg-2-4-2',
          sender: 'assistant',
          content:
            'Users consider responses under 2.5 seconds to feel interactive, with streaming initial tokens critical for perceived speed.',
          timestamp: '03:26 PM',
        },
      ],
    },
  ],
  'doc-3': [
    {
      id: 'conv-3-1',
      docId: 'doc-3',
      title: 'Target CAC & Payback Assumptions',
      createdAt: 'Oct 22, 2026, 09:20 AM',
      updatedAt: '09:28 AM',
      totalQuestions: 9,
      messages: [
        {
          id: 'msg-3-1-1',
          sender: 'user',
          content: 'What are the target CAC and payback period assumptions?',
          timestamp: '09:20 AM',
        },
        {
          id: 'msg-3-1-2',
          sender: 'assistant',
          content:
            'Blended target customer acquisition cost is modeled at $4,200 with an expected payback period of 8.5 months for mid-market accounts.',
          timestamp: '09:21 AM',
        },
      ],
    },
    {
      id: 'conv-3-2',
      docId: 'doc-3',
      title: 'Developer Advocacy & Organic Inbound',
      createdAt: 'Oct 18, 2026, 02:45 PM',
      updatedAt: '02:55 PM',
      totalQuestions: 7,
      messages: [
        {
          id: 'msg-3-2-1',
          sender: 'user',
          content: 'How will developer evangelism contribute to top-of-funnel pipeline?',
          timestamp: '02:45 PM',
        },
        {
          id: 'msg-3-2-2',
          sender: 'assistant',
          content:
            'Open-source connectors and developer documentation tutorials are projected to drive 38% of qualified enterprise inbound inquiries.',
          timestamp: '02:46 PM',
        },
      ],
    },
    {
      id: 'conv-3-3',
      docId: 'doc-3',
      title: 'PLG Trial Onboarding Funnel',
      createdAt: 'Oct 12, 2026, 11:10 AM',
      updatedAt: '11:18 AM',
      totalQuestions: 6,
      messages: [
        {
          id: 'msg-3-3-1',
          sender: 'user',
          content: 'What is the targeted free-to-paid conversion rate for self-serve signups?',
          timestamp: '11:10 AM',
        },
        {
          id: 'msg-3-3-2',
          sender: 'assistant',
          content:
            'Target self-serve trial-to-paid conversion rate is 4.8%, supported by in-app interactive tutorials and automated onboarding sequences.',
          timestamp: '11:11 AM',
        },
      ],
    },
  ],
  'doc-4': [
    {
      id: 'conv-4-1',
      docId: 'doc-4',
      title: 'Cash Runway Under Accelerated Hiring',
      createdAt: 'Oct 20, 2026, 04:00 PM',
      updatedAt: '04:12 PM',
      totalQuestions: 10,
      messages: [
        {
          id: 'msg-4-1-1',
          sender: 'user',
          content: 'How many months of runway are projected under accelerated hiring?',
          timestamp: '04:00 PM',
        },
        {
          id: 'msg-4-1-2',
          sender: 'assistant',
          content:
            'Under aggressive hiring assumptions (+35 FTEs), projected cash runway extends 22 months, compared to 31 months under baseline operations.',
          timestamp: '04:01 PM',
        },
      ],
    },
    {
      id: 'conv-4-2',
      docId: 'doc-4',
      title: 'Infrastructure CapEx Projections',
      createdAt: 'Oct 16, 2026, 01:30 PM',
      updatedAt: '01:40 PM',
      totalQuestions: 8,
      messages: [
        {
          id: 'msg-4-2-1',
          sender: 'user',
          content: 'What are the main capital expenditures for cloud hardware?',
          timestamp: '01:30 PM',
        },
        {
          id: 'msg-4-2-2',
          sender: 'assistant',
          content:
            'Dedicated GPU inference clusters and multi-region failover hardware account for $1.4M in committed infrastructure spend.',
          timestamp: '01:31 PM',
        },
      ],
    },
    {
      id: 'conv-4-3',
      docId: 'doc-4',
      title: 'Balance Sheet & Debt Service Ratios',
      createdAt: 'Oct 08, 2026, 10:50 AM',
      updatedAt: '10:58 AM',
      totalQuestions: 6,
      messages: [
        {
          id: 'msg-4-3-1',
          sender: 'user',
          content: 'What is the current ratio and debt-to-equity status?',
          timestamp: '10:50 AM',
        },
        {
          id: 'msg-4-3-2',
          sender: 'assistant',
          content:
            'The balance sheet maintains a strong current ratio of 3.8x with zero long-term funded debt obligations.',
          timestamp: '10:51 AM',
        },
      ],
    },
  ],
  'doc-5': [
    {
      id: 'conv-5-1',
      docId: 'doc-5',
      title: 'Confidentiality Obligations & Survival Clauses',
      createdAt: 'Oct 16, 2026, 03:10 PM',
      updatedAt: '03:22 PM',
      totalQuestions: 12,
      messages: [
        {
          id: 'msg-5-1-1',
          sender: 'user',
          content: 'What is the duration of confidentiality obligations after termination?',
          timestamp: '03:10 PM',
        },
        {
          id: 'msg-5-1-2',
          sender: 'assistant',
          content:
            'Confidentiality obligations survive for three (3) years post termination, except trade secrets which survive indefinitely.',
          timestamp: '03:11 PM',
        },
      ],
    },
  ],
  'doc-6': [
    {
      id: 'conv-6-1',
      docId: 'doc-6',
      title: 'Analyst Q&A on Enterprise Churn',
      createdAt: 'Oct 12, 2026, 02:00 PM',
      updatedAt: '02:15 PM',
      totalQuestions: 12,
      messages: [
        {
          id: 'msg-6-1-1',
          sender: 'user',
          content: 'What was leadership commentary on customer retention trends?',
          timestamp: '02:00 PM',
        },
        {
          id: 'msg-6-1-2',
          sender: 'assistant',
          content:
            'Leadership noted gross logo churn remained below 0.6% monthly, with expansions offsetting downsells across all cohorts.',
          timestamp: '02:01 PM',
        },
      ],
    },
  ],
};

// Generates simulated grounded responses tailored to the question and document
export function generateMockAnswer(doc: DocumentItem, query: string): {
  content: string;
  citations: SourceCitationData[];
} {
  const normalized = query.toLowerCase().trim();
  const maxPages = doc.pages || 12;
  const p1 = Math.min(Math.max(1, Math.floor(maxPages * 0.2)), maxPages);
  const p2 = Math.min(Math.max(2, Math.floor(maxPages * 0.55)), maxPages);

  // 1. "Summarise this document"
  if (normalized.includes('summar') || normalized.includes('overview')) {
    return {
      content: `### Executive Summary: ${doc.title}

${doc.summary}

#### Key Structural Themes
• **Primary Objective**: Clarify strategic operations and progress regarding **${doc.keyTopics[0] || 'core initiatives'}**.
• **Execution Track**: Milestones completed in line with specifications noted by **${doc.author || 'the research lead'}**.
• **Scope & Depth**: Synthesized across **${doc.pages || 10} pages** and **${doc.chunksCount} parsed vector chunks**.

#### Recommended Next Steps
1. Review the comparative benchmarks on **Page ${p1}**.
2. Examine the detailed implementation breakdown on **Page ${p2}**.`,
      citations: [
        {
          documentTitle: doc.title,
          page: p1,
          section: 'Section 1: Executive Brief',
          quote: doc.summary.slice(0, 110) + '...',
        },
        {
          documentTitle: doc.title,
          page: p2,
          section: 'Section 3: Detailed Review',
          quote: `Cross-departmental findings identify high momentum in ${doc.keyTopics[1] || 'operational scaling'}.`,
        },
      ],
    };
  }

  // 2. "What are the main findings?"
  if (normalized.includes('finding') || normalized.includes('main point') || normalized.includes('takeaway')) {
    return {
      content: `### Core Findings in ${doc.title}

Analysis of the document highlights three central findings:

1. **Strategic Prioritization of ${doc.keyTopics[0] || 'Core Objectives'}**:
   The report confirms significant positive variance against baseline expectations, with operational efficiency improving markedly over the recorded period.

2. **Impact on ${doc.keyTopics[1] || 'Secondary Systems'}**:
   Risk assessments outlined in the technical review indicate minimal exposure, provided resource reallocation remains on schedule.

3. **Organizational Alignment**:
   Cross-functional teams have standardized procedures around key performance metrics to ensure transparent milestone delivery.

### Benchmark Comparison
| Metric Area | Target | Reported Status | Variance |
| :--- | :--- | :--- | :--- |
| Priority Goals | 100% | 104% | +4% |
| SLA Adherence | > 99.0% | 99.7% | +0.7% |
| Efficiency Gain | +15% | +22% | +7% |`,
      citations: [
        {
          documentTitle: doc.title,
          page: p1,
          section: 'Section 2: Key Findings Matrix',
          quote: `Observed positive trends across ${doc.keyTopics[0] || 'operational pillars'} consistently outpaced initial forecasts.`,
        },
      ],
    };
  }

  // 3. "Extract important dates and figures"
  if (normalized.includes('date') || normalized.includes('figure') || normalized.includes('number') || normalized.includes('metric')) {
    return {
      content: `### Key Dates & Figures Extracted

Here are the verifiable dates, measurements, and numerical milestones identified in **${doc.title}**:

#### Critical Dates & Milestones
- **${doc.dateAdded}**: Document ingestion, verification, and audit sign-off.
- **End of Q2**: Completion of milestone evaluations for primary workstreams.
- **Fiscal Year 2027**: Target deadline for strategic system enhancements.

#### Financial & Operational Figures
- **Document Volume**: ${doc.pages || 10} indexed pages, ${doc.chunksCount} vectorized semantic segments.
- **File Footprint**: ${doc.size} compressed binary payload.
- **Reliability Index**: 99.8% semantic extraction confidence across table and textual blocks.
- **Cohort Performance**: +34% operational gain reported across primary deliverables.`,
      citations: [
        {
          documentTitle: doc.title,
          page: p1,
          section: 'Section 1.3: Audit & Metrics Schedule',
          quote: `Published and ratified on ${doc.dateAdded} with verified parameters.`,
        },
        {
          documentTitle: doc.title,
          page: p2,
          section: 'Section 4: Quantitative Appendix',
          quote: `Total measured volume covers ${doc.pages || 10} pages with exhaustive index coverage.`,
        },
      ],
    };
  }

  // 4. "Explain the key concepts"
  if (normalized.includes('concept') || normalized.includes('explain') || normalized.includes('term')) {
    return {
      content: `### Conceptual Framework in ${doc.title}

The document establishes several foundational concepts:

• **${doc.keyTopics[0] || 'Domain Architecture'}**:
  Defined as the structural framework through which data and deliverables are coordinated across business units.

• **${doc.keyTopics[1] || 'Operational Optimization'}**:
  Refers to the automated reduction of retrieval friction and the institutionalization of reproducible workflows.

• **${doc.keyTopics[2] || 'Compliance & Governance'}**:
  The regulatory standards governing privacy, storage quotas, and verification protocols enforced across all iterations.`,
      citations: [
        {
          documentTitle: doc.title,
          page: p2,
          section: 'Section 2.2: Definitions & Terminology',
          quote: `Foundational taxonomy establishes precise standards for ${doc.keyTopics[0] || 'programmatic review'}.`,
        },
      ],
    };
  }

  // 5. "What are the key conclusions?"
  if (normalized.includes('conclusion') || normalized.includes('recommend') || normalized.includes('outcome')) {
    return {
      content: `### Key Conclusions & Strategic Recommendations

Based on the concluding sections of **${doc.title}**:

1. **Strategic Viability Confirmed**:
   The initiatives presented demonstrate sustained viability with strong alignment to organization-wide targets.

2. **Resource Optimization**:
   Immediate focus should remain on scaling proven workflows while automating repetitive validation tasks.

3. **Risk Mitigation**:
   Continuous oversight of **${doc.keyTopics[0] || 'core deliverables'}** will ensure stability throughout future expansions.`,
      citations: [
        {
          documentTitle: doc.title,
          page: maxPages,
          section: `Section 5: Final Summary (Page ${maxPages})`,
          quote: `Final executive sign-off confirms all stated targets were met or exceeded for the evaluated period.`,
        },
      ],
    };
  }

  // Default intelligent contextual answer
  return {
    content: `Based on **${doc.title}** regarding *"${query}"*:

The document provides specific context centered around **${doc.keyTopics[0] || 'strategic initiatives'}** and **${doc.keyTopics[1] || 'performance metrics'}**.

• **Relevant Context**: The material indicates strong focus on achieving sustainable results as outlined in the executive summary.
• **Document Evidence**: Detailed analysis on **Page ${p1}** corroborates that workstream progress aligns with targets established by ${doc.author || 'leadership'}.
• **Actionable Takeaway**: Stakeholders are advised to reference the detailed appendices for comprehensive cross-tabulations.`,
    citations: [
      {
        documentTitle: doc.title,
        page: p1,
        section: 'Section 2: Analysis & Context',
        quote: `Empirical findings confirm measurable progress across key focus areas.`,
      },
    ],
  };
}
