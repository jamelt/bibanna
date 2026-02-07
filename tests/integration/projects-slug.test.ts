import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import * as schema from '~/server/database/schema'
import { buildProjectWhere } from '~/server/utils/project-query'

const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bibanna'

let db: ReturnType<typeof drizzle>
let client: postgres.Sql
let testUserId: string

beforeAll(async () => {
  client = postgres(testDbUrl, { max: 1, connect_timeout: 2 })
  db = drizzle(client, { schema })
  
  const [user] = await db.insert(schema.users).values({
    email: `slug-test-${Date.now()}@example.com`,
    name: 'Slug Test User',
    auth0Id: `slug-test-${Date.now()}`,
  }).returning()
  testUserId = user.id
})

afterAll(async () => {
  if (testUserId) {
    await db.delete(schema.entryProjects).where(
      eq(schema.entryProjects.projectId,
        db.select({ id: schema.projects.id })
          .from(schema.projects)
          .where(eq(schema.projects.userId, testUserId))
      )
    )
    await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
    await db.delete(schema.projects).where(eq(schema.projects.userId, testUserId))
    await db.delete(schema.users).where(eq(schema.users.id, testUserId))
  }
  await client.end()
})

beforeEach(async () => {
  await db.delete(schema.entryProjects)
  await db.delete(schema.projects).where(eq(schema.projects.userId, testUserId))
  await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
})

describe('Project Slug and ID Query Helper', () => {
  it('fetches project by UUID using helper', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'UUID Test Project',
      slug: 'uuid-test-project',
    }).returning()

    const found = await db.query.projects.findFirst({
      where: buildProjectWhere(project.id, testUserId),
    })

    expect(found).toBeDefined()
    expect(found?.id).toBe(project.id)
    expect(found?.name).toBe('UUID Test Project')
  })

  it('fetches project by slug using helper', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Slug Test Project',
      slug: 'slug-test-project',
    }).returning()

    const found = await db.query.projects.findFirst({
      where: buildProjectWhere('slug-test-project', testUserId),
    })

    expect(found).toBeDefined()
    expect(found?.id).toBe(project.id)
    expect(found?.name).toBe('Slug Test Project')
  })

  it('handles invalid UUID format as slug-only query', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Invalid UUID Format',
      slug: 'not-a-valid-uuid',
    }).returning()

    const found = await db.query.projects.findFirst({
      where: buildProjectWhere('not-a-valid-uuid', testUserId),
    })

    expect(found).toBeDefined()
    expect(found?.id).toBe(project.id)
  })

  it('respects user ownership in queries', async () => {
    const [otherUser] = await db.insert(schema.users).values({
      email: `other-${Date.now()}@example.com`,
      name: 'Other User',
      auth0Id: `other-${Date.now()}`,
    }).returning()

    const [project] = await db.insert(schema.projects).values({
      userId: otherUser.id,
      name: 'Other User Project',
      slug: 'other-user-project',
    }).returning()

    const notFound = await db.query.projects.findFirst({
      where: buildProjectWhere(project.id, testUserId),
    })

    expect(notFound).toBeUndefined()

    await db.delete(schema.projects).where(eq(schema.projects.id, project.id))
    await db.delete(schema.users).where(eq(schema.users.id, otherUser.id))
  })

  it('works with project entry associations', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Project with Entries',
      slug: 'project-with-entries',
    }).returning()

    const [entry] = await db.insert(schema.entries).values({
      userId: testUserId,
      entryType: 'book',
      title: 'Test Entry',
      authors: [],
      year: 2024,
    }).returning()

    await db.insert(schema.entryProjects).values({
      entryId: entry.id,
      projectId: project.id,
    })

    const foundBySlug = await db.query.projects.findFirst({
      where: buildProjectWhere('project-with-entries', testUserId),
    })

    expect(foundBySlug).toBeDefined()

    const entries = await db.query.entryProjects.findMany({
      where: eq(schema.entryProjects.projectId, foundBySlug!.id),
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].entryId).toBe(entry.id)
  })

  it('handles hyphenated slugs correctly', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'My Research Project',
      slug: 'my-research-project',
    }).returning()

    const found = await db.query.projects.findFirst({
      where: buildProjectWhere('my-research-project', testUserId),
    })

    expect(found).toBeDefined()
    expect(found?.slug).toBe('my-research-project')
  })

  it('handles numeric slugs correctly', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: '2024 Research',
      slug: '2024-research',
    }).returning()

    const found = await db.query.projects.findFirst({
      where: buildProjectWhere('2024-research', testUserId),
    })

    expect(found).toBeDefined()
    expect(found?.slug).toBe('2024-research')
  })

  it('ensures unique slugs for same user', async () => {
    const [project1] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Duplicate Name',
      slug: 'duplicate-name',
    }).returning()

    const [project2] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Duplicate Name',
      slug: 'duplicate-name-2',
    }).returning()

    expect(project1.slug).toBe('duplicate-name')
    expect(project2.slug).toBe('duplicate-name-2')
    expect(project1.id).not.toBe(project2.id)

    const found1 = await db.query.projects.findFirst({
      where: buildProjectWhere('duplicate-name', testUserId),
    })
    const found2 = await db.query.projects.findFirst({
      where: buildProjectWhere('duplicate-name-2', testUserId),
    })

    expect(found1?.id).toBe(project1.id)
    expect(found2?.id).toBe(project2.id)
  })
})
