import { ChatMessage, Citation } from '@/types/chat';
import { DocumentItem } from '@/types/document';

/**
 * Format conversation and grounded citations into a clean Markdown research report.
 */
export function generateMarkdownReport(
  messages: ChatMessage[],
  documents: DocumentItem[]
): string {
  const dateStr = new Date().toLocaleString();
  const docNames = documents.map((d) => d.original_filename || d.filename).join(', ') || 'None';

  let md = `# Grounded Document Intelligence Report\n\n`;
  md += `**Exported At:** ${dateStr}\n`;
  md += `**Active Document Corpus:** ${docNames}\n`;
  md += `**Total Messages:** ${messages.length}\n\n`;
  md += `---\n\n`;

  messages.forEach((msg, idx) => {
    const isAssistant = msg.role === 'assistant';
    const author = isAssistant ? 'Document Assistant' : 'User';
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();

    md += `### ${idx + 1}. [${author}] - ${timestamp}\n\n`;
    md += `${msg.content}\n\n`;

    if (msg.citations && msg.citations.length > 0) {
      md += `#### Grounded Source Citations:\n`;
      msg.citations.forEach((c: Citation, cIdx: number) => {
        md += `- **[${cIdx + 1}] ${c.doc_name} (Page ${c.page_number})**\n`;
        md += `  > "${c.snippet}"\n`;
        if (c.score) {
          md += `  *Relevance Confidence: ${(c.score * 100).toFixed(1)}%*\n`;
        }
      });
      md += `\n`;
    }

    md += `---\n\n`;
  });

  return md;
}

/**
 * Trigger browser file download for text data.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Export conversation as a Markdown file (.md).
 */
export function exportChatAsMarkdown(messages: ChatMessage[], documents: DocumentItem[]): void {
  if (messages.length === 0) return;
  const mdContent = generateMarkdownReport(messages, documents);
  const filename = `rag-research-report-${new Date().toISOString().slice(0, 10)}.md`;
  downloadFile(mdContent, filename, 'text/markdown;charset=utf-8');
}

/**
 * Export conversation as structured JSON (.json).
 */
export function exportChatAsJSON(messages: ChatMessage[], documents: DocumentItem[]): void {
  if (messages.length === 0) return;
  const exportData = {
    metadata: {
      exported_at: new Date().toISOString(),
      active_documents: documents.map((d) => ({
        id: d.id,
        filename: d.original_filename || d.filename,
        pages: d.page_count,
        chunks: d.chunk_count,
      })),
      total_messages: messages.length,
    },
    conversation: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      citations: m.citations || [],
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const filename = `rag-conversation-${new Date().toISOString().slice(0, 10)}.json`;
  downloadFile(jsonString, filename, 'application/json;charset=utf-8');
}

/**
 * Trigger styled print preview dialog to save as PDF.
 */
export function exportChatAsPDF(messages: ChatMessage[], documents: DocumentItem[]): void {
  if (messages.length === 0) return;

  const docNames = documents.map((d) => d.original_filename || d.filename).join(', ') || 'All Documents';
  const dateStr = new Date().toLocaleString();

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Document Chat Intelligence Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 40px;
          }
          h1 { color: #0f172a; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
          .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
          .message { margin-bottom: 24px; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; page-break-inside: avoid; }
          .assistant { background: #f8fafc; border-left: 4px solid #6366f1; }
          .user { background: #ffffff; border-left: 4px solid #94a3b8; }
          .author { font-size: 13px; font-weight: bold; margin-bottom: 6px; }
          .content { font-size: 14px; white-space: pre-wrap; }
          .citations { margin-top: 12px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 12px; }
          .citation-item { margin-top: 6px; padding: 6px 10px; background: #e0e7ff; border-radius: 4px; color: #3730a3; }
        </style>
      </head>
      <body>
        <h1>Document Chat Intelligence Report</h1>
        <div class="meta">
          <strong>Generated:</strong> ${dateStr} | 
          <strong>Corpus:</strong> ${docNames} | 
          <strong>Total Exchanges:</strong> ${messages.length}
        </div>
  `;

  messages.forEach((msg, idx) => {
    const isAssistant = msg.role === 'assistant';
    const author = isAssistant ? 'Document Assistant' : 'User';
    const cls = isAssistant ? 'assistant' : 'user';

    html += `
      <div class="message ${cls}">
        <div class="author">${author} (#${idx + 1})</div>
        <div class="content">${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    `;

    if (msg.citations && msg.citations.length > 0) {
      html += `<div class="citations"><strong>Grounded Sources:</strong>`;
      msg.citations.forEach((c, cIdx) => {
        html += `
          <div class="citation-item">
            [${cIdx + 1}] <strong>${c.doc_name}</strong> — Page ${c.page_number}: <em>"${c.snippet}"</em>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}
