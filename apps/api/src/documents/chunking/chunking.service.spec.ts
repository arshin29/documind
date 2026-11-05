import { Test, TestingModule } from '@nestjs/testing';
import { ChunkingService } from './chunking.service';
import { ExtractedDocument } from '../extraction/text-extractor.interface';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChunkingService],
    }).compile();

    service = module.get<ChunkingService>(ChunkingService);
  });

  it('should return empty chunks array when document has no text', () => {
    const doc: ExtractedDocument = {
      pages: [],
      totalPages: 0,
      fullText: '',
    };
    const chunks = service.chunk(doc);
    expect(chunks).toEqual([]);
  });

  it('should create a single chunk when page text is smaller than targetChunkSize', () => {
    const shortText = 'This is a concise introductory paragraph about DocuMind architecture.';
    const doc: ExtractedDocument = {
      pages: [{ pageNumber: 1, text: shortText }],
      totalPages: 1,
      fullText: shortText,
    };

    const chunks = service.chunk(doc, { targetChunkSize: 500, chunkOverlap: 50 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].content).toBe(shortText);
    expect(chunks[0].metadata.charLength).toBe(shortText.length);
    expect(chunks[0].metadata.wordCount).toBe(shortText.split(/\s+/).length);
    expect(chunks[0].metadata.pageNumber).toBe(1);
  });

  it('should split long text into multiple chunks with overlap', () => {
    const sentences = [
      'DocuMind is an intelligent document management platform designed for enterprise scale.',
      'It supports secure multi-tenant workspaces, automated text extraction, and granular role permissions.',
      'Files are validated at the byte level to prevent path traversal and arbitrary code execution.',
      'Extracted text is split into contextual chunks to prepare for future vector embeddings.',
      'All operations track comprehensive audit activities in PostgreSQL.',
    ];
    const longText = sentences.join(' ');

    const doc: ExtractedDocument = {
      pages: [{ pageNumber: 1, text: longText }],
      totalPages: 1,
      fullText: longText,
    };

    // Small chunk size of 150 chars to force multiple chunks
    const chunks = service.chunk(doc, { targetChunkSize: 150, chunkOverlap: 30 });
    expect(chunks.length).toBeGreaterThan(1);

    // Verify sequential chunk indexing
    chunks.forEach((chunk, index) => {
      expect(chunk.chunkIndex).toBe(index);
      expect(chunk.pageNumber).toBe(1);
      expect(chunk.content.length).toBeGreaterThan(0);
      expect(chunk.metadata.charLength).toBe(chunk.content.length);
      expect(chunk.metadata.wordCount).toBeGreaterThan(0);
    });
  });

  it('should preserve distinct page numbers across multiple pages', () => {
    const doc: ExtractedDocument = {
      pages: [
        { pageNumber: 1, text: 'Page 1 text overview.' },
        { pageNumber: 2, text: 'Page 2 financial results.' },
        { pageNumber: 3, text: 'Page 3 concluding remarks.' },
      ],
      totalPages: 3,
      fullText: 'Page 1 text overview.\n\nPage 2 financial results.\n\nPage 3 concluding remarks.',
    };

    const chunks = service.chunk(doc);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].pageNumber).toBe(2);
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[2].pageNumber).toBe(3);
    expect(chunks[2].chunkIndex).toBe(2);
  });
});

