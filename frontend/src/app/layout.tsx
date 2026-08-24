import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Document Chat (RAG) | Grounded PDF Assistant',
  description:
    'Production-grade full-stack Retrieval-Augmented Generation (RAG) platform. Ingest PDFs, search with high-dimensional vector embeddings, and stream hallucination-free answers backed by verifiable citations.',
  keywords: ['RAG', 'AI', 'FastAPI', 'Next.js', 'ChromaDB', 'OpenAI', 'PDF Chat'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#090d16] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
