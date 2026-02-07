# Bibanna Architecture Overview

Bibanna is a modern bibliography management application built for researchers, students, and professors. This document provides a comprehensive overview of the system architecture, design decisions, and how components interact.

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [High-Level Architecture](#high-level-architecture)
3. [Directory Structure](#directory-structure)
4. [Core Concepts](#core-concepts)
5. [Data Flow](#data-flow)
6. [Authentication & Authorization](#authentication--authorization)
7. [Subscription Tiers](#subscription-tiers)
8. [External Integrations](#external-integrations)

---

## Technology Stack

### Frontend
- **Nuxt 3** - Vue.js meta-framework with SSR/SSG support
- **Vue 3** - Composition API with `<script setup>` syntax
- **Nuxt UI** - Component library built on Tailwind CSS
- **Tailwind CSS** - Utility-first CSS framework
- **Pinia** - State management (via Nuxt module)
- **D3.js** - Data visualization for mind maps

### Backend
- **Nitro** - Nuxt's server engine (Node.js)
- **Drizzle ORM** - Type-safe SQL query builder
- **PostgreSQL 18** - Primary database with extensions:
  - `pgvector` - Vector similarity search for semantic features
  - `uuid-ossp` - UUID generation
- **Zod** - Runtime schema validation

### AI/ML Services
- **OpenAI API**
  - GPT-4/GPT-4o - Text generation, parsing, analysis
  - Whisper - Speech-to-text transcription
  - text-embedding-3-small - Vector embeddings

### External APIs
- **Stripe** - Payment processing and subscriptions
- **Semantic Scholar** - Academic citation data
- **OpenAlex** - Open scholarly metadata
- **CrossRef** - DOI resolution and metadata

### Infrastructure
- **Docker** - Containerization
- **Kubernetes** - Container orchestration
- **Google Cloud Platform**
  - GKE - Managed Kubernetes
  - Cloud SQL - Managed PostgreSQL
  - Cloud Storage - File uploads
  - Artifact Registry - Docker images
- **Terraform** - Infrastructure as Code
- **Cloud Build** - CI/CD pipeline

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │   Mobile     │  │     PWA      │          │
│  │   (SSR/SPA)  │  │   Browser    │  │   Offline    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nuxt Application                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Pages & Layouts                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Landing │ │  Auth   │ │   App   │ │ Shared  │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Components                           │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│   │
│  │  │Citation│ │Veritas │ │MindMap │ │Companion│ │  App   ││   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Composables                           │   │
│  │  useAuth │ useSubscription │ useVoiceInput │ useMindMap │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nitro Server                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API Routes                            │   │
│  │  /api/entries │ /api/projects │ /api/auth │ /api/export │   │
│  │  /api/citation │ /api/companion │ /api/subscription      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Services                             │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│   │
│  │  │Citation│ │Veritas │ │Companion│ │ Export │ │Sharing ││   │
│  │  │ Engine │ │ Score  │ │  RAG   │ │        │ │        ││   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Database Layer                         │   │
│  │              Drizzle ORM + PostgreSQL                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ Stripe │ │ OpenAI │ │Semantic│ │OpenAlex│ │CrossRef│        │
│  │        │ │  API   │ │Scholar │ │        │ │        │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
bibanna/
├── app.vue                 # Root Vue component
├── app.config.ts           # Nuxt UI theme configuration
├── nuxt.config.ts          # Nuxt configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── drizzle.config.ts       # Drizzle ORM configuration
├── vitest.config.ts        # Unit test configuration
├── playwright.config.ts    # E2E test configuration
│
├── components/             # Vue components
│   ├── app/               # Application-wide components
│   ├── citation/          # Citation formatting components
│   ├── companion/         # Research Companion AI components
│   ├── mindmap/           # D3.js mind map components
│   └── veritas/           # Credibility score components
│
├── composables/            # Vue composables (shared logic)
│   ├── useAuth.ts         # Authentication state
│   ├── useSubscription.ts # Subscription management
│   ├── useVoiceInput.ts   # Web Speech API wrapper
│   └── useMindMap.ts      # D3.js visualization logic
│
├── layouts/                # Page layouts
│   ├── default.vue        # Public pages layout
│   └── app.vue            # Authenticated app layout
│
├── middleware/             # Route middleware
│   └── auth.ts            # Authentication guard
│
├── pages/                  # File-based routing
│   ├── index.vue          # Landing page
│   ├── login.vue          # Login page
│   ├── signup.vue         # Registration page
│   ├── app/               # Authenticated routes
│   │   ├── index.vue      # Dashboard
│   │   ├── library/       # Entry management
│   │   ├── projects/      # Project management
│   │   ├── subscription.vue
│   │   └── settings/      # User settings
│   └── shared/            # Public shared content
│       └── [token].vue    # Shared project view
│
├── server/                 # Nitro server
│   ├── api/               # API endpoints
│   │   ├── auth/          # Authentication
│   │   ├── entries/       # Entry CRUD
│   │   ├── projects/      # Project CRUD
│   │   ├── tags/          # Tag management
│   │   ├── export/        # Export generation
│   │   ├── citation/      # Citation formatting
│   │   ├── companion/     # Research Companion
│   │   ├── voice/         # Voice transcription
│   │   ├── subscription/  # Billing management
│   │   ├── webhooks/      # External webhooks
│   │   └── shared/        # Public access
│   │
│   ├── database/          # Database layer
│   │   ├── schema.ts      # Drizzle schema definitions
│   │   ├── client.ts      # Database connection
│   │   └── migrations/    # SQL migrations
│   │
│   ├── services/          # Business logic
│   │   ├── citation/      # CSL processing
│   │   ├── companion/     # RAG and personas
│   │   ├── export/        # PDF, Excel, BibTeX
│   │   ├── graph/         # Mind map data
│   │   ├── sharing/       # Access control
│   │   ├── stripe/        # Payment processing
│   │   ├── url/           # Metadata extraction
│   │   └── veritas/       # Credibility scoring
│   │
│   └── utils/             # Server utilities
│       └── auth.ts        # Auth helpers, tier limits
│
├── shared/                 # Shared between client/server
│   ├── types/             # TypeScript interfaces
│   └── validation/        # Zod schemas
│
├── public/                 # Static assets
├── scripts/               # Utility scripts
│
├── k8s/                   # Kubernetes manifests
│   ├── base/              # Base resources
│   └── overlays/          # Environment patches
│       ├── staging/
│       └── production/
│
├── terraform/             # Infrastructure as Code
│   ├── main.tf            # GCP resources
│   ├── variables.tf       # Input variables
│   └── environments/      # Environment configs
│
└── tests/                 # Test files
    ├── unit/              # Vitest unit tests
    └── e2e/               # Playwright E2E tests
```

---

## Core Concepts

### Entries
The central data model. An entry represents any bibliographic source (book, article, website, etc.). Entries:
- Belong to a user
- Can be associated with multiple projects
- Can have multiple tags
- Can have multiple annotations
- May have a Veritas credibility score

### Projects
Collections of entries for organizing research. Projects:
- Belong to a user
- Can be shared with other users or publicly
- Have their own mind map visualization
- Can have a Research Companion persona

### Annotations
Notes attached to entries. Types include:
- Summary
- Quote
- Comment
- Question
- Critique
- Methodology
- Key Finding

### Tags
User-defined labels for categorizing entries across projects.

---

## Data Flow

### Entry Creation Flow
```
User Input → Validation (Zod) → API Route → Service Layer → Database
     ↓
Optional: URL Metadata Extraction → AI Enhancement
     ↓
Optional: Veritas Score Calculation (async)
     ↓
Optional: Embedding Generation for RAG (async)
```

### Citation Formatting Flow
```
Entry Selection → Citation Style Selection → CSL Processor
     ↓
Style XML (from CSL repo or custom) → citeproc-js engine
     ↓
Formatted Bibliography + In-text Citation
```

### Research Companion Flow
```
User Query → Embedding Generation → Vector Search (pgvector)
     ↓
Top-K Relevant Chunks → Context Assembly
     ↓
LLM Prompt (with persona + context) → GPT-4 Response
     ↓
Citation Extraction → Follow-up Suggestions
```

---

## Authentication & Authorization

### Authentication
- Session-based authentication using `nuxt-auth-utils`
- Password hashing (bcrypt in production)
- OAuth support ready (Auth0/Clerk integration points)

### Authorization Levels
1. **Public** - No authentication required
2. **Authenticated** - Valid session required
3. **Owner** - Must own the resource
4. **Shared** - Has explicit share permission
5. **Tier-gated** - Requires specific subscription tier

### Middleware
```typescript
// Route protection
definePageMeta({
  middleware: 'auth'  // Requires authentication
})

// API protection
const user = await requireAuth(event)        // Throws if not authenticated
const user = await optionalAuth(event)       // Returns null if not authenticated
requireProTier(user)                         // Throws if not Pro tier
requireLightOrProTier(user)                  // Throws if Free tier
```

---

## Subscription Tiers

| Feature | Free | Light ($9/mo) | Pro ($19/mo) |
|---------|------|---------------|--------------|
| Entries | 50 | 500 | Unlimited |
| Projects | 3 | 15 | Unlimited |
| PDF Export | No | Yes | Yes |
| Custom Citation Styles | 0 | 3 | Unlimited |
| Collaborators/Project | 0 | 3 | Unlimited |
| AI Annotations | 0 | 5/mo | 50/mo |
| Voice Transcription | 0 | 10 min/mo | 60 min/mo |
| Research Companion | No | No | Yes |
| Veritas Score | No | No | Yes |
| Mind Maps | No | Basic | Full |

Tier limits are defined in `server/utils/auth.ts` as `TIER_LIMITS`.

---

## External Integrations

### Stripe
- Webhook handler at `/api/webhooks/stripe`
- Events: checkout.session.completed, subscription.updated/deleted, invoice.payment_succeeded/failed
- Customer portal for self-service billing

### OpenAI
- GPT-4/GPT-4o for text generation
- Whisper for audio transcription
- text-embedding-3-small for vector embeddings

### Academic APIs
- **Semantic Scholar**: Citation counts, h-index, influential citations
- **OpenAlex**: Institutional data, DOAJ status, retraction checks
- **CrossRef**: DOI metadata, publisher information

### CSL Repository
- Citation styles fetched from official GitHub repository
- Cached in memory for performance

---

## Key Design Decisions

### 1. Full-Stack Nuxt
Chose Nuxt 3 for unified frontend/backend in TypeScript, reducing context switching and enabling code sharing.

### 2. PostgreSQL with pgvector
Single database for both relational data and vector search, avoiding separate vector database infrastructure.

### 3. Service Layer Pattern
Business logic extracted into services (`server/services/`) keeping API routes thin and testable.

### 4. Composables for Shared Logic
Vue composables encapsulate reusable client-side logic (auth state, voice input, D3 visualization).

### 5. Feature Gating via Middleware
Subscription tier checks centralized in auth utilities, applied consistently across API routes.

### 6. D3.js over Cytoscape
Chose D3.js for mind maps due to native SVG output (copy/paste friendly) and lighter weight.

### 7. CSL for Citations
Industry-standard Citation Style Language ensures compatibility with thousands of existing styles.

---

## Further Reading

- [Database Schema](./DATABASE.md)
- [API Reference](./API.md)
- [Component Guide](./COMPONENTS.md)
- [Services Guide](./SERVICES.md)
- [Deployment Guide](./DEPLOYMENT.md)
