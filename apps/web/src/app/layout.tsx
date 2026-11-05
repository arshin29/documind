import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DocuMind — Document Intelligence',
  description: 'AI-powered document intelligence, semantic search, and contextual document understanding.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#F7F8FA] text-[#242633] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
