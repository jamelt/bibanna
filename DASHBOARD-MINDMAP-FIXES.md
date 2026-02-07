# Dashboard and Mind Map Fixes

**Date:** February 7, 2026

## Issues Fixed

### Issue #1A: Dashboard Not Loading Recent Entries and Projects ✅

**Problem:** The dashboard page was showing empty state for recent entries and recent projects, even when data existed in the database.

**Root Cause:** The `recentEntries` and `recentProjects` variables were initialized as empty arrays but never populated with actual data from the API.

**Solution:** Updated `/pages/app/index.vue` to:
- Fetch recent entries using `/api/entries` endpoint (5 most recent, sorted by createdAt desc)
- Fetch all projects using `/api/projects` endpoint (already sorted by updatedAt desc)
- Fetch tags using `/api/tags` endpoint
- Calculate dashboard stats dynamically from fetched data:
  - Total Entries: from entries API pagination total
  - Projects: count of projects returned
  - Annotations: sum of annotation counts from entries
  - Tags: count of tags returned

**Files Changed:**
- `pages/app/index.vue`

---

### Issue #1B: Authors Displaying as Raw JSON ✅

**Problem:** Recent entries on the dashboard were showing authors as raw JSON arrays instead of formatted names (e.g., `[ { "firstName": "L. H.", "lastName": "Lumey" }, ... ]`).

**Root Cause:** The template was directly outputting `{{ entry.authors }}` which displays the raw array object.

**Solution:** 
- Added a `formatAuthors()` helper function that formats author objects into citation style (e.g., "Lumey, L. H.; Stein, Aryeh D.; Susser, Ezra")
- Updated template to use `formatAuthors(entry.authors)` instead of raw output
- Added truncate class and improved formatting for year display

**Files Changed:**
- `pages/app/index.vue`

---

### Issue #1C: Project Entry Count Showing 0 ✅

**Problem:** Recent projects on dashboard were showing "0 entries" even when entries were associated with the project.

**Root Cause:** The SQL subquery in the projects API might have had issues with type coercion or query execution in Drizzle ORM.

**Solution:** Rewrote the projects API query to use:
- LEFT JOIN instead of a subquery for better reliability
- Explicit GROUP BY for all selected columns
- CAST to ensure proper integer conversion
- Fallback to 0 if count is null

**Files Changed:**
- `server/api/projects/index.get.ts`

---

### Issue #2: Mind Map Using UUID in Links ✅

**Problem:** When clicking on an entry node in the mind map, the link showed the UUID in the URL.

**Root Cause:** Library entries only have UUIDs as identifiers, not slugs (unlike projects which have optional slugs).

**Solution:** Updated `/components/mindmap/MindMapViewer.vue` to:
- Use `selectedNode.slug || selectedNode.id` pattern for entry links
- This is future-proof: if slugs are ever added to entries, the code will automatically use them
- Currently, entries don't have slugs, so UUIDs will continue to be used (which is expected behavior)

**Files Changed:**
- `components/mindmap/MindMapViewer.vue`

**Note:** This is cosmetic only. Since entries don't have slugs in the database schema, URLs will still show UUIDs. This is by design - entries don't have slugs for good reasons (collision risk, title instability, etc.).

---

## Issue #3: Short IDs for Library Entries ⏸️ DEFERRED

**Decision:** Continue using UUIDs for library entries. Adding slugs or short IDs would be a wide-sweeping architectural change requiring:
- New database field (slug or shortId)
- Migration for existing entries
- Updates to all API routes to support slug/shortId lookup
- Updates to all frontend links
- Unique index to prevent collisions

**Rationale:**
- Hundreds of citations on similar topics would cause slug collisions
- Entry titles are often long, complex, and can change
- Users rarely type entry URLs manually
- Academic citation managers typically use IDs, not slugs
- Projects already have optional slugs for user-friendly URLs (which makes sense since they're user-created and fewer in number)

---

## Testing Recommendations

1. **Dashboard:**
   - Verify recent entries appear (up to 5)
   - Verify recent projects appear (up to 5)
   - Verify stats show correct counts
   - Test with empty state (new user)
   - Test with data present

2. **Mind Map:**
   - Click on entry nodes and verify navigation works
   - Verify URL contains entry UUID
   - Verify "View full entry →" link works correctly

---

## Technical Details

### API Endpoints Used
- `GET /api/entries?page=1&pageSize=5&sortBy=createdAt&sortOrder=desc` - Recent entries
- `GET /api/projects` - All projects (sorted by updatedAt desc)
- `GET /api/tags` - All tags

### Data Flow
1. Dashboard page uses `useFetch` to load data on mount
2. Computed properties (`stats`, `recentEntries`, `recentProjects`) reactively update when data loads
3. UI automatically shows data when available, empty state when not

### Mind Map Graph Data
- Graph API returns nodes with `id` (UUID) and `label` (title)
- `slug` property is not included in GraphNode interface
- Entry nodes use entry.id as the node identifier
