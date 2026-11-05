import { Injectable, BadRequestException } from '@nestjs/common';
import { ExtractedDocument, ExtractedPage } from './text-extractor.interface';

@Injectable()
export class TxtExtractorService {
  async extract(buffer: Buffer): Promise<ExtractedDocument> {
    if (!buffer || buffer.length === 0) {
      return {
        pages: [],
        totalPages: 0,
        fullText: '',
      };
    }

    try {
      let text = buffer.toString('utf-8');

      // Strip UTF-8 Byte Order Mark (BOM) if present
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
      }

      // Check for form feed page breaks (\f)
      const rawPages = text.split('\f');
      const pages: ExtractedPage[] = rawPages.map((pageText, idx) => ({
        pageNumber: idx + 1,
        text: pageText.trim(),
      }));

      const totalPages = Math.max(pages.length, 1);
      const fullText = text.trim();

      return {
        pages,
        totalPages,
        fullText,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to decode text file: ${(error as Error).message}`,
      );
    }
  }
}

