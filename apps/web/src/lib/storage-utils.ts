import { DocumentItem, parseFileSizeInBytes, formatBytes } from '@/data/mock-data';

export interface DocumentTypeBreakdown {
  type: 'PDF' | 'DOCX' | 'TXT';
  count: number;
  totalBytes: number;
  formattedSize: string;
  storagePercentage: number;
  countPercentage: number;
  color: string;
}

export interface StorageAnalytics {
  totalDocuments: number;
  totalBytes: number;
  formattedTotalUsed: string;
  limitBytes: number;
  formattedLimit: string;
  usagePercentage: number;
  remainingBytes: number;
  formattedRemaining: string;
  typeBreakdown: DocumentTypeBreakdown[];
}

export const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2.0 GB

const TYPE_COLORS: Record<'PDF' | 'DOCX' | 'TXT', string> = {
  PDF: '#D97706', // warm amber
  DOCX: '#2563EB', // blue
  TXT: '#607C68', // muted green
};

export function calculateStorageAnalytics(
  documents: DocumentItem[],
  limitBytes: number = STORAGE_LIMIT_BYTES
): StorageAnalytics {
  const totalDocuments = documents.length;
  let totalBytes = 0;

  const typeMap: Record<'PDF' | 'DOCX' | 'TXT', { count: number; bytes: number }> = {
    PDF: { count: 0, bytes: 0 },
    DOCX: { count: 0, bytes: 0 },
    TXT: { count: 0, bytes: 0 },
  };

  documents.forEach((doc) => {
    const bytes = parseFileSizeInBytes(doc.size);
    totalBytes += bytes;
    if (typeMap[doc.type]) {
      typeMap[doc.type].count += 1;
      typeMap[doc.type].bytes += bytes;
    }
  });

  const usagePercentage = limitBytes > 0 ? (totalBytes / limitBytes) * 100 : 0;
  const remainingBytes = Math.max(0, limitBytes - totalBytes);

  const types: ('PDF' | 'DOCX' | 'TXT')[] = ['PDF', 'DOCX', 'TXT'];
  const typeBreakdown: DocumentTypeBreakdown[] = types.map((t) => {
    const data = typeMap[t];
    return {
      type: t,
      count: data.count,
      totalBytes: data.bytes,
      formattedSize: formatBytes(data.bytes),
      storagePercentage: totalBytes > 0 ? (data.bytes / totalBytes) * 100 : 0,
      countPercentage: totalDocuments > 0 ? (data.count / totalDocuments) * 100 : 0,
      color: TYPE_COLORS[t],
    };
  });

  return {
    totalDocuments,
    totalBytes,
    formattedTotalUsed: formatBytes(totalBytes),
    limitBytes,
    formattedLimit: '2.0 GB',
    usagePercentage: parseFloat(usagePercentage.toFixed(2)),
    remainingBytes,
    formattedRemaining: formatBytes(remainingBytes),
    typeBreakdown,
  };
}
