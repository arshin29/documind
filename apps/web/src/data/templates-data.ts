export interface DocumentTemplate {
  id: string;
  title: string;
  category: 'Executive' | 'Technical' | 'Meeting' | 'Operations' | 'Research';
  description: string;
  tags: string[];
  icon: string;
  content: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'executive-summary',
    title: 'Executive Brief & Strategy',
    category: 'Executive',
    description: 'High-level business brief outlining problem statement, strategic objectives, financial impact, and key milestones.',
    tags: ['Strategy', 'Leadership', 'Roadmap'],
    icon: 'Briefcase',
    content: `# Executive Summary & Strategic Brief

## 1. Problem Statement & Market Opportunity
Provide a concise overview of the core problem, customer pain points, and current business context.

## 2. Strategic Objectives
- **Objective 1:** Description and target outcome.
- **Objective 2:** Description and target outcome.
- **Objective 3:** Description and target outcome.

## 3. Financial Impact & Resource Allocation
- **Estimated Budget:** $0.00
- **Projected ROI:** Description of expected returns and timeline.
- **Key Team Resources:** Core stakeholders and functional owners.

## 4. Key Milestones & Target Timeline
| Milestone | Target Date | Owner | Status |
| :--- | :--- | :--- | :--- |
| Phase 1: Planning & Alignment | 2026-Q1 | Lead | In Progress |
| Phase 2: Ingestion & Beta | 2026-Q2 | Engineering | Planned |
| Phase 3: General Availability | 2026-Q3 | Operations | Planned |

## 5. Risks & Mitigation Strategies
Outline potential regulatory, operational, or technical risks and corresponding mitigations.
`,
  },
  {
    id: 'tech-rfc',
    title: 'Technical Architecture & RFC',
    category: 'Technical',
    description: 'Engineering request for comments covering architectural design, API schemas, security constraints, and rollout plan.',
    tags: ['Engineering', 'Architecture', 'RFC'],
    icon: 'Code2',
    content: `# Request for Comments (RFC): Architecture Specification

## 1. Abstract
Brief 2-3 sentence overview of the proposed architectural change or system design.

## 2. Context & Motivation
Explain the current state limitations, performance bottlenecks, or business reasons necessitating this architectural change.

## 3. Detailed Design
### 3.1 Data Flow Diagram
Describe components, event pipelines, and storage engines.

### 3.2 API Contracts & Interfaces
\`\`\`typescript
interface RequestPayload {
  workspaceId: string;
  query: string;
  limit: number;
}
\`\`\`

### 3.3 Security, Privacy & Compliance
- Data isolation per tenant/workspace.
- Token authorization and rate limiting.
- Encryption at rest and in transit.

## 4. Alternatives Considered
Discuss alternative approaches and why the chosen architecture was preferred.

## 5. Rollout, Testing & Rollback Plan
- **Verification Strategy:** Unit, integration, and load tests.
- **Deployment Steps:** Canary release schedule.
- **Rollback Triggers:** Error budget thresholds and fallback mechanisms.
`,
  },
  {
    id: 'meeting-notes',
    title: 'Team Sync & Action Items',
    category: 'Meeting',
    description: 'Structured meeting template with agenda items, real-time discussion notes, decisions made, and assigned action items.',
    tags: ['Meeting', 'Productivity', 'Collaboration'],
    icon: 'Users',
    content: `# Meeting Notes & Action Items

**Date:** ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}  
**Attendees:** Team Leads, Product, Engineering  
**Facilitator:** Product Manager  

---

## 1. Agenda
1. Review sprint progress and release blockers.
2. Ingestion pipeline throughput metrics.
3. RAG retrieval precision analysis.
4. Next sprint priorities.

## 2. Discussion & Updates
- **Update 1:** Summarize key progress points discussed.
- **Update 2:** Outline identified blockers or dependencies.

## 3. Decisions Reached
- [x] Decision 1: Consensus on database indexing strategy.
- [ ] Decision 2: Pending sign-off on Q4 budget allocation.

## 4. Action Items & Owners
- [ ] **Action Item 1** - Assigned to: @name (Due: Friday)
- [ ] **Action Item 2** - Assigned to: @name (Due: Next Sprint)
`,
  },
  {
    id: 'sop-standard-operating-procedure',
    title: 'Standard Operating Procedure (SOP)',
    category: 'Operations',
    description: 'Standardized procedure guide with step-by-step instructions, quality checkpoints, prerequisites, and escalation paths.',
    tags: ['Operations', 'SOP', 'Quality'],
    icon: 'FileCheck',
    content: `# Standard Operating Procedure (SOP)

**Procedure Title:** Knowledge Base Ingestion & Verification  
**Document ID:** SOP-OPS-012  
**Effective Date:** 2026-01-01  
**Version:** 1.0  

---

## 1. Purpose
Define the standard operational workflow for onboarding new document repositories into DocuMind.

## 2. Scope & Prerequisites
- Appropriate workspace administrator permissions.
- Valid API credentials and vector database access.

## 3. Step-by-Step Procedure
1. **Pre-Ingestion Inspection:** Validate document file format (PDF, DOCX, TXT) and verify file size under 50 MB.
2. **Chunking & Embedding:** Execute ingestion with standard 1,000 character chunks and 150 character overlap.
3. **Index Verification:** Validate that cosine vector indexing is completed and search queries return relevance scores > 0.50.
4. **Access Control Check:** Ensure document workspace boundaries are enforced for non-member roles.

## 4. Troubleshooting & Escalation
Contact engineering on-call if embedding generation exceeds 60 seconds per document batch.
`,
  },
  {
    id: 'qbr-quarterly-review',
    title: 'Quarterly Business Review (QBR)',
    category: 'Executive',
    description: 'Comprehensive business review covering quarterly achievements, KPI performance, pipeline health, and upcoming targets.',
    tags: ['Review', 'Quarterly', 'Metrics'],
    icon: 'TrendingUp',
    content: `# Quarterly Business Review (QBR)

**Period:** Q4 2026  
**Department:** Product & Platform Intelligence  

---

## 1. Executive Summary
Brief summary of quarterly performance highlights, milestone completions, and strategic position.

## 2. KPI Performance Dashboard
| Metric | Q4 Target | Actual Result | Delta (%) | Status |
| :--- | :--- | :--- | :--- | :--- |
| Document Ingestion (Total) | 50,000 | 68,400 | +36.8% | Achieved |
| Retrieval Accuracy | > 92% | 96.4% | +4.4% | Achieved |
| Active User Retention | 85% | 88.2% | +3.2% | Achieved |
| API P95 Response Latency | < 600ms | 420ms | -30.0% | Achieved |

## 3. Key Achievements & Learnings
- Successfully deployed multi-chunk grounding prompt for Gemini integration.
- Resolved semantic search similarity threshold edge cases.

## 4. Next Quarter Strategic Objectives
1. Roll out real-time streaming RAG responses.
2. Launch organization-wide template library.
`,
  },
  {
    id: 'research-synthesis',
    title: 'Research & Knowledge Synthesis',
    category: 'Research',
    description: 'Research synthesis template for consolidating findings, comparative evaluations, citations, and strategic recommendations.',
    tags: ['Research', 'Analysis', 'Insights'],
    icon: 'BookOpen',
    content: `# Research & Knowledge Synthesis

**Topic:** Enterprise RAG Architecture & Context Window Strategies  
**Researcher:** AI Research Team  
**Date:** ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}  

---

## 1. Core Hypothesis & Objectives
What questions are we seeking to answer with this synthesis?

## 2. Key Findings & Extracted Evidence
- **Finding 1:** Context relevance increases by 24% when chunks include 15% overlap.
- **Finding 2:** Multi-source citation synthesis prevents false-negative grounding rejections.

## 3. Comparative Matrix
| Parameter | Dense Retrieval (Vector) | Hybrid (Dense + BM25) | Pure Keyword |
| :--- | :--- | :--- | :--- |
| Semantic Precision | High | Very High | Low |
| Latency Overhead | ~45ms | ~65ms | ~15ms |
| Implementation Complexity | Moderate | High | Low |

## 4. Recommendations & Next Steps
Actionable next steps based on the findings above.
`,
  },
];

