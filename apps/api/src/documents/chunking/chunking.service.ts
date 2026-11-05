import { Injectable } from '@nestjs/common';
import { ExtractedDocument } from '../extraction/text-extractor.interface';

export interface DocumentChunkData {
  chunkIndex: number;
  pageNumber: number;
  content: string;
  metadata: {
    charLength: number;
    wordCount: number;
    pageNumber: number;
  };
}

export interface ChunkingOptions {
  targetChunkSize?: number;
  chunkOverlap?: number;
}

@Injectable()
export class ChunkingService {
  private readonly DEFAULT_CHUNK_SIZE = 600;
  private readonly DEFAULT_OVERLAP = 100;

  /**
   * Split an extracted document into structured chunks with page awareness
   */
  chunk(
    document: ExtractedDocument,
    options?: ChunkingOptions,
  ): DocumentChunkData[] {
    const targetSize = options?.targetChunkSize ?? this.DEFAULT_CHUNK_SIZE;
    const overlap = options?.chunkOverlap ?? this.DEFAULT_OVERLAP;

    const chunks: DocumentChunkData[] = [];
    let currentChunkIndex = 0;

    for (const page of document.pages) {
      const pageText = (page.text || '').trim();
      if (!pageText) continue;

      if (pageText.length <= targetSize) {
        chunks.push(
          this.createChunk(currentChunkIndex++, page.pageNumber, pageText),
        );
        continue;
      }

      // Split page text into overlapping windows
      let startIndex = 0;
      while (startIndex < pageText.length) {
        let endIndex = startIndex + targetSize;

        if (endIndex >= pageText.length) {
          const slice = pageText.substring(startIndex).trim();
          if (slice) {
            chunks.push(
              this.createChunk(currentChunkIndex++, page.pageNumber, slice),
            );
          }
          break;
        }

        // Find boundary (newline, sentence end, or whitespace) within the last 100 chars
        const lookbackWindow = pageText.substring(
          Math.max(startIndex, endIndex - 100),
          endIndex,
        );

        let splitOffset = -1;
        const sentenceEndMatch = lookbackWindow.search(/[.!?]\s+(?=[A-Z0-9])/);
        if (sentenceEndMatch !== -1) {
          splitOffset =
            endIndex - (lookbackWindow.length - sentenceEndMatch) + 1;
        } else {
          const spaceMatch = lookbackWindow.lastIndexOf(' ');
          if (spaceMatch !== -1) {
            splitOffset = endIndex - (lookbackWindow.length - spaceMatch);
          }
        }

        const effectiveEnd = splitOffset > startIndex ? splitOffset : endIndex;
        const chunkContent = pageText
          .substring(startIndex, effectiveEnd)
          .trim();

        if (chunkContent) {
          chunks.push(
            this.createChunk(
              currentChunkIndex++,
              page.pageNumber,
              chunkContent,
            ),
          );
        }

        // Advance start with overlap, aligning to word boundary to avoid slicing words
        let nextStart = Math.max(startIndex + 1, effectiveEnd - overlap);
        if (
          nextStart < pageText.length &&
          nextStart > 0 &&
          !/\s/.test(pageText[nextStart - 1]) &&
          !/\s/.test(pageText[nextStart])
        ) {
          const nextSpace = pageText.indexOf(' ', nextStart);
          if (nextSpace !== -1 && nextSpace < effectiveEnd) {
            nextStart = nextSpace + 1;
          }
        }
        startIndex = nextStart;
      }
    }

    return chunks;
  }

  private createChunk(
    chunkIndex: number,
    pageNumber: number,
    content: string,
  ): DocumentChunkData {
    const trimmed = content.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

    return {
      chunkIndex,
      pageNumber,
      content: trimmed,
      metadata: {
        charLength: trimmed.length,
        wordCount,
        pageNumber,
      },
    };
  }
}

