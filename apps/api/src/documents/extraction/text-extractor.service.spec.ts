import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { TextExtractorService } from './text-extractor.service';
import { PdfExtractorService } from './pdf-extractor.service';
import { DocxExtractorService } from './docx-extractor.service';
import { TxtExtractorService } from './txt-extractor.service';
import {
  createTestPdfBuffer,
  createTestDocxBuffer,
  createTestTxtBuffer,
} from '../../../test/test-file-utils';

describe('TextExtractorService', () => {
  let service: TextExtractorService;
  let pdfExtractor: PdfExtractorService;
  let docxExtractor: DocxExtractorService;
  let txtExtractor: TxtExtractorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextExtractorService,
        PdfExtractorService,
        DocxExtractorService,
        TxtExtractorService,
      ],
    }).compile();

    service = module.get<TextExtractorService>(TextExtractorService);
    pdfExtractor = module.get<PdfExtractorService>(PdfExtractorService);
    docxExtractor = module.get<DocxExtractorService>(DocxExtractorService);
    txtExtractor = module.get<TxtExtractorService>(TxtExtractorService);
  });

  describe('PDF Extraction', () => {
    it('should extract text and page count from valid PDF buffer', async () => {
      const pdfBuffer = createTestPdfBuffer();
      const result = await pdfExtractor.extract(pdfBuffer);

      expect(result.totalPages).toBeGreaterThanOrEqual(1);
      expect(result.fullText.length).toBeGreaterThan(50);
      expect(result.pages.length).toBeGreaterThanOrEqual(1);
      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[0].text.length).toBeGreaterThan(10);
    });

    it('should handle empty buffer gracefully', async () => {
      const result = await pdfExtractor.extract(Buffer.alloc(0));
      expect(result.totalPages).toBe(0);
      expect(result.pages).toHaveLength(0);
      expect(result.fullText).toBe('');
    });

    it('should throw BadRequestException on corrupt PDF', async () => {
      const corruptPdf = Buffer.from('%PDF-corrupted-content-invalid-structure');
      await expect(pdfExtractor.extract(corruptPdf)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('DOCX Extraction', () => {
    it('should extract text from valid DOCX buffer', async () => {
      const docxBuffer = await createTestDocxBuffer('Executive Summary 2026');
      const result = await docxExtractor.extract(docxBuffer);

      expect(result.totalPages).toBe(1);
      expect(result.fullText).toBe('Executive Summary 2026');
      expect(result.pages[0].text).toBe('Executive Summary 2026');
    });

    it('should handle empty buffer gracefully', async () => {
      const result = await docxExtractor.extract(Buffer.alloc(0));
      expect(result.totalPages).toBe(0);
      expect(result.pages).toHaveLength(0);
      expect(result.fullText).toBe('');
    });

    it('should handle DOCX with empty text gracefully', async () => {
      const emptyDocx = await createTestDocxBuffer('');
      const result = await docxExtractor.extract(emptyDocx);
      expect(result.totalPages).toBe(1);
      expect(result.fullText).toBe('');
    });

    it('should throw BadRequestException on corrupt DOCX', async () => {
      const corruptDocx = Buffer.from('PK\x03\x04corrupted-not-a-real-zip');
      await expect(docxExtractor.extract(corruptDocx)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('TXT Extraction', () => {
    it('should extract text safely from UTF-8 buffer', async () => {
      const txtBuffer = createTestTxtBuffer('DocuMind Plain Text Document');
      const result = await txtExtractor.extract(txtBuffer);

      expect(result.totalPages).toBe(1);
      expect(result.fullText).toBe('DocuMind Plain Text Document');
      expect(result.pages[0].text).toBe('DocuMind Plain Text Document');
    });

    it('should handle UTF-8 Byte Order Mark (BOM)', async () => {
      const bomBuffer = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from('Text with BOM', 'utf-8'),
      ]);
      const result = await txtExtractor.extract(bomBuffer);
      expect(result.fullText).toBe('Text with BOM');
    });

    it('should handle multi-page TXT documents delimited by form feed', async () => {
      const multiPage = Buffer.from('Page One Content\fPage Two Content', 'utf-8');
      const result = await txtExtractor.extract(multiPage);
      expect(result.totalPages).toBe(2);
      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[0].text).toBe('Page One Content');
      expect(result.pages[1].pageNumber).toBe(2);
      expect(result.pages[1].text).toBe('Page Two Content');
    });

    it('should handle empty text buffer gracefully', async () => {
      const result = await txtExtractor.extract(Buffer.alloc(0));
      expect(result.totalPages).toBe(0);
      expect(result.pages).toHaveLength(0);
      expect(result.fullText).toBe('');
    });
  });

  describe('TextExtractorService Dispatcher', () => {
    it('should dispatch to PDF extractor for DocumentType.PDF', async () => {
      const pdfBuffer = createTestPdfBuffer();
      const result = await service.extract(pdfBuffer, DocumentType.PDF);
      expect(result.fullText.length).toBeGreaterThan(50);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should dispatch to DOCX extractor for DocumentType.DOCX', async () => {
      const docxBuffer = await createTestDocxBuffer('DOCX Test');
      const result = await service.extract(docxBuffer, DocumentType.DOCX);
      expect(result.fullText).toBe('DOCX Test');
    });

    it('should dispatch to TXT extractor for DocumentType.TXT', async () => {
      const txtBuffer = createTestTxtBuffer('TXT Test');
      const result = await service.extract(txtBuffer, DocumentType.TXT);
      expect(result.fullText).toBe('TXT Test');
    });
  });
});
