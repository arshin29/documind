export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  pages: ExtractedPage[];
  totalPages: number;
  fullText: string;
}

