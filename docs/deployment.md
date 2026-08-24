# DevOps, Containerization & Deployment Runbook

## Mission
Deliver reproducible, lightweight, secure containerized environments for local development and cloud production deployment.

## Containerization Guidelines
1. **Multi-Stage Builds**:
   - Backend: Use `python:3.11-slim-bookworm` with native Python healthcheck probe.
   - Frontend: Use `node:20-bookworm-slim`, build Next.js with `output: "standalone"`, copy static assets and server chunk to runtime stage.
2. **Volume Persistence**:
   - Persist ChromaDB vector store directory and raw PDF uploads using named Docker volumes (`chroma_data`, `uploads_data`).
3. **Healthchecks**:
   - Include Docker `HEALTHCHECK` instructions querying `/api/v1/health`.
4. **Environment Injection**:
   - Pass configuration via standard environment variables or docker-compose environment blocks.
