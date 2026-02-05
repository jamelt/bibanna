# Component Guide

This document describes the Vue components used in Bibanna, their purpose, and usage patterns.

## Component Organization

Components are organized by feature domain:

```
components/
├── app/           # Application-wide components
├── citation/      # Citation formatting components
├── companion/     # Research Companion AI components
├── mindmap/       # D3.js visualization components
└── veritas/       # Credibility score components
```

---

## App Components

### ExportModal

Modal for exporting entries to various formats (Excel, PDF, BibTeX).

**File:** `components/app/ExportModal.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `modelValue` | boolean | Yes | Controls modal visibility |
| `entryIds` | string[] | Yes | IDs of entries to export |
| `projectName` | string | No | Name for export file |

**Events:**
- `update:modelValue` - Emitted when modal closes
- `exported` - Emitted after successful export with format

**Usage:**
```vue
<ExportModal
  v-model="showExport"
  :entry-ids="selectedEntryIds"
  project-name="My Research"
  @exported="handleExported"
/>
```

**Features:**
- Format selection (Excel, PDF, BibTeX)
- Excel preset selection/customization
- Citation style selection for PDF
- Include/exclude annotations toggle
- Progress indicator during export

---

### ProjectFormModal

Modal for creating and editing projects.

**File:** `components/app/ProjectFormModal.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `modelValue` | boolean | Yes | Controls visibility |
| `project` | Project | No | Existing project to edit |

**Events:**
- `update:modelValue` - Modal close
- `saved` - Project created/updated

**Usage:**
```vue
<ProjectFormModal
  v-model="showModal"
  :project="editingProject"
  @saved="refreshProjects"
/>
```

---

### QuickAddModal

Fast entry creation with voice and URL support.

**File:** `components/app/QuickAddModal.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `modelValue` | boolean | Yes | Controls visibility |
| `projectId` | string | No | Default project for new entry |

**Events:**
- `update:modelValue` - Modal close
- `created` - Entry created successfully

**Features:**
- Voice input with real-time transcription
- URL paste with automatic metadata extraction
- Entry type quick selection
- Minimal required fields for speed

**Usage:**
```vue
<QuickAddModal
  v-model="quickAdd"
  :project-id="currentProject?.id"
  @created="refreshEntries"
/>
```

---

### ShareModal

Manage project sharing settings.

**File:** `components/app/ShareModal.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `modelValue` | boolean | Yes | Controls visibility |
| `projectId` | string | Yes | Project to share |

**Features:**
- User search and invite
- Permission level selection (view/comment/edit)
- Public link generation
- Link expiration settings
- Copy link to clipboard

---

### UpgradePrompt

Prompt users to upgrade their subscription.

**File:** `components/app/UpgradePrompt.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `feature` | string | Yes | Feature requiring upgrade |
| `requiredTier` | 'light' \| 'pro' | Yes | Minimum required tier |
| `inline` | boolean | No | Inline vs card display |

**Usage:**
```vue
<UpgradePrompt
  feature="PDF Export"
  required-tier="light"
/>
```

---

### VoiceInput

Reusable voice recording component.

**File:** `components/app/VoiceInput.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `modelValue` | string | Yes | Transcribed text |
| `placeholder` | string | No | Input placeholder |
| `useWhisper` | boolean | No | Use Whisper API vs Web Speech |
| `disabled` | boolean | No | Disable input |

**Events:**
- `update:modelValue` - Text updated
- `recording` - Recording started/stopped
- `error` - Error occurred

**Usage:**
```vue
<VoiceInput
  v-model="transcription"
  placeholder="Speak to add entry..."
  :use-whisper="isPro"
/>
```

---

## Citation Components

### StylePicker

Citation style selection dropdown.

**File:** `components/citation/StylePicker.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `modelValue` | string | Yes | Selected style ID |
| `showCustom` | boolean | No | Show custom styles option |

**Events:**
- `update:modelValue` - Style selected

**Usage:**
```vue
<StylePicker
  v-model="selectedStyle"
  show-custom
/>
```

---

### Preview

Live citation preview component.

**File:** `components/citation/Preview.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `styleId` | string | Yes | Citation style to preview |
| `entries` | Entry[] | No | Entries to format (uses sample if empty) |

**Features:**
- Bibliography preview
- In-text citation preview
- Copy formatted citation
- Style information display

---

### StyleBuilder

Visual builder for custom citation styles.

**File:** `components/citation/StyleBuilder.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `modelValue` | CitationStyle | No | Existing style to edit |

**Events:**
- `update:modelValue` - Style updated
- `save` - Style saved

**Features:**
- Field ordering and formatting
- Delimiter configuration
- Bibliography vs in-text settings
- Live preview
- CSL XML generation

---

## Companion Components

### ResearchCompanion

Main Research Companion chat interface.

**File:** `components/companion/ResearchCompanion.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | string | Yes | Project context |
| `conversationId` | string | No | Continue existing conversation |

**Features:**
- Chat message display with Markdown
- Citation highlighting with source links
- Confidence indicators
- Follow-up question suggestions
- Conversation mode selection
- Persona information display

**Conversation Modes:**
- `general` - Open-ended research assistance
- `synthesize` - Synthesize themes across sources
- `fact-check` - Verify claims against sources
- `brainstorm` - Generate research ideas
- `gaps` - Identify research gaps

**Usage:**
```vue
<ResearchCompanion :project-id="project.id" />
```

---

## Mind Map Components

### MindMapViewer

Interactive D3.js mind map visualization.

**File:** `components/mindmap/MindMapViewer.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | string | Yes | Project to visualize |
| `layout` | 'force' \| 'hierarchy' | No | Graph layout (default: force) |
| `showAuthors` | boolean | No | Include author nodes |
| `showTags` | boolean | No | Include tag nodes |
| `showSimilar` | boolean | No | Show similarity edges |

**Events:**
- `node-click` - Node clicked (emits node data)
- `node-dblclick` - Node double-clicked

**Features:**
- Force-directed layout with drag interaction
- Hierarchical layout option
- Zoom and pan
- Node coloring by type
- Edge coloring by relationship
- SVG export for copy/paste
- Legend display

**Usage:**
```vue
<MindMapViewer
  :project-id="project.id"
  layout="force"
  show-authors
  show-tags
  @node-click="handleNodeClick"
/>
```

---

## Veritas Components

### VeritasScoreBadge

Compact credibility score display.

**File:** `components/veritas/VeritasScoreBadge.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `score` | number | Yes | Overall score (0-100) |
| `label` | string | Yes | Score label (High/Medium/Low) |
| `size` | 'sm' \| 'md' \| 'lg' | No | Badge size |

**Usage:**
```vue
<VeritasScoreBadge
  :score="entry.veritasScore.overall"
  :label="entry.veritasScore.label"
  size="md"
/>
```

---

### VeritasScoreDetail

Detailed credibility score breakdown.

**File:** `components/veritas/VeritasScoreDetail.vue`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `entryId` | string | Yes | Entry to show score for |
| `showRefresh` | boolean | No | Show refresh button |

**Features:**
- Overall score with visual gauge
- Factor breakdown with progress bars
- Evidence links for each factor
- Confidence indicator
- Score history
- Refresh capability
- Manual override option

**Usage:**
```vue
<VeritasScoreDetail
  :entry-id="entry.id"
  show-refresh
/>
```

---

## Composables

### useAuth

Authentication state and actions.

**File:** `composables/useAuth.ts`

```typescript
const { 
  user,           // Current user (Ref)
  isAuthenticated, // Boolean (Ref)
  isLoading,      // Loading state (Ref)
  login,          // (email, password) => Promise
  register,       // (email, password, name) => Promise
  logout,         // () => Promise
  refresh         // () => Promise
} = useAuth()
```

---

### useSubscription

Subscription status and feature gating.

**File:** `composables/useSubscription.ts`

```typescript
const {
  tier,           // Current tier (Ref)
  status,         // Subscription status (Ref)
  limits,         // Usage limits (Ref)
  hasFeature,     // (feature: string) => boolean
  canUse,         // (resource: string) => boolean
  openCheckout,   // (tier, interval) => Promise
  openPortal      // () => Promise
} = useSubscription()
```

**Feature Check:**
```typescript
if (!hasFeature('pdfExport')) {
  showUpgradePrompt.value = true
  return
}
```

---

### useVoiceInput

Web Speech API and Whisper integration.

**File:** `composables/useVoiceInput.ts`

```typescript
const {
  isRecording,    // Currently recording (Ref)
  transcript,     // Current transcript (Ref)
  error,          // Error message (Ref)
  isSupported,    // Browser supports Web Speech (boolean)
  startRecording, // () => void
  stopRecording,  // () => Promise<string>
  transcribeAudio // (File) => Promise<string>
} = useVoiceInput()
```

---

### useMindMap

D3.js visualization logic.

**File:** `composables/useMindMap.ts`

```typescript
const {
  svgRef,         // Template ref for SVG element
  isLoading,      // Data loading (Ref)
  error,          // Error state (Ref)
  nodes,          // Current nodes (Ref)
  edges,          // Current edges (Ref)
  selectedNode,   // Currently selected node (Ref)
  layout,         // Current layout (Ref)
  setLayout,      // (layout) => void
  refresh,        // () => Promise
  exportSvg,      // () => string
  zoomIn,         // () => void
  zoomOut,        // () => void
  resetZoom       // () => void
} = useMindMap(projectId)
```

---

## Component Patterns

### Loading States

All data-fetching components use consistent loading patterns:

```vue
<template>
  <div v-if="pending" class="flex justify-center p-8">
    <UProgress animation="carousel" />
  </div>
  <div v-else-if="error" class="text-red-500 p-4">
    {{ error.message }}
  </div>
  <div v-else>
    <!-- Content -->
  </div>
</template>
```

### Form Validation

Use Zod schemas with Nuxt UI form components:

```vue
<script setup>
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  type: z.enum(['book', 'article', ...])
})

const state = reactive({ title: '', type: 'book' })
</script>

<template>
  <UForm :schema="schema" :state="state" @submit="onSubmit">
    <UFormGroup name="title" label="Title">
      <UInput v-model="state.title" />
    </UFormGroup>
  </UForm>
</template>
```

### Modal Pattern

Modals use `v-model` for visibility control:

```vue
<script setup>
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <UModal v-model="isOpen">
    <!-- Content -->
  </UModal>
</template>
```

### Tier Gating Pattern

Check subscription tier before showing features:

```vue
<script setup>
const { hasFeature } = useSubscription()
</script>

<template>
  <div v-if="hasFeature('veritasScore')">
    <VeritasScoreDetail :entry-id="entry.id" />
  </div>
  <UpgradePrompt
    v-else
    feature="Veritas Score"
    required-tier="pro"
  />
</template>
```
