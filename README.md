# KG Platform — AI Knowledge Graph for Companies

An enterprise-grade **knowledge management platform** that ingests documents from multiple sources, builds an AI-powered knowledge graph, and enables teams to search, chat, discover expertise, and track organizational knowledge — all in one place.

![Stack](https://img.shields.io/badge/Stack-TypeScript-blue) ![Frontend](https://img.shields.io/badge/Frontend-Next.js%2015-black) ![Backend](https://img.shields.io/badge/Backend-Express-green) ![AI](https://img.shields.io/badge/AI-OpenAI%20GPT--4o-orange) ![Graph](https://img.shields.io/badge/Graph-Neo4j-blue) ![Vector](https://img.shields.io/badge/Vector-Qdrant-red) ![DB](https://img.shields.io/badge/DB-MongoDB-darkgreen)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 15 Frontend                  │
│   React 19 · Tailwind CSS · react-force-graph-2d        │
│   App Router · Dark Theme · 15+ Pages                   │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────┐
│                  Express + TypeScript API                │
│   JWT Auth · Zod Validation · Workspace Isolation        │
│   18 Route Files · 12 Models · 8 Utilities               │
├────────────┬────────────────┬───────────────────────────┤
│  MongoDB   │     Neo4j      │        Qdrant             │
│ Documents  │  Knowledge     │   Vector Embeddings       │
│ Users      │  Graph         │   Semantic Search         │
│ Workspaces │  Entities &    │   text-embedding-3-small  │
│ Incidents  │  Relationships │                           │
└────────────┴────────────────┴───────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   OpenAI    │
                    │  gpt-4o-mini│
                    └─────────────┘
```

---

## Features

### Core Platform
| Feature | Description |
|---------|-------------|
| **Document Ingestion** | Upload documents, auto-chunk text, generate vector embeddings, and extract entities into the knowledge graph |
| **Multi-Source Connectors** | Pull documents from Confluence, GitHub repos, Notion, and Google Drive |
| **Semantic Search** | Vector similarity search across all documents using Qdrant |
| **RAG Chat** | Ask natural language questions, get AI-generated answers with source citations |
| **Knowledge Graph** | Interactive force-directed graph visualization of entities and relationships |
| **JWT Authentication** | Secure authentication with role-based access |
| **Workspaces** | Multi-tenant team isolation — each workspace has its own documents and data |

### Knowledge Management
| Feature | Description |
|---------|-------------|
| **Expertise Finder** | Discover who knows what based on graph connections and document authorship |
| **Topic / Taxonomy Clustering** | Auto-categorize documents into hierarchical topic trees |
| **Document Versioning** | Track every change with full diff history |
| **Feedback Loop** | Thumbs up/down on AI answers to continuously improve quality |

### Intelligence (v2)
| Feature | Description |
|---------|-------------|
| **Knowledge Gap Detection** | Tracks poorly-answered questions, suggests documentation to create, identifies owners |
| **Auto Documentation** | AI generates postmortems from incidents, FAQs from chat logs, runbooks from docs |
| **Knowledge Heatmap** | Topics × People expertise matrix with evidence drill-down |
| **Knowledge Timeline** | Chronological feed of all knowledge events (docs, versions, incidents, auto-docs) |
| **Recommendation Engine** | Personalized document suggestions based on user interests, team, and activity |
| **Graph Explorer** | Entity search, shortest-path finder, edge explanation with evidence |
| **Smart Notifications** | Alerts for knowledge gaps, incidents, new topics — with weekly digest |
| **AI Mentor Mode** | Enhanced chat that provides recommended reading, expert contacts, and next actions |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS, react-force-graph-2d |
| **Backend** | Node.js, Express, TypeScript (ESM) |
| **Database** | MongoDB (Mongoose) |
| **Graph DB** | Neo4j (neo4j-driver) |
| **Vector DB** | Qdrant (@qdrant/js-client-rest) |
| **AI / LLM** | OpenAI GPT-4o-mini (chat), text-embedding-3-small (embeddings) |
| **Auth** | JWT (jsonwebtoken, bcryptjs) |
| **Validation** | Zod |
| **Infra** | Docker Compose |

---

## Project Structure

```
kg-platform/
├── docker-compose.yml          # MongoDB, Neo4j, Qdrant containers
├── .env.example                # Environment variable template
│
├── apps/api/                   # Express + TypeScript backend
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── env.ts              # Environment config
│   │   ├── db/                 # Database connections
│   │   │   ├── mongo.ts
│   │   │   ├── neo4j.ts
│   │   │   └── qdrant.ts
│   │   ├── middleware/         # JWT auth, workspace isolation
│   │   ├── models/             # Mongoose schemas (12 models)
│   │   │   ├── Document.ts
│   │   │   ├── Chunk.ts
│   │   │   ├── User.ts
│   │   │   ├── Workspace.ts
│   │   │   ├── ChatLog.ts
│   │   │   ├── KnowledgeGap.ts
│   │   │   ├── AutoDoc.ts
│   │   │   ├── Notification.ts
│   │   │   ├── Incident.ts
│   │   │   ├── Feedback.ts
│   │   │   └── ...
│   │   ├── routes/             # API routes (18 files)
│   │   │   ├── chat.ts
│   │   │   ├── search.ts
│   │   │   ├── graph.ts
│   │   │   ├── ingest.ts
│   │   │   ├── knowledgeGaps.ts
│   │   │   ├── autoDocs.ts
│   │   │   ├── heatmap.ts
│   │   │   ├── timeline.ts
│   │   │   ├── recommendations.ts
│   │   │   ├── notifications.ts
│   │   │   └── ...
│   │   └── utils/              # Core logic
│   │       ├── chunker.ts
│   │       ├── embeddings.ts
│   │       ├── graphExtractor.ts
│   │       ├── knowledgeGap.ts
│   │       ├── taxonomyExtractor.ts
│   │       └── ...
│   ├── package.json
│   └── tsconfig.json
│
└── apps/web/                   # Next.js 15 frontend
    ├── src/app/                # App Router pages (15+ pages)
    │   ├── layout.tsx          # Sidebar nav + notification bell
    │   ├── page.tsx            # Landing
    │   ├── chat/               # RAG Chat + Mentor mode
    │   ├── search/             # Semantic search
    │   ├── graph/              # Graph Explorer
    │   ├── ingest/             # Document upload
    │   ├── knowledge-gaps/     # Gap detection
    │   ├── auto-docs/          # Auto-generated docs
    │   ├── heatmap/            # Expertise heatmap
    │   ├── timeline/           # Knowledge timeline
    │   ├── recommended/        # Personalized recommendations
    │   ├── notifications/      # Alert center
    │   ├── incidents/          # Incident management
    │   ├── experts/            # Expertise finder
    │   ├── topics/             # Topic clusters
    │   ├── documents/          # Doc library + version history
    │   ├── connectors/         # External source connectors
    │   ├── workspaces/         # Workspace management
    │   └── login/              # Authentication
    ├── src/lib/auth.tsx        # Auth context provider
    ├── tailwind.config.ts
    ├── package.json
    └── tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Docker** & Docker Compose
- **OpenAI API Key**

### 1. Clone the repository

```bash
git clone https://github.com/Romit1605/KG-Platform-AI-Knowledge-Graph-for-Companies.git
cd KG-Platform-AI-Knowledge-Graph-for-Companies
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your real values:

```env
OPENAI_API_KEY=sk-your-real-key-here
JWT_SECRET=your-random-secret-key
```

### 3. Start databases

```bash
docker compose up -d
```

This starts:
- **MongoDB** on port `27017`
- **Neo4j** on ports `7474` (browser) / `7687` (bolt)
- **Qdrant** on port `6333`

### 4. Install dependencies & run

**Backend:**
```bash
cd apps/api
npm install
npx tsx src/index.ts
```
API runs on `http://localhost:8000`

**Frontend:**
```bash
cd apps/web
npm install
npm run dev
```
Web app runs on `http://localhost:3000`

---

## API Endpoints

### Core
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/ingest` | Ingest a document |
| `GET` | `/search?q=` | Semantic search |
| `POST` | `/chat` | RAG chat (supports mentor mode) |
| `GET` | `/graph` | Get knowledge graph |

### Knowledge
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/documents` | List documents |
| `GET` | `/experts` | Find experts |
| `GET` | `/topics` | Topic clusters |
| `GET` | `/recommendations` | Personalized recommendations (JWT) |

### Intelligence
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/knowledge-gaps` | List knowledge gaps |
| `POST` | `/knowledge-gaps/:id/suggest-doc` | AI-generate doc outline for a gap |
| `GET` | `/auto-docs` | List auto-generated docs |
| `POST` | `/auto-docs/from-incident` | Generate postmortem |
| `POST` | `/auto-docs/from-chats` | Generate FAQ from chat history |
| `GET` | `/heatmap` | Topics × People matrix |
| `GET` | `/timeline` | Knowledge event feed |

### Graph Explorer
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/graph/entity?name=` | Entity details + connections |
| `GET` | `/graph/explain?from=&to=` | Explain relationship between two entities |
| `GET` | `/graph/path?from=&to=` | Shortest path between entities |

### Operations
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/register` | Register user |
| `POST` | `/auth/login` | Login (returns JWT) |
| `GET` | `/notifications` | User notifications |
| `GET` | `/notifications/digest/weekly` | Weekly summary |
| `POST` | `/incidents` | Create incident |
| `POST` | `/feedback` | Submit feedback |

---

## How It Works

```
Document Upload
      │
      ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Chunker     │───▶│  Embeddings  │───▶│  Qdrant Vector  │
│  Split text  │    │  OpenAI API  │    │  Store           │
└─────────────┘    └──────────────┘    └─────────────────┘
      │
      ▼
┌──────────────┐    ┌──────────────────────┐
│  Graph        │───▶│  Neo4j Knowledge     │
│  Extractor    │    │  Graph (entities,    │
│  (GPT-4o)     │    │  relationships)      │
└──────────────┘    └──────────────────────┘
      │
      ▼
┌──────────────┐
│  MongoDB      │
│  (metadata,   │
│  chunks,      │
│  users, etc)  │
└──────────────┘
```

**When a user asks a question:**
1. Question is embedded → vector search in Qdrant finds relevant chunks
2. Chunks + question sent to GPT-4o-mini for answer generation
3. Answer returned with source citations
4. Chat logged → knowledge gap detection runs asynchronously
5. In mentor mode: also returns recommended docs, experts, and next actions

---

## Screenshots

> _The platform features a dark-themed UI with a sidebar navigation, interactive force-directed graph visualization, expertise heatmaps, and a real-time chat interface with AI mentor capabilities._

---

## License

MIT

---

## Author

**Romit** — [GitHub](https://github.com/Romit1605)
