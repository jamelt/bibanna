# Testing Guide for Project Slug Bug Fix

This document explains how to test the bug fix for the "Project not found" issue.

## Overview

The bug was caused by PostgreSQL attempting to cast slug strings (like `"my-project"`) to UUID type when querying the projects table. This has been fixed by:

1. Creating a helper function that detects UUID vs slug
2. Only querying UUID column when parameter is actually a UUID
3. Always using resolved `project.id` for subsequent operations

## Test Levels

### 1. End-to-End Tests (Playwright) ✅

**Location:** `tests/e2e/projects.spec.ts`

**Status:** 3/4 passing

**Run command:**
```bash
pnpm test:e2e tests/e2e/projects.spec.ts --project=chromium
```

**What they test:**
- ✅ Creating a project and opening it immediately
- ✅ Accessing projects via slug URLs after page reload
- ✅ All API operations (GET, PUT) work with slugs
- ⚠️ Dashboard creation (has unrelated auth issue)

**Best for:** Testing the complete user flow from UI to database

### 2. Integration Tests (Vitest)

**Location:** `tests/integration/projects-slug.test.ts`

**Setup required:**
```bash
# Ensure your dev database is running
pnpm db:setup

# Or set a test database URL
export DATABASE_URL="postgres://your-connection-string"
```

**Run command:**
```bash
pnpm vitest run tests/integration/projects-slug.test.ts
```

**What they test:**
- Fetching projects by UUID using helper
- Fetching projects by slug using helper
- Handling invalid UUID formats
- User ownership verification
- Entry associations with slugs
- Various slug formats (hyphenated, numeric)
- Unique slug constraints

**Best for:** Testing the `buildProjectWhere` helper function in isolation

### 3. Manual Testing

The quickest way to verify the fix:

1. **Start your dev server:**
   ```bash
   pnpm dev
   ```

2. **Create a project:**
   - Navigate to `/app/projects`
   - Click "New Project"
   - Enter a name (e.g., "My Research Project")
   - Click "Create Project"

3. **Open the project:**
   - Click on the project card you just created
   - ✅ **Expected:** Project page loads with the project name in the header
   - ❌ **Bug (before fix):** "Project not found" error

4. **Check the URL:**
   - Should show something like: `/app/projects/my-research-project`
   - This is the slug, not the UUID

5. **Test operations:**
   - Update project name/description ✅
   - Add/remove entries ✅
   - Reload the page ✅

## Test Coverage

The fix has been applied to:

### API Endpoints (6 files)
- ✅ `server/api/projects/[id].get.ts` - Get project
- ✅ `server/api/projects/[id].put.ts` - Update project
- ✅ `server/api/projects/[id].delete.ts` - Delete project
- ✅ `server/api/projects/[id]/graph.get.ts` - Get project graph
- ✅ `server/api/projects/[id]/entries/index.post.ts` - Add entry
- ✅ `server/api/projects/[id]/entries/[entryId].delete.ts` - Remove entry

### Service Functions (1 file)
- ✅ `server/services/sharing/index.ts` - All sharing functions

### Helper Function (1 new file)
- ✅ `server/utils/project-query.ts` - UUID detection and query builder

## Quick Validation Checklist

Before merging, verify:

- [ ] E2E tests pass (3/4 minimum)
- [ ] Can create a project via UI
- [ ] Can immediately open the project after creation
- [ ] Project URL shows slug (not UUID)
- [ ] Can reload project page without errors
- [ ] Can update project details
- [ ] Can add entries to project
- [ ] Can remove entries from project
- [ ] Integration tests structure is correct (may need DB setup to run)

## Continuous Testing

To run tests automatically during development:

```bash
# E2E tests with UI (interactive)
pnpm test:e2e:ui

# E2E tests in CI mode
pnpm test:e2e

# Unit/Integration tests in watch mode
pnpm test

# All tests with coverage
pnpm test:coverage
```

## Known Issues

1. **One E2E test failing:** The "creates project from dashboard" test has an unrelated authentication issue in the signup flow. This doesn't affect the bug fix.

2. **Integration tests require database:** The integration tests need a running PostgreSQL database with proper credentials. Set `DATABASE_URL` environment variable before running.

## Success Criteria

✅ The bug is fixed when:
1. Users can create a project and immediately open it
2. Projects are accessible via both UUID and slug URLs
3. All CRUD operations work with slugs
4. No "invalid input syntax for type uuid" errors
5. E2E tests confirm the full user flow works
6. Code uses the new helper function consistently

## Documentation

- **Technical Details:** See `BUGFIX-PROJECT-SLUG.md`
- **Integration Test Setup:** See `tests/integration/README.md`
- **E2E Test Output:** Check `playwright-report/` after running tests
