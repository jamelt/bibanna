# API Reference

This document describes all API endpoints in Bibanna. All endpoints are prefixed with `/api/`.

## Authentication

Most endpoints require authentication via session cookie. The `requireAuth(event)` utility validates sessions and returns the current user.

### Headers
- Session cookie is set automatically on login/register
- No manual Authorization header required for browser clients

### Error Responses
All endpoints return consistent error format:
```json
{
  "statusCode": 401,
  "message": "Authentication required"
}
```

---

## Auth Endpoints

### POST /api/auth/register
Create a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "free"
  }
}
```

---

### POST /api/auth/login
Authenticate and create session.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "light"
  }
}
```

---

### POST /api/auth/logout
End current session.

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Entry Endpoints

### GET /api/entries
List user's entries with pagination and filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `search` | string | Search in title/authors |
| `type` | string | Filter by entry type |
| `projectId` | uuid | Filter by project |
| `tagId` | uuid | Filter by tag |
| `sort` | string | Sort field (createdAt, title, publicationDate) |
| `order` | string | Sort order (asc, desc) |

**Response:** `200 OK`
```json
{
  "entries": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### POST /api/entries
Create a new entry.

**Body:**
```json
{
  "entryType": "book",
  "title": "The Great Book",
  "authors": [
    { "firstName": "John", "lastName": "Doe" }
  ],
  "publicationDate": "2024-01-15",
  "publisher": "Academic Press",
  "isbn": "978-3-16-148410-0",
  "projectIds": ["uuid"],
  "tagIds": ["uuid"]
}
```

**Response:** `201 Created`
```json
{
  "entry": { ... }
}
```

---

### GET /api/entries/[id]
Get a single entry by ID.

**Response:** `200 OK`
```json
{
  "entry": {
    "id": "uuid",
    "title": "...",
    "projects": [...],
    "tags": [...],
    "annotationCount": 5
  }
}
```

---

### PUT /api/entries/[id]
Update an entry.

**Body:** Partial entry object with fields to update.

**Response:** `200 OK`
```json
{
  "entry": { ... }
}
```

---

### DELETE /api/entries/[id]
Delete an entry.

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### POST /api/entries/lookup-url
Extract metadata from a URL.

**Body:**
```json
{
  "url": "https://example.com/article",
  "useAI": true
}
```

**Response:** `200 OK`
```json
{
  "metadata": {
    "title": "Article Title",
    "authors": [...],
    "publisher": "...",
    "publicationDate": "2024-01-01",
    "entryType": "article",
    "confidence": 85
  }
}
```

---

## Annotation Endpoints

### GET /api/entries/[id]/annotations
Get all annotations for an entry.

**Response:** `200 OK`
```json
{
  "annotations": [
    {
      "id": "uuid",
      "type": "quote",
      "content": "Important text...",
      "page": "42"
    }
  ]
}
```

---

### POST /api/entries/[id]/annotations
Create an annotation.

**Body:**
```json
{
  "type": "summary",
  "content": "This article discusses...",
  "page": "1-5",
  "highlight": "key phrase"
}
```

**Response:** `201 Created`

---

## Veritas Score Endpoints

**Requires:** Pro tier

### GET /api/entries/[id]/veritas
Get or calculate Veritas credibility score.

**Response:** `200 OK`
```json
{
  "score": {
    "overall": 78,
    "confidence": 85,
    "label": "High",
    "factors": {
      "publisherReputation": { "score": 90, "weight": 0.2, "evidence": "..." },
      "peerReviewStatus": { "score": 80, "weight": 0.2, "evidence": "..." },
      "authorCredentials": { "score": 75, "weight": 0.15, "evidence": "..." },
      "citationImpact": { "score": 65, "weight": 0.15, "evidence": "..." }
    }
  }
}
```

---

### POST /api/entries/[id]/veritas
Refresh or manually override score.

**Body:**
```json
{
  "refresh": true
}
```
Or for manual override:
```json
{
  "override": {
    "overall": 85,
    "reason": "Verified through institution"
  }
}
```

---

## Project Endpoints

### GET /api/projects
List user's projects.

**Response:** `200 OK`
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Research Project",
      "entryCount": 25,
      "createdAt": "..."
    }
  ]
}
```

---

### POST /api/projects
Create a project.

**Body:**
```json
{
  "name": "My Research",
  "description": "Optional description"
}
```

**Response:** `201 Created`

---

### GET /api/projects/[id]
Get project with entries.

**Response:** `200 OK`
```json
{
  "project": {
    "id": "uuid",
    "name": "...",
    "entries": [...],
    "shares": [...]
  }
}
```

---

### GET /api/projects/[id]/graph
Get graph data for mind map visualization.

**Requires:** Light or Pro tier

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `showAuthors` | boolean | Include author nodes |
| `showTags` | boolean | Include tag nodes |
| `showSimilar` | boolean | Include similarity edges |

**Response:** `200 OK`
```json
{
  "nodes": [
    { "id": "entry-uuid", "type": "entry", "label": "Title", "metadata": {...} }
  ],
  "edges": [
    { "source": "entry-1", "target": "author-1", "type": "authored_by" }
  ]
}
```

---

## Sharing Endpoints

### GET /api/projects/[id]/shares
List all shares for a project.

**Response:** `200 OK`
```json
{
  "shares": [
    {
      "id": "uuid",
      "sharedWithUser": { "email": "...", "name": "..." },
      "permission": "view"
    }
  ],
  "publicLink": {
    "token": "abc123...",
    "permission": "view",
    "expiresAt": null
  }
}
```

---

### POST /api/projects/[id]/shares
Create a share.

**Body (user share):**
```json
{
  "email": "colleague@university.edu",
  "permission": "comment"
}
```

**Body (public link):**
```json
{
  "public": true,
  "permission": "view",
  "expiresInDays": 30
}
```

**Response:** `201 Created`

---

### DELETE /api/projects/[id]/shares/[shareId]
Remove a share.

**Response:** `200 OK`

---

### GET /api/shared/[token]
Public endpoint to view shared project.

**Response:** `200 OK`
```json
{
  "project": {
    "name": "...",
    "owner": { "name": "..." },
    "permission": "view",
    "entries": [...]
  }
}
```

---

## Citation Endpoints

### GET /api/citation/styles
List available citation styles.

**Response:** `200 OK`
```json
{
  "default": [
    {
      "id": "apa",
      "name": "APA 7th Edition",
      "category": "author-date",
      "description": "..."
    }
  ],
  "custom": [
    {
      "id": "uuid",
      "name": "My Custom Style",
      "category": "numeric"
    }
  ]
}
```

---

### POST /api/citation/styles
Create a custom citation style.

**Requires:** Light (max 3) or Pro tier

**Body:**
```json
{
  "name": "Custom IEEE",
  "description": "Modified IEEE style",
  "category": "numeric",
  "cslXml": "<?xml version=\"1.0\"?>..."
}
```

**Response:** `201 Created`

---

### POST /api/citation/format
Format entries as citations.

**Body:**
```json
{
  "entryIds": ["uuid1", "uuid2"],
  "styleId": "apa",
  "format": "bibliography"
}
```

**Response:** `200 OK`
```json
{
  "bibliography": "<div class=\"csl-bib-body\">...</div>",
  "citations": {
    "uuid1": "(Doe, 2024)",
    "uuid2": "(Smith, 2023)"
  }
}
```

---

### POST /api/citation/preview
Preview a citation style.

**Body:**
```json
{
  "styleId": "mla9"
}
```

**Response:** `200 OK`
```json
{
  "preview": {
    "bibliography": "...",
    "inTextCitation": "..."
  }
}
```

---

## Export Endpoints

### GET /api/export/presets
Get available Excel export presets.

**Response:** `200 OK`
```json
{
  "presets": [
    {
      "id": "standard",
      "name": "Standard Export",
      "columns": [...],
      "isSystem": true
    }
  ],
  "availableColumns": [
    { "key": "title", "label": "Title", "type": "text" }
  ]
}
```

---

### POST /api/export/presets
Create a custom export preset.

**Body:**
```json
{
  "name": "My Preset",
  "columns": [
    { "key": "title", "width": 40 },
    { "key": "authors", "width": 30 }
  ],
  "includeSummary": true
}
```

---

### POST /api/export/excel
Generate Excel file.

**Body:**
```json
{
  "entryIds": ["uuid1", "uuid2"],
  "presetId": "standard",
  "includeAnnotations": true
}
```

**Response:** `200 OK` with `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

### POST /api/export/pdf
Generate PDF file.

**Requires:** Light or Pro tier

**Body:**
```json
{
  "entryIds": ["uuid1", "uuid2"],
  "styleId": "apa",
  "includeAnnotations": true,
  "title": "My Bibliography"
}
```

**Response:** `200 OK` with `application/pdf`

---

### POST /api/export/bibtex
Generate BibTeX file.

**Body:**
```json
{
  "entryIds": ["uuid1", "uuid2"]
}
```

**Response:** `200 OK` with `application/x-bibtex`

---

## Voice Endpoints

### POST /api/voice/transcribe
Transcribe audio using Whisper API.

**Requires:** Light (10 min/mo) or Pro (60 min/mo) tier

**Body:** `multipart/form-data` with `audio` file

**Response:** `200 OK`
```json
{
  "text": "Transcribed text here",
  "duration": 45.2,
  "remainingMinutes": 9.2
}
```

---

### POST /api/voice/parse
Parse voice transcript into structured data.

**Body:**
```json
{
  "transcript": "Add a book called The Great Gatsby by F. Scott Fitzgerald",
  "mode": "auto"
}
```

**Response:** `200 OK`
```json
{
  "type": "entry",
  "data": {
    "entryType": "book",
    "title": "The Great Gatsby",
    "authors": [{ "firstName": "F. Scott", "lastName": "Fitzgerald" }]
  }
}
```

---

## Research Companion Endpoints

**Requires:** Pro tier

### GET /api/companion/[projectId]/persona
Get or generate research persona.

**Response:** `200 OK`
```json
{
  "persona": {
    "name": "Dr. Research Assistant",
    "description": "...",
    "expertise": ["topic1", "topic2"],
    "communicationStyle": {
      "tone": "academic",
      "depth": "thorough"
    },
    "suggestedQuestions": [...]
  }
}
```

---

### GET /api/companion/[projectId]/conversations
List conversation history.

**Response:** `200 OK`
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Research methodology discussion",
      "mode": "general",
      "messageCount": 12,
      "updatedAt": "..."
    }
  ]
}
```

---

### POST /api/companion/[projectId]/chat
Send a message and get AI response.

**Body:**
```json
{
  "message": "What are the main themes in my sources?",
  "conversationId": "uuid",
  "mode": "synthesize"
}
```

**Response:** `200 OK`
```json
{
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Based on your sources...",
    "citations": [
      { "entryId": "uuid", "chunk": "relevant text" }
    ],
    "confidence": 85,
    "followUpQuestions": [
      "Would you like me to elaborate on...",
      "Have you considered..."
    ]
  },
  "conversationId": "uuid"
}
```

---

## Subscription Endpoints

### GET /api/subscription
Get current subscription status.

**Response:** `200 OK`
```json
{
  "tier": "light",
  "status": "active",
  "currentPeriodEnd": "2024-02-15T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "limits": {
    "entries": { "used": 45, "max": 500 },
    "projects": { "used": 5, "max": 15 }
  },
  "pricing": {
    "light": { "monthly": 900, "yearly": 9000 },
    "pro": { "monthly": 1900, "yearly": 19000 }
  }
}
```

---

### POST /api/subscription/checkout
Create Stripe checkout session.

**Body:**
```json
{
  "tier": "pro",
  "interval": "yearly"
}
```

**Response:** `200 OK`
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

### POST /api/subscription/portal
Create Stripe customer portal session.

**Response:** `200 OK`
```json
{
  "url": "https://billing.stripe.com/..."
}
```

---

## Webhook Endpoints

### POST /api/webhooks/stripe
Stripe webhook handler (signature verified).

Handles events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## Health Check

### GET /api/health
Application health status.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected"
}
```

---

## Error Codes

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions or tier |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently implemented per-endpoint for expensive operations:
- Voice transcription: Based on monthly tier limits
- AI annotations: Based on monthly tier limits
- Veritas calculations: 100/day for Pro users
