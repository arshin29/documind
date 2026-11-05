import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';

const samplePdfPath = path.resolve(__dirname, 'fixtures', 'sample.pdf');

export function createTestPdfBuffer(text?: string): Buffer {
  if (fs.existsSync(samplePdfPath)) {
    return fs.readFileSync(samplePdfPath);
  }
  // Fallback to sample pdf path from node_modules if fixture not copied yet
  const fallbackPath = path.resolve(
    __dirname,
    '../node_modules/pdf-parse/test/data/04-valid.pdf',
  );
  if (fs.existsSync(fallbackPath)) {
    return fs.readFileSync(fallbackPath);
  }
  throw new Error('Test PDF fixture not found');
}

export async function createTestDocxBuffer(
  text: string = 'DocuMind Sample DOCX Content',
): Promise<Buffer> {
  const zip = new JSZip();

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`;

  const relsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`;

  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>` +
    `</w:document>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('word/document.xml', documentXml);

  return zip.generateAsync({ type: 'nodebuffer' });
}

export function createTestTxtBuffer(
  text: string = 'DocuMind Sample TXT Content',
): Buffer {
  return Buffer.from(text, 'utf-8');
}
