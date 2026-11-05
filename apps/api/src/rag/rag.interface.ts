export interface DocumentCitation {
  documentId: string;
  documentTitle: string;
  originalFilename: string;
  originalName: string;
  chunkId: string;
  pageNumber: number | null;
  page: number;
  section?: string;
  quote: string;
  snippet: string;
  similarityScore: number;
}

export interface RagAnswerResult {
  answer: string;
  citations: DocumentCitation[];
  retrievedChunksCount: number;
}

export type RagStreamEvent =
  | { type: 'token'; token: string }
  | { type: 'citations'; citations: DocumentCitation[] }
  | { type: 'done'; answer: string; citations: DocumentCitation[] };

