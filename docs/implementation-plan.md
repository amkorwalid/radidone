# Radidone Implementation Plan

## Goal

Build Radidone from scratch as a modular monorepo, with the mentor/voice pipeline delivered first, then the backend foundation, then the frontend.

## Guiding principles

- Keep the mentor and voice paths isolated behind service boundaries.
- Let the session orchestrator own lifecycle and phase transitions.
- Treat `docs/api/openapi.yaml` as the API contract source of truth.
- Prefer adapters for external providers so vendors can be swapped later.

## Proposed project structure

```text
radidone/
├── apps/
│   ├── web-app/
│   ├── api-gateway/
│   ├── session-orchestrator/
│   ├── mentor-engine/
│   ├── voice-service/
│   └── image-service/
├── packages/
│   ├── shared-types/
│   ├── shared-utils/
│   ├── auth/
│   └── api-client/
├── database/
│   ├── migrations/
│   ├── schema.sql
│   └── seeds/
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── diagrams/
│   └── implementation-plan.md
├── infra/
└── tests/
```

## Phase 1: Mentor and voice pipeline

1. Define event contracts for voice input, transcripts, mentor output, and phase transitions.
2. Implement `voice-service` with WebSocket audio ingest, STT/TTS adapters, and transcript persistence.
3. Implement `mentor-engine` with context building, prompt assembly, response parsing, and phase-aware Socratic output.
4. Implement `session-orchestrator` to coordinate voice events, mentor replies, and session progression.
5. Add an end-to-end test path for audio input to mentor response.

## Phase 2: Backend foundation

1. Implement `api-gateway` for auth, request validation, rate limiting, and routing.
2. Add PostgreSQL persistence mapped to the schema in `database/schema.sql`.
3. Implement core APIs for auth, users, sessions, images, annotations, conversations, and reports.
4. Add shared DTOs and generated API clients.

## Phase 3: Frontend

1. Build the authenticated web app shell.
2. Add session dashboard, X-ray upload, annotation canvas, mentor chat, and voice UI.
3. Connect the frontend to the backend via shared contracts and generated clients.

## Phase 4: Hardening

1. Add structured logging, metrics, and error handling.
2. Expand unit, integration, and end-to-end coverage.
3. Align docs, deployment configs, and operational workflows with the shipped implementation.

## Milestones

- Mentor/voice MVP working end-to-end.
- Backend API aligned with OpenAPI and database schema.
- Frontend supports the core learning flow.
- Test coverage and observability in place.
