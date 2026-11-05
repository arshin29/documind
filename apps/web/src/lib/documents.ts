import { DocumentItem } from '@/data/mock-data';

export function triggerDocumentDownload(doc: DocumentItem): void {
  const fileContent = `=== DocuMind Document Export ===
Title: ${doc.title}
Format: ${doc.type}
Size: ${doc.size}
Status: ${doc.status}
Date Added: ${doc.dateAdded}
Pages: ${doc.pages ?? 'N/A'}
Chunks: ${doc.chunksCount}
Author: ${doc.author ?? 'Not specified'}

Summary:
${doc.summary}

Key Topics:
${doc.keyTopics.join(', ')}

Recent Query:
${doc.recentQuestion ?? 'None'}
`;

  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = doc.title;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function getStatusStyle(status: 'Ready' | 'Processing' | 'Failed'): {
  dotColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
} {
  switch (status) {
    case 'Ready':
      return {
        dotColor: 'bg-[#29A36A]',
        textColor: 'text-[#29A36A]',
        bgColor: 'bg-[#EDF8F2]',
        borderColor: 'border-[#D4EEDB]',
      };
    case 'Processing':
      return {
        dotColor: 'bg-[#7185E8]',
        textColor: 'text-[#7185E8]',
        bgColor: 'bg-[#EEF0FF]',
        borderColor: 'border-[#D8DAE5]',
      };
    case 'Failed':
      return {
        dotColor: 'bg-[#E6A13A]',
        textColor: 'text-[#E6A13A]',
        bgColor: 'bg-[#FEF7ED]',
        borderColor: 'border-[#FBE3CD]',
      };
  }
}

export function getFormatBadgeStyle(type: 'PDF' | 'DOCX' | 'TXT' | string): {
  textColor: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
} {
  switch (type.toUpperCase()) {
    case 'PDF':
      return {
        textColor: 'text-[#7185E8]',
        bgColor: 'bg-[#EEF0FF]',
        borderColor: 'border-[#E0E4FA]',
        iconBg: 'bg-[#EEF0FF]',
      };
    case 'DOCX':
      return {
        textColor: 'text-[#29A36A]',
        bgColor: 'bg-[#EDF8F2]',
        borderColor: 'border-[#D4EEDB]',
        iconBg: 'bg-[#EDF8F2]',
      };
    case 'TXT':
      return {
        textColor: 'text-[#E6A13A]',
        bgColor: 'bg-[#FEF7ED]',
        borderColor: 'border-[#FCE7D0]',
        iconBg: 'bg-[#FEF7ED]',
      };
    default:
      return {
        textColor: 'text-[#858A99]',
        bgColor: 'bg-[#F7F8FA]',
        borderColor: 'border-[#E9EAF0]',
        iconBg: 'bg-[#F7F8FA]',
      };
  }
}

