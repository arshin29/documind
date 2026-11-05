import { Injectable, BadRequestException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { ExtractedDocument } from './text-extractor.interface';
import { PdfExtractorService } from './pdf-extractor.service';
import { DocxExtractorService } from './docx-extractor.service';
import { TxtExtractorService } from './txt-extractor.service';

@Injectable()
export class TextExtractorService {
  constructor(
    private readonly pdfExtractor: PdfExtractorService,
    private readonly docxExtractor: DocxExtractorService,
    private readonly txtExtractor: TxtExtractorService,
  ) {}

  async extract(
    buffer: Buffer,
    fileType: DocumentType,
  ): Promise<ExtractedDocument> {
    switch (fileType) {
      case DocumentType.PDF:
        return this.pdfExtractor.extract(buffer);
      case DocumentType.DOCX:
        return this.docxExtractor.extract(buffer);
      case DocumentType.TXT:
        return this.txtExtractor.extract(buffer);
      default:
        throw new BadRequestException(
          `Unsupported document type for extraction: ${fileType}`,
        );
    }
  }
}

