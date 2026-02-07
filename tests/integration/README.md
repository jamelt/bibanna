# Integration Tests

Integration tests verify that different parts of the system work together correctly, including database operations and API logic.

## Requirements

These tests require a running PostgreSQL database. The tests will use:
1. `TEST_DATABASE_URL` environment variable if set
2. Otherwise, falls back to `DATABASE_URL` 
3. Or uses the default development database connection

## Running Integration Tests

### Using Development Database

The easiest way to run integration tests is to use your existing development database:

```bash
# Make sure your dev database is running
pnpm db:setup  # if not already set up

# Run all integration tests
pnpm test tests/integration/

# Run a specific test file
pnpm test tests/integration/projects-slug.test.ts
```

### Using a Separate Test Database (Recommended for CI)

For isolated testing, you can set up a separate test database:

```bash
# Set the test database URL
export TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/bibanna_test"

# Run tests
pnpm test tests/integration/
```

## What These Tests Cover

### `projects-slug.test.ts`

Tests the `buildProjectWhere` helper function that allows projects to be queried by either:
- UUID (e.g., `abc-123-def-456`)
- Slug (e.g., `my-research-project`)

This ensures the bug fix for "Project not found" is working correctly at the database query level.

**Tests:**
- Fetching projects by UUID
- Fetching projects by slug
- Handling invalid UUID formats
- User ownership verification
- Entry associations
- Various slug formats (hyphenated, numeric)
- Unique slug constraints

### `projects.test.ts`

Tests general project database operations:
- Project creation
- Entry associations
- Project retrieval with related data
- Cascading deletes

## Notes

- Integration tests clean up after themselves by deleting test data
- Each test file uses a unique user to avoid conflicts
- Tests use `beforeEach` to ensure a clean state between tests
- Connection timeout is set to 2 seconds to fail fast if database is unavailable
