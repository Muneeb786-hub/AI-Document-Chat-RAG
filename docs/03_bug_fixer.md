# Role 03: Bug Fixer & Diagnostics Manual 🛠

## Mission
Quickly diagnose, isolate, and resolve edge cases in PDF parsing, vector indexing, streaming SSE connections, and token limits.

## Common Edge Cases & Remediation
1. **Corrupted or Scanned PDF Ingestion**:
   - *Symptom*: PyMuPDF returns empty text or raises extraction error.
   - *Fix*: Check character count per page; return user-friendly error `Document contains no extractable text (scanned image PDFs require OCR)` rather than 500 crashes.
2. **SSE Streaming Disconnects / Aborted Requests**:
   - *Symptom*: Client closes tab while LLM is generating tokens, leaving dangling async generator.
   - *Fix*: Wrap async iteration in `asyncio.CancelledError` handlers with graceful generator closing.
3. **Vector Dimension Mismatch**:
   - *Symptom*: ChromaDB raises error on query if query embedding dimensions differ from stored index dimensions.
   - *Fix*: Validate embedding model dimension against existing collection metadata before indexing.
4. **Context Window Exceeded**:
   - *Symptom*: LLM API rejects prompt due to token limit.
   - *Fix*: Calculate token budget for retrieved context dynamically and truncate retrieved chunks if necessary before prompt submission.
