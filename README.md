# Bibanna

A modern bibliography and annotation management platform for researchers, students, and professors.

## Features

- **Comprehensive Library**: Track books, journals, articles, websites, and 15+ source types
- **Rich Annotations**: Add descriptive, evaluative, and reflective annotations to sources
- **Smart Organization**: Projects, tags, and powerful search capabilities
- **Citation Styles**: Generate citations in APA, MLA, Chicago, and hundreds of styles
- **Veritas Score**: AI-powered source credibility assessment
- **Research Companion**: RAG-powered AI assistant for Pro users
- **Export Options**: PDF, DOCX, Excel with full customization
- **Mind Maps**: Visualize connections between sources
- **Collaboration**: Share projects with team members
- **Mobile-First**: Full PWA support with offline capabilities

## Tech Stack

- **Framework**: Nuxt 3 (Vue 3 + Nitro)
- **UI**: Nuxt UI + Tailwind CSS
- **Database**: PostgreSQL with pgvector
- **ORM**: Drizzle ORM
- **Auth**: nuxt-auth-utils (Auth0/Clerk compatible)
- **Payments**: Stripe
- **AI**: OpenAI (embeddings, GPT-4, Whisper)

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker and Docker Compose
- PostgreSQL 18+ (or use Docker)

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/your-username/bibanna.git
cd bibanna
pnpm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Database

```bash
docker-compose up -d postgres
```

### 4. Run Migrations

```bash
pnpm db:push
```

### 5. Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
bibanna/
├── app.vue                 # Root component
├── app.config.ts           # App configuration (UI theme)
├── nuxt.config.ts          # Nuxt configuration
├── components/             # Vue components
│   ├── app/                # App-specific components
│   └── ...
├── composables/            # Vue composables
├── layouts/                # Page layouts
├── middleware/             # Route middleware
├── pages/                  # File-based routing
│   ├── index.vue           # Landing page
│   └── app/                # Authenticated app pages
├── server/                 # Server-side code
│   ├── api/                # API routes
│   ├── database/           # Drizzle schema and client
│   ├── services/           # Business logic
│   └── utils/              # Server utilities
├── shared/                 # Shared types and validation
│   ├── types/              # TypeScript types
│   └── validation/         # Zod schemas
├── public/                 # Static assets
└── scripts/                # Database scripts
```

## Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio

# Testing
pnpm test             # Run unit tests
pnpm test:e2e         # Run E2E tests
pnpm test:coverage    # Run tests with coverage

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint errors
pnpm typecheck        # Run type checking
```

## API Routes

### Entries
- `GET /api/entries` - List entries with search/filter
- `POST /api/entries` - Create entry
- `GET /api/entries/:id` - Get entry details
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

### Annotations
- `GET /api/entries/:id/annotations` - List annotations
- `POST /api/entries/:id/annotations` - Create annotation

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project with entries

### Tags
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag

## Subscription Tiers

| Feature | Free | Light ($9/mo) | Pro ($19/mo) |
|---------|------|---------------|--------------|
| Entries | 50 | 500 | Unlimited |
| Projects | 3 | 15 | Unlimited |
| Export formats | BibTeX | PDF, Excel, BibTeX | All |
| Custom citation styles | - | 3 | Unlimited |
| AI features | - | Basic | Full |
| Research Companion | - | - | Yes |
| Collaboration | - | 3/project | Unlimited |

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/bibanna"

# Authentication
NUXT_AUTH0_DOMAIN="your-tenant.auth0.com"
NUXT_AUTH0_CLIENT_ID="your-client-id"
NUXT_AUTH0_CLIENT_SECRET="your-client-secret"

# Stripe
NUXT_STRIPE_SECRET_KEY="sk_test_..."
NUXT_STRIPE_WEBHOOK_SECRET="whsec_..."
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# OpenAI
NUXT_OPENAI_API_KEY="sk-..."

# Session
NUXT_SESSION_SECRET="your-session-secret"
```

## Deployment

### Docker

```bash
docker build -t bibanna .
docker run -p 3000:3000 bibanna
```

### Kubernetes (GKE)

See `k8s/` directory for Kubernetes manifests and Kustomize overlays.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
