# Radidone 🦷🤖

> AI-powered dental radiology training platform — interactive X-ray annotation, voice-driven Socratic mentoring, and adaptive diagnostic learning.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Learning Session Flow](#learning-session-flow)
- [Mentor Engine](#mentor-engine)
- [API Overview](#api-overview)
- [Database Schema](#database-schema)
- [Security](#security)
- [Deployment](#deployment)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [License](#license)
- [Disclaimer](#disclaimer)

---

## Overview

**Radidone** is a training platform designed to help dental students sharpen their radiographic interpretation and clinical reasoning skills through guided, interactive learning sessions.

Students upload panoramic dental X-rays, annotate findings directly on the image, and engage with an AI mentor that leads them through structured Socratic dialogue — asking questions rather than giving answers, progressively revealing findings, and scoring diagnostic reasoning at each phase.

The platform combines:

- AI-powered panoramic X-ray analysis with per-tooth disease predictions
- An interactive annotation canvas (polygons, circles, tooth labeling)
- A conversational AI mentor driven by Socratic pedagogy
- Real-time voice interaction (speech-to-text + text-to-speech)
- Guided multi-phase diagnostic workflows

---

## Features

### 🦷 AI Dental X-ray Analysis
- Upload panoramic dental X-rays (JPEG and PNG)
- AI-generated per-tooth predictions with confidence scores
- Disease heatmap overlays rendered directly on the image


### ✍️ Interactive Annotation Canvas
- Polygon and circle annotation tools
- FDI/ISO tooth numbering and labeling
- Zoom, pan, and highlight support
- Real-time annotation persistence
- Full undo/redo history

### 🤖 AI Mentor
- Socratic educational dialogue across five session phases
- Guided differential diagnosis reasoning
- Adaptive questioning based on student responses
- Progressive finding revelation controlled by the Mentor Engine

### 🎤 Voice Interaction
- Real-time bidirectional voice streaming over WebSocket
- Speech-to-text transcription of student input
- Multi-language support


---

## Architecture

Radidone follows a microservice architecture. Each service owns a distinct capability and communicates over HTTP/REST or WebSocket through the API Gateway.

### Containers

| Container | Tech | Responsibility |
|---|---|---|
| Web Application | React / TypeScript / TailwindCSS | Interactive UI: canvas, chat, voice, dashboard |
| API Gateway | Python / FastAPI | Auth enforcement, rate-limiting, request routing |
| Session Orchestrator | Python / FastAPI | Session lifecycle, phase transitions, cross-service coordination |
| Mentor Engine | Python / FastAPI | LLM context assembly, Socratic prompt generation, phase evaluation |
| Image Service | Python / FastAPI | X-ray upload, pre-processing, AI API proxy, result caching |
| Voice Service | Python / FastAPI | STT/TTS WebSocket bridge |
| PostgreSQL | — | Persistent storage for users, sessions, annotations, results |
| Object Store | local storage | Raw X-rays, processed images, heatmap overlays, reports |

### External Dependencies

| System | Role |
|---|---|
| Dental AI API | Per-tooth disease predictions from panoramic X-rays |
| LLM Provider | Socratic mentor response generation |
| Speech-to-Text API | Student voice transcription |
| Text-to-Speech API | Mentor audio synthesis |
| Clerk | User identity, JWT issuance, RBAC |

### High-Level Request Flow

```
Dental Student 
        ↓  HTTPS / WSS
  Web Application (React)
        ↓
   API Gateway  ──── Clerk (JWT validation)
        ↓
Session Orchestrator
   ├── Image Service  ──── Dental AI API
   │       └── Object Store
   ├── Mentor Engine  ──── LLM Provider
   ├── Voice Service  ──── STT API / TTS API
   ├── Notification Service
   ├── PostgreSQL
   └── Redis
```

### C4 Architecture Diagrams

Full C4 model (Level 1–3) is maintained in [`docs/architecture/c4_model.dsl`](docs/architecture/c4_model.dsl) and can be rendered with [Structurizr](https://structurizr.com/).

---

## Tech Stack

### Frontend
- React + TypeScript
- TailwindCSS
- WebSockets (native browser API)
- Konva.js *(annotation canvas)*

### Backend
- Python / FastAPI (all services)
- PostgreSQL (primary database)

### AI & Voice
- LLM API (OpenAI / Gemini / DeepSeek  — configurable)
- Speech-to-Text API (e.g. OpenAi WhisperFlow)
- Text-to-Speech API (e.g. ElevenLabs, OpenAI TTS)
- Dental AI API (ThaakaMed)

### Infrastructure
- Vercel (Web Application + Api)
- DigitalOcean Droplet (object storage + PostgreSQL)

---

## Project Structure

```
radidone/
│
├── apps/
│   ├── web-app/              # React SPA
│   ├── api-gateway/          # FastAPI — auth, routing, rate-limiting
│   ├── session-orchestrator/ # FastAPI — session lifecycle
│   ├── mentor-engine/        # FastAPI — LLM context, Socratic prompts
│   ├── image-service/        # FastAPI — X-ray upload & AI analysis
│   └── voice-service/        # FastAPI — STT/TTS bridge
│
├── packages/
│   ├── shared-types/         # Shared TypeScript / Python type definitions
│   ├── ui-components/        # Reusable React components
│   └── utils/                # Shared utility functions
│
├── docs/
│   ├── architecture/         # C4 DSL and rendered diagrams
│   ├── api/                  # OpenAPI specs per service
│   └── diagrams/             # Supplementary flow diagrams
│
└── README.md
```

---

## Learning Session Flow

```
1.  Student logs in (authenticated via Clerk)
2.  Student uploads a panoramic X-ray
3.  Image Service pre-processes the image and calls the Dental AI API
4.  AI predictions and heatmap overlays are generated
5.  Session Orchestrator creates a new session (phase: Observation)
6.  Student annotates findings on the canvas
7.  Mentor Engine assembles context and generates Socratic questions
8.  Student responds via text or voice
9.  Mentor evaluates response; phase advances when rubric threshold is met
10. Session completes after the Evaluation phase
11. Session report is stored;
```

### Session Phases

| Phase | Goal |
|---|---|
| **Observation** | Student identifies visible structures and anomalies |
| **Hypothesis** | Student proposes differential diagnoses |
| **Diagnosis** | Student selects and justifies a primary diagnosis |
| **Reflection** | Student reviews AI findings vs. their own annotations |
| **Evaluation** | Mentor scores the session and provides overall feedback |

---

## Mentor Engine

The Mentor Engine is the educational core of Radidone.

### Responsibilities

- Builds a complete LLM context from session state, annotation history, and AI results
- Assembles phase-appropriate Socratic prompts
- Interprets canvas annotations into structured clinical findings
- Controls progressive finding revelation (the mentor never reveals more than the phase allows)
- Evaluates student responses against phase rubrics
- Emits phase-advance or phase-hold signals to the Session Orchestrator
- Parses LLM output for canvas directives, scores, and mentor text

### Internal Components

| Component | Responsibility |
|---|---|
| Context Builder | Aggregates diagnostic results, annotation history, and conversation turns |
| Prompt Assembler | Builds system + user prompts for the current phase |
| Annotation Interpreter | Converts canvas shapes into structured clinical findings |
| Phase Controller | Evaluates response quality; emits phase signals |
| LLM Client | Streams completion requests to the LLM Provider |
| Response Parser | Extracts canvas highlights, phase signals, scores, and text from LLM output |

---

## API Overview

All endpoints are prefixed `/api`. WebSocket endpoints use `wss://`.

### Authentication

```http
POST /api/auth/token
```

All other endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

### Images

```http
POST   /api/images/upload        # Upload a panoramic X-ray
GET    /api/images/:id           # Retrieve image metadata
GET    /api/images/:id/results   # Retrieve AI diagnostic results
```

### Sessions

```http
POST   /api/sessions             # Create a new learning session
GET    /api/sessions/:id         # Retrieve session state
GET    /api/sessions/:id/report  # Export session report
```


### Voice

```http
WS     /api/voice                # Bidirectional voice stream (STT/TTS)
```

### Chat

```http
WS     /api/chat                 # Real-time mentor chat stream
```

---

## Database Schema

> Full schema migrations are maintained in `apps/session-orchestrator/migrations/`.

Core tables:

| Table | Description |
|---|---|
| `users` | Student and faculty accounts (synced from Clerk) |
| `sessions` | Learning session records metadata with current phase and status |
| `conversation_turns` | Mentor and student messages per session |
| `diagnostic_results` | Per-tooth AI predictions linked to an image |
| `images` | X-ray image metadata and object store references |

---

## Security

- **Authentication**: JWT-based via Clerk; every request validated at the API Gateway
- **Transport**: HTTPS and WSS only; HTTP redirects to HTTPS
- **Rate Limiting**: Per-user and per-IP limits enforced at the API Gateway
- **Secrets**: All API keys and database credentials managed via environment variables; never committed to source control
- **Input Validation**: Strict schema validation on all API inputs via Pydantic

---

## Deployment

### Infrastructure

| Service | Provider |
|---|---|
| Web Application | Vercel (ReactJs) |
| Backend Services | Vercel (FastApi) |
| Database | PostgreSQL on DigitalOcean Droplet |
| Object Storage | DigitalOcean Droplet |

---

## Local Development

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- PostgreSQL ≥ 15
- A Clerk account (development instance)

### Installation

```bash
# Clone the repository
git clone https://github.com/amkorwalid/radidone.git
cd radidone

# Install frontend dependencies
cd apps/web-app
npm install

# Install API Gateway dependencies
cd ../api-gateway
pip install -r requirements.txt

# Install Session Orchestrator dependencies
cd ../session-orchestrator
pip install -r requirements.txt

# Install Mentor Engine dependencies
cd ../mentor-engine
pip install -r requirements.txt

# Install Image Service dependencies
cd ../image-service
pip install -r requirements.txt

# Install Voice Service dependencies
cd ../voice-service
pip install -r requirements.txt

```

### Running Services Locally

```bash
# Terminal 1 — Web Application
cd apps/web-app && npm run dev

# Terminal 2 — API Gateway (port 8000)
cd apps/api-gateway && uvicorn main:app --reload --port 8000

# Terminal 3 — Session Orchestrator (port 8001)
cd apps/session-orchestrator && uvicorn main:app --reload --port 8001

# Terminal 4 — Mentor Engine (port 8002)
cd apps/mentor-engine && uvicorn main:app --reload --port 8002

# Terminal 5 — Image Service (port 8003)
cd apps/image-service && uvicorn main:app --reload --port 8003

# Terminal 6 — Voice Service (port 8004)
cd apps/voice-service && uvicorn main:app --reload --port 8004

```

---

## Environment Variables

### Frontend (`apps/web-app/.env`)

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### API Gateway (`apps/api-gateway/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/radidone
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
CLERK_SECRET_KEY=sk_test_...
SESSION_ORCHESTRATOR_URL=http://localhost:8001
IMAGE_SERVICE_URL=http://localhost:8003
VOICE_SERVICE_URL=http://localhost:8004
NOTIFICATION_SERVICE_URL=http://localhost:8005
```

### Mentor Engine (`apps/mentor-engine/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/radidone
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1
```

### Image Service (`apps/image-service/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/radidone
DENTAL_AI_API_KEY=...
DENTAL_AI_BASE_URL=https://api.thaakamed.com
OBJECT_STORE_ENDPOINT=https://nyc3.digitaloceanspaces.com
OBJECT_STORE_BUCKET=radidone-assets
OBJECT_STORE_KEY=...
OBJECT_STORE_SECRET=...
```

### Voice Service (`apps/voice-service/.env`)

```env
STT_API_KEY=...
STT_BASE_URL=https://api.deepgram.com
TTS_API_KEY=...
TTS_BASE_URL=https://api.elevenlabs.io
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Disclaimer

Radidone is a training platform intended **for educational purposes only**.
It is **not** intended for clinical diagnosis, medical decision-making, or patient care.
Always consult a qualified dental professional for clinical assessments.

---

## Authors

Developed by **Walid Amkor**.