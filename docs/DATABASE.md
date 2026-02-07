# Database Schema Documentation

This document describes the PostgreSQL database schema used by Bibanna, including all tables, relationships, and key design patterns.

## Overview

Bibanna uses PostgreSQL 18 with the following extensions:
- **uuid-ossp** - UUID generation for primary keys
- **pgvector** - Vector similarity search for semantic features

The schema is defined using Drizzle ORM in `server/database/schema.ts`.

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │   entries   │       │   projects  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)     │   ┌──│ id (PK)     │
│ email       │  │    │ userId (FK) │───┤  │ userId (FK) │
│ name        │  └───▶│ entryType   │   │  │ name        │
│ tier        │       │ title       │   │  │ description │
│ stripeId    │       │ authors     │   │  └─────────────┘
└─────────────┘       │ metadata    │   │
      │               │ embeddings  │   │  ┌─────────────┐
      │               └─────────────┘   │  │entryProjects│
      │                     │           │  ├─────────────┤
      │                     │           └─▶│ entryId(FK) │
      ▼                     ▼              │ projectId   │
┌─────────────┐       ┌─────────────┐      └─────────────┘
│subscriptions│       │ annotations │
├─────────────┤       ├─────────────┤      ┌─────────────┐
│ id (PK)     │       │ id (PK)     │      │  entryTags  │
│ userId (FK) │       │ entryId(FK) │      ├─────────────┤
│ stripeSubId │       │ type        │      │ entryId(FK) │
│ status      │       │ content     │      │ tagId (FK)  │
│ priceId     │       │ page        │      └─────────────┘
└─────────────┘       │ highlight   │            │
                      └─────────────┘            ▼
                                          ┌─────────────┐
┌─────────────┐       ┌─────────────┐     │    tags     │
│veritasScores│       │citationStyle│     ├─────────────┤
├─────────────┤       ├─────────────┤     │ id (PK)     │
│ id (PK)     │       │ id (PK)     │     │ userId (FK) │
│ entryId(FK) │       │ userId (FK) │     │ name        │
│ overall     │       │ name        │     │ color       │
│ factors     │       │ cslXml      │     └─────────────┘
│ sources     │       │ category    │
└─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐     ┌─────────────┐
│projectShares│       │excelPresets │     │documentChunk│
├─────────────┤       ├─────────────┤     ├─────────────┤
│ id (PK)     │       │ id (PK)     │     │ id (PK)     │
│ projectId   │       │ userId (FK) │     │ projectId   │
│ sharedWith  │       │ name        │     │ sourceType  │
│ permission  │       │ columns     │     │ content     │
│ publicToken │       │ formatting  │     │ embedding   │
└─────────────┘       └─────────────┘     └─────────────┘

┌─────────────┐       ┌─────────────┐     ┌─────────────┐
│researchPersona│     │companionConv│     │companionMsg │
├─────────────┤       ├─────────────┤     ├─────────────┤
│ id (PK)     │       │ id (PK)     │     │ id (PK)     │
│ projectId   │       │ projectId   │     │ convId (FK) │
│ name        │       │ title       │     │ role        │
│ expertise   │       │ mode        │     │ content     │
│ style       │       │ userId (FK) │     │ citations   │
└─────────────┘       └─────────────┘     └─────────────┘
```

---

## Tables

### users

Core user account information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (auto-generated) |
| `email` | varchar(255) | Unique email address |
| `name` | varchar(255) | Display name |
| `passwordHash` | text | Bcrypt hashed password |
| `tier` | subscription_tier | Current subscription: 'free', 'light', 'pro' |
| `stripeCustomerId` | varchar(255) | Stripe customer ID |
| `createdAt` | timestamp | Account creation time |
| `updatedAt` | timestamp | Last update time |

**Indexes**: `email` (unique)

---

### subscriptions

Tracks Stripe subscription details.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `userId` | uuid | Foreign key to users |
| `stripeSubscriptionId` | varchar(255) | Stripe subscription ID |
| `status` | varchar(50) | active, canceled, past_due, etc. |
| `priceId` | varchar(255) | Stripe price ID |
| `currentPeriodStart` | timestamp | Billing period start |
| `currentPeriodEnd` | timestamp | Billing period end |
| `cancelAtPeriodEnd` | boolean | Will cancel at period end |
| `createdAt` | timestamp | Record creation time |
| `updatedAt` | timestamp | Last update time |

**Relationships**: One-to-one with users

---

### projects

User-created project containers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `userId` | uuid | Foreign key to owner |
| `name` | varchar(255) | Project name |
| `description` | text | Optional description |
| `isArchived` | boolean | Soft archive flag |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update time |

**Relationships**: Many-to-one with users, Many-to-many with entries

---

### tags

User-defined labels for categorization.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `userId` | uuid | Foreign key to owner |
| `name` | varchar(100) | Tag name |
| `color` | varchar(20) | Hex color code |
| `createdAt` | timestamp | Creation time |

**Relationships**: Many-to-one with users, Many-to-many with entries

---

### entries

Bibliographic source records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `userId` | uuid | Foreign key to owner |
| `entryType` | entry_type | Enum: book, article, journal, website, etc. |
| `title` | text | Source title |
| `authors` | jsonb | Array of author objects |
| `publicationDate` | date | When published |
| `publisher` | varchar(255) | Publisher name |
| `journal` | varchar(255) | Journal name (if applicable) |
| `volume` | varchar(50) | Volume number |
| `issue` | varchar(50) | Issue number |
| `pages` | varchar(50) | Page range |
| `doi` | varchar(255) | Digital Object Identifier |
| `isbn` | varchar(20) | ISBN for books |
| `url` | text | Web URL |
| `accessDate` | date | Date URL was accessed |
| `abstract` | text | Source abstract |
| `notes` | text | Personal notes |
| `metadata` | jsonb | Flexible additional data |
| `titleEmbedding` | vector(1536) | Title vector embedding |
| `contentEmbedding` | vector(1536) | Content vector embedding |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update time |

**Relationships**: Many-to-one with users, Many-to-many with projects and tags

**Indexes**: 
- `userId`
- `titleEmbedding` (ivfflat for vector search)
- `contentEmbedding` (ivfflat for vector search)

---

### entryProjects

Junction table for entries-projects many-to-many.

| Column | Type | Description |
|--------|------|-------------|
| `entryId` | uuid | Foreign key to entries |
| `projectId` | uuid | Foreign key to projects |
| `addedAt` | timestamp | When entry was added to project |

**Primary Key**: Composite (entryId, projectId)

---

### entryTags

Junction table for entries-tags many-to-many.

| Column | Type | Description |
|--------|------|-------------|
| `entryId` | uuid | Foreign key to entries |
| `tagId` | uuid | Foreign key to tags |

**Primary Key**: Composite (entryId, tagId)

---

### annotations

Notes and highlights attached to entries.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `entryId` | uuid | Foreign key to entries |
| `userId` | uuid | Foreign key to creator |
| `type` | annotation_type | Enum: summary, quote, comment, etc. |
| `content` | text | Annotation text |
| `page` | varchar(50) | Page reference |
| `highlight` | text | Highlighted text |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update time |

**Relationships**: Many-to-one with entries and users

---

### veritasScores

Credibility assessments for entries.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `entryId` | uuid | Foreign key to entries |
| `overall` | integer | Score 0-100 |
| `confidence` | integer | Confidence level 0-100 |
| `factors` | jsonb | Breakdown by factor |
| `sources` | jsonb | External data sources used |
| `manualOverride` | boolean | User manually set score |
| `calculatedAt` | timestamp | When calculated |
| `createdAt` | timestamp | Record creation |

**Relationships**: One-to-one with entries

---

### citationStyles

User-created custom citation styles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `userId` | uuid | Foreign key to creator |
| `name` | varchar(255) | Style name |
| `description` | text | Style description |
| `category` | varchar(100) | Style category |
| `cslXml` | text | CSL XML definition |
| `isDefault` | boolean | System default style |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update time |

**Relationships**: Many-to-one with users

---

### projectShares

Access control for project sharing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `projectId` | uuid | Foreign key to projects |
| `sharedWithUserId` | uuid | Foreign key to recipient user (nullable) |
| `permission` | share_permission | Enum: view, comment, edit |
| `publicToken` | varchar(64) | Unique token for public links |
| `expiresAt` | timestamp | Optional expiration |
| `createdAt` | timestamp | Share creation time |

**Relationships**: Many-to-one with projects and users

**Indexes**: `publicToken` (unique)

---

### excelPresets

Saved configurations for Excel exports.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `userId` | uuid | Foreign key to owner |
| `name` | varchar(255) | Preset name |
| `columns` | jsonb | Column configuration |
| `formatting` | jsonb | Formatting options |
| `includeSummary` | boolean | Include summary sheet |
| `isDefault` | boolean | User's default preset |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update time |

**Relationships**: Many-to-one with users

---

### documentChunks

Chunked documents for RAG (Research Companion).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `projectId` | uuid | Foreign key to projects |
| `sourceType` | varchar(50) | entry, annotation, upload |
| `sourceId` | uuid | ID of source record |
| `chunkIndex` | integer | Position in source |
| `content` | text | Chunk text content |
| `embedding` | vector(1536) | Vector embedding |
| `metadata` | jsonb | Additional metadata |
| `createdAt` | timestamp | Creation time |

**Relationships**: Many-to-one with projects

**Indexes**: `embedding` (ivfflat for vector search)

---

### projectUploads

File uploads for Research Companion.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `projectId` | uuid | Foreign key to projects |
| `userId` | uuid | Foreign key to uploader |
| `filename` | varchar(255) | Original filename |
| `mimeType` | varchar(100) | File MIME type |
| `size` | integer | File size in bytes |
| `storagePath` | text | Cloud storage path |
| `status` | varchar(50) | processing, ready, failed |
| `createdAt` | timestamp | Upload time |

**Relationships**: Many-to-one with projects and users

---

### researchPersonas

AI personas for Research Companion.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `projectId` | uuid | Foreign key to projects |
| `name` | varchar(255) | Persona name |
| `description` | text | Persona description |
| `expertise` | jsonb | Areas of expertise |
| `researchFocus` | jsonb | Research focus areas |
| `communicationStyle` | jsonb | Communication preferences |
| `suggestedQuestions` | jsonb | Suggested research questions |
| `createdAt` | timestamp | Generation time |
| `updatedAt` | timestamp | Last regeneration |

**Relationships**: One-to-one with projects

---

### companionConversations

Conversation threads with Research Companion.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `projectId` | uuid | Foreign key to projects |
| `userId` | uuid | Foreign key to user |
| `title` | varchar(255) | Conversation title |
| `mode` | varchar(50) | general, fact-check, brainstorm, etc. |
| `createdAt` | timestamp | Conversation start |
| `updatedAt` | timestamp | Last message time |

**Relationships**: Many-to-one with projects and users

---

### companionMessages

Individual messages in conversations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `conversationId` | uuid | Foreign key to conversations |
| `role` | varchar(20) | user, assistant, system |
| `content` | text | Message content |
| `citations` | jsonb | Source citations (for assistant) |
| `confidence` | integer | Confidence score (for assistant) |
| `followUpQuestions` | jsonb | Suggested follow-ups |
| `createdAt` | timestamp | Message time |

**Relationships**: Many-to-one with conversations

---

## Enums

### subscription_tier
```sql
CREATE TYPE subscription_tier AS ENUM ('free', 'light', 'pro');
```

### entry_type
```sql
CREATE TYPE entry_type AS ENUM (
  'book', 'article', 'journal', 'website', 'newspaper',
  'magazine', 'thesis', 'conference', 'report', 'video',
  'podcast', 'interview', 'legal', 'patent', 'dataset', 'other'
);
```

### annotation_type
```sql
CREATE TYPE annotation_type AS ENUM (
  'summary', 'quote', 'comment', 'question',
  'critique', 'methodology', 'key_finding'
);
```

### share_permission
```sql
CREATE TYPE share_permission AS ENUM ('view', 'comment', 'edit');
```

---

## Vector Indexes

For efficient similarity search, create ivfflat indexes on vector columns:

```sql
-- After accumulating data, create indexes
CREATE INDEX entries_title_embedding_idx 
  ON entries USING ivfflat (title_embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX entries_content_embedding_idx 
  ON entries USING ivfflat (content_embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX document_chunks_embedding_idx 
  ON document_chunks USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
```

---

## Migration Strategy

Migrations are managed using Drizzle Kit:

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema directly (development only)
npm run db:push
```

Migration files are stored in `server/database/migrations/` and should be version controlled.

### Rollback Considerations

Drizzle ORM doesn't have built-in rollback. For safe deployments:

1. Always backup before migrating
2. Use expand-contract pattern for breaking changes
3. Keep migrations small and focused
4. Test migrations in staging first

---

## Query Patterns

### Vector Similarity Search
```typescript
// Find similar entries by title embedding
const similar = await db
  .select()
  .from(entries)
  .orderBy(sql`title_embedding <=> ${queryEmbedding}::vector`)
  .limit(10)
```

### JSON Queries
```typescript
// Query JSONB metadata
const withDoi = await db
  .select()
  .from(entries)
  .where(sql`metadata->>'doi' IS NOT NULL`)
```

### Many-to-Many Joins
```typescript
// Get entries with their projects
const entriesWithProjects = await db
  .select()
  .from(entries)
  .leftJoin(entryProjects, eq(entries.id, entryProjects.entryId))
  .leftJoin(projects, eq(entryProjects.projectId, projects.id))
  .where(eq(entries.userId, userId))
```
