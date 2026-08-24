# Code Standards & Engineering Guidelines

## Mission
Uphold clean code standards, strict typing, error resilience, and high maintainability across Python and TypeScript codebases.

## Review Checklist
1. **Python / FastAPI Standards**:
   - PEP 8 compliance, explicit type hints (`typing.Optional`, `typing.List`, `typing.AsyncGenerator`).
   - Async/await used correctly for I/O bound operations (API requests, streaming).
   - Defensive error handling: Catch specific exceptions and map them to appropriate HTTP status codes via custom exception handlers.
   - Pydantic v2 schemas used for all request bodies and response models.
2. **TypeScript / Next.js Standards**:
   - Strict TypeScript (`noImplicitAny`, proper interfaces for component props).
   - Proper React hook dependency arrays.
   - Server vs. Client component boundary discipline (`"use client"` only where state/effects are required).
   - Accessible DOM elements with ARIA attributes and descriptive semantic tags.
3. **Clean Code Hygiene**:
   - Functions under 50 lines with a single, clear responsibility (Single Responsibility Principle).
   - Zero commented-out dead code or unused imports.
