# Security Architecture & Input Validation Guidelines

## Mission
Protect system integrity, prevent prompt injections, enforce file upload sanitization, neutralize active PDF exploits, mask sensitive PII, and secure environment secrets.

## Security Principles & Implemented Controls

1. **File Upload Hardening & Active Exploit Defense**:
   - Inspect binary header magic bytes (`%PDF-` / `0x25 0x50 0x44 0x46 0x2D`) to ensure non-PDF payloads disguised with `.pdf` extensions are rejected before ingestion.
   - Scan document binaries for dangerous embedded scripting tokens (`/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFiles`, `/SubmitForm`, `/ImportData`, `/RichMedia`) and abort execution if found.
   - Enforce hard size boundaries (`25MB` default).

2. **Cross-Platform Directory Traversal Defense**:
   - Normalize Windows and POSIX path separators before extracting base filenames.
   - Sanitize filenames using alphanumeric character whitelisting to neutralize path traversal exploits (`../../etc/passwd` or `..\\windows\\system32`).

3. **Adversarial Prompt Injection & Boundary Isolation**:
   - Pattern-based regex inspection layer identifying common prompt override, jailbreak, and system leakage vectors (`ignore previous instructions`, `reveal system prompt`, `developer mode`, `<|im_start|>`).
   - Context is injected into immutable XML containers: `<document_context security_boundary="immutable"> ... </document_context>`.
   - LLMs are instructed to treat everything inside boundary containers strictly as passive informational data, never as executable instructions.

4. **Sensitive PII & Secret Key Redaction**:
   - Automated regex scrubbing masking credit card numbers, social security numbers (SSNs), and API key signatures (`sk-...`, `AKIA...`) before prompt synthesis and logging.

5. **Per-IP Sliding-Window Rate Limiting**:
   - In-memory rate limiting on document uploads (`15 req/min`) and conversational chat endpoints (`45 req/min`), returning HTTP `429 Too Many Requests` with `Retry-After` headers.

6. **OWASP Security Headers & CORS**:
   - Appends `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Permissions-Policy`, and strict `Referrer-Policy` to all HTTP responses.
   - Restricts CORS origins to explicitly allowed frontend domains in production.
