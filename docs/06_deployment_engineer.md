# Role 06: Deployment & DevOps Engineer Guidelines 🐳

## Mission
Deliver reproducible, lightweight, secure containerized environments for local development and cloud production deployment.

## Containerization Guidelines
1. **Multi-Stage Builds**:
   - Backend: Use `python:3.11-slim`, install system build tools in builder stage, copy installed wheels to minimal runtime image. Non-root user execution.
   - Frontend: Use `node:20-bookworm-slim`, build Next.js with `output: "standalone"`, copy only static assets and server chunk to runtime stage.
2. **Volume Persistence**:
   - Persist ChromaDB vector store directory and raw PDF uploads using named Docker volumes.
3. **Healthchecks**:
   - Include Docker `HEALTHCHECK` instructions querying `/api/v1/health`.
4. **Environment Injection**:
   - Pass configuration via standard environment variables or docker-compose environment blocks.
