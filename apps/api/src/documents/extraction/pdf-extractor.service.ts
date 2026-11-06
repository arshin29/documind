import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import pdf = require('pdf-parse');
import { ExtractedDocument, ExtractedPage } from './text-extractor.interface';

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);

  async extract(buffer: Buffer): Promise<ExtractedDocument> {
    if (!buffer || buffer.length === 0) {
      return {
        pages: [],
        totalPages: 0,
        fullText: '',
      };
    }

    try {
      const pages: ExtractedPage[] = [];

      const options = {
        pagerender: (pageData: any) => {
          return pageData.getTextContent().then((textContent: any) => {
            let lastY: any;
            let text = '';
            for (const item of textContent.items) {
              if (lastY === item.transform[5] || !lastY) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            const cleanText = text.trim();
            pages.push({
              pageNumber: (pageData.pageIndex ?? pages.length) + 1,
              text: cleanText,
            });
            return cleanText;
          });
        },
      };

      const result = await pdf(buffer, options);
      const totalPages = Math.max(result.numpages || 0, pages.length, 1);

      pages.sort((a, b) => a.pageNumber - b.pageNumber);
      const fullText = (
        result.text || pages.map((p) => p.text).join('\n\n')
      ).trim();

      return {
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText }],
        totalPages,
        fullText,
      };
    } catch (error) {
      this.logger.error(`PDF extraction failed: ${(error as Error).message}`);
      throw new BadRequestException(
        `Failed to extract text from PDF: ${(error as Error).message}`,
      );
    }
  }
}
