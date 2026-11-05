import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { ExtractedDocument, ExtractedPage } from './text-extractor.interface';

@Injectable()
export class DocxExtractorService {
  private readonly logger = new Logger(DocxExtractorService.name);

  async extract(buffer: Buffer): Promise<ExtractedDocument> {
    if (!buffer || buffer.length === 0) {
      return {
        pages: [],
        totalPages: 0,
        fullText: '',
      };
    }

    try {
      const result = await mammoth.extractRawText({ buffer });
      const rawText = (result.value || '').trim();

      if (!rawText) {
        return {
          pages: [{ pageNumber: 1, text: '' }],
          totalPages: 1,
          fullText: '',
        };
      }

      // Check for page breaks (\f form feed) or treat as single page document
      const rawPages = rawText.split('\f');
      const pages: ExtractedPage[] = rawPages.map((text, idx) => ({
        pageNumber: idx + 1,
        text: text.trim(),
      }));

      return {
        pages,
        totalPages: pages.length,
        fullText: rawText,
      };
    } catch (error) {
      this.logger.error(`DOCX extraction failed: ${(error as Error).message}`);
      throw new BadRequestException(
        `Failed to extract text from DOCX: ${(error as Error).message}`,
      );
    }
  }
}

