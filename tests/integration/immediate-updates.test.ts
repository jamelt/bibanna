import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, desc, sql } from 'drizzle-orm'
import * as schema from '~/server/database/schema'

const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bibanna'

let db: ReturnType<typeof drizzle>
let client: postgres.Sql
let testUserId: string

beforeAll(async () => {
  client = postgres(testDbUrl, { max: 1, connect_timeout: 2 })
  db = drizzle(client, { schema })
  
  const [user] = await db.insert(schema.users).values({
    email: `immediate-test-${Date.now()}@example.com`,
    name: 'Immediate Update Test User',
    auth0Id: `immediate-test-${Date.now()}`,
  }).returning()
  testUserId = user.id
})

afterAll(async () => {
  if (testUserId) {
    await db.delete(schema.entryTags).where(
      eq(schema.entryTags.entryId,
        db.select({ id: schema.entries.id })
          .from(schema.entries)
          .where(eq(schema.entries.userId, testUserId))
      )
    )
    await db.delete(schema.entryProjects).where(
      eq(schema.entryProjects.projectId,
        db.select({ id: schema.projects.id })
          .from(schema.projects)
          .where(eq(schema.projects.userId, testUserId))
      )
    )
    await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
    await db.delete(schema.projects).where(eq(schema.projects.userId, testUserId))
    await db.delete(schema.tags).where(eq(schema.tags.userId, testUserId))
    await db.delete(schema.users).where(eq(schema.users.id, testUserId))
  }
  await client.end()
})

beforeEach(async () => {
  await db.delete(schema.entryTags)
  await db.delete(schema.entryProjects)
  await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
  await db.delete(schema.projects).where(eq(schema.projects.userId, testUserId))
  await db.delete(schema.tags).where(eq(schema.tags.userId, testUserId))
})

describe('Projects List Updates', () => {
  it('newly created project appears in list query', async () => {
    const initialProjects = await db.query.projects.findMany({
      where: eq(schema.projects.userId, testUserId),
    })
    expect(initialProjects).toHaveLength(0)

    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'New Project',
      slug: 'new-project',
    }).returning()

    const updatedProjects = await db.query.projects.findMany({
      where: eq(schema.projects.userId, testUserId),
    })

    expect(updatedProjects).toHaveLength(1)
    expect(updatedProjects[0].id).toBe(project.id)
    expect(updatedProjects[0].name).toBe('New Project')
  })

  it('projects are ordered by creation date desc', async () => {
    await db.insert(schema.projects).values([
      { userId: testUserId, name: 'First Project', slug: 'first-project' },
      { userId: testUserId, name: 'Second Project', slug: 'second-project' },
      { userId: testUserId, name: 'Third Project', slug: 'third-project' },
    ])

    const projects = await db.query.projects.findMany({
      where: eq(schema.projects.userId, testUserId),
      orderBy: [desc(schema.projects.createdAt)],
    })

    expect(projects).toHaveLength(3)
    expect(projects[0].name).toBe('Third Project')
    expect(projects[1].name).toBe('Second Project')
    expect(projects[2].name).toBe('First Project')
  })

  it('project with entries shows correct count', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Project with Entries',
      slug: 'project-with-entries',
    }).returning()

    const [entry1, entry2] = await db.insert(schema.entries).values([
      { userId: testUserId, entryType: 'book', title: 'Entry 1', authors: [], year: 2024 },
      { userId: testUserId, entryType: 'book', title: 'Entry 2', authors: [], year: 2024 },
    ]).returning()

    await db.insert(schema.entryProjects).values([
      { entryId: entry1.id, projectId: project.id },
      { entryId: entry2.id, projectId: project.id },
    ])

    const entryCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.entryProjects)
      .where(eq(schema.entryProjects.projectId, project.id))

    expect(Number(entryCount[0].count)).toBe(2)

    const projectWithCount = await db.query.projects.findFirst({
      where: eq(schema.projects.id, project.id),
    })

    expect(projectWithCount).toBeDefined()
  })

  it('archived projects are filtered correctly', async () => {
    await db.insert(schema.projects).values([
      { userId: testUserId, name: 'Active Project', slug: 'active', isArchived: false },
      { userId: testUserId, name: 'Archived Project', slug: 'archived', isArchived: true },
    ])

    const activeProjects = await db.query.projects.findMany({
      where: eq(schema.projects.userId, testUserId),
    })

    const archivedCount = activeProjects.filter(p => p.isArchived).length
    const activeCount = activeProjects.filter(p => !p.isArchived).length

    expect(archivedCount).toBe(1)
    expect(activeCount).toBe(1)
  })
})

describe('Entries List Updates', () => {
  it('newly created entry appears in list query', async () => {
    const initialEntries = await db.query.entries.findMany({
      where: eq(schema.entries.userId, testUserId),
    })
    expect(initialEntries).toHaveLength(0)

    const [entry] = await db.insert(schema.entries).values({
      userId: testUserId,
      entryType: 'book',
      title: 'Test Entry',
      authors: [{ firstName: 'John', lastName: 'Doe' }],
      year: 2024,
    }).returning()

    const updatedEntries = await db.query.entries.findMany({
      where: eq(schema.entries.userId, testUserId),
    })

    expect(updatedEntries).toHaveLength(1)
    expect(updatedEntries[0].id).toBe(entry.id)
    expect(updatedEntries[0].title).toBe('Test Entry')
  })

  it('entries are ordered by creation date desc by default', async () => {
    await db.insert(schema.entries).values([
      { userId: testUserId, entryType: 'book', title: 'First Entry', authors: [], year: 2024 },
      { userId: testUserId, entryType: 'book', title: 'Second Entry', authors: [], year: 2024 },
      { userId: testUserId, entryType: 'book', title: 'Third Entry', authors: [], year: 2024 },
    ])

    const entries = await db.query.entries.findMany({
      where: eq(schema.entries.userId, testUserId),
      orderBy: [desc(schema.entries.createdAt)],
    })

    expect(entries).toHaveLength(3)
    expect(entries[0].title).toBe('Third Entry')
    expect(entries[1].title).toBe('Second Entry')
    expect(entries[2].title).toBe('First Entry')
  })

  it('entry with tags shows in list with associations', async () => {
    const [tag] = await db.insert(schema.tags).values({
      userId: testUserId,
      name: 'Important',
      color: '#FF0000',
    }).returning()

    const [entry] = await db.insert(schema.entries).values({
      userId: testUserId,
      entryType: 'article',
      title: 'Tagged Entry',
      authors: [],
      year: 2024,
    }).returning()

    await db.insert(schema.entryTags).values({
      entryId: entry.id,
      tagId: tag.id,
    })

    const entryWithTags = await db.query.entries.findFirst({
      where: eq(schema.entries.id, entry.id),
      with: {
        entryTags: {
          with: {
            tag: true,
          },
        },
      },
    })

    expect(entryWithTags?.entryTags).toHaveLength(1)
    expect(entryWithTags?.entryTags[0].tag.name).toBe('Important')
  })

  it('entry in project shows in both lists', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Test Project',
      slug: 'test-project',
    }).returning()

    const [entry] = await db.insert(schema.entries).values({
      userId: testUserId,
      entryType: 'book',
      title: 'Shared Entry',
      authors: [],
      year: 2024,
    }).returning()

    await db.insert(schema.entryProjects).values({
      entryId: entry.id,
      projectId: project.id,
    })

    const libraryEntry = await db.query.entries.findFirst({
      where: eq(schema.entries.id, entry.id),
    })

    const projectEntry = await db.query.entryProjects.findFirst({
      where: eq(schema.entryProjects.entryId, entry.id),
    })

    expect(libraryEntry).toBeDefined()
    expect(projectEntry).toBeDefined()
    expect(projectEntry?.projectId).toBe(project.id)
  })

  it('multiple entries added in sequence appear in correct order', async () => {
    const entries = []
    for (let i = 1; i <= 5; i++) {
      const [entry] = await db.insert(schema.entries).values({
        userId: testUserId,
        entryType: 'article',
        title: `Sequential Entry ${i}`,
        authors: [],
        year: 2024,
      }).returning()
      entries.push(entry)
      
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    const queriedEntries = await db.query.entries.findMany({
      where: eq(schema.entries.userId, testUserId),
      orderBy: [desc(schema.entries.createdAt)],
    })

    expect(queriedEntries).toHaveLength(5)
    
    for (let i = 0; i < 5; i++) {
      expect(queriedEntries[i].title).toBe(`Sequential Entry ${5 - i}`)
    }
  })
})

describe('Pagination and Counts', () => {
  it('total count updates immediately after insert', async () => {
    const [initialCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.entries)
      .where(eq(schema.entries.userId, testUserId))

    expect(Number(initialCount.count)).toBe(0)

    await db.insert(schema.entries).values({
      userId: testUserId,
      entryType: 'book',
      title: 'Count Test',
      authors: [],
      year: 2024,
    })

    const [updatedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.entries)
      .where(eq(schema.entries.userId, testUserId))

    expect(Number(updatedCount.count)).toBe(1)
  })

  it('pagination reflects new items correctly', async () => {
    for (let i = 1; i <= 25; i++) {
      await db.insert(schema.entries).values({
        userId: testUserId,
        entryType: 'article',
        title: `Entry ${i}`,
        authors: [],
        year: 2024,
      })
    }

    const page1 = await db.query.entries.findMany({
      where: eq(schema.entries.userId, testUserId),
      orderBy: [desc(schema.entries.createdAt)],
      limit: 20,
      offset: 0,
    })

    const page2 = await db.query.entries.findMany({
      where: eq(schema.entries.userId, testUserId),
      orderBy: [desc(schema.entries.createdAt)],
      limit: 20,
      offset: 20,
    })

    expect(page1).toHaveLength(20)
    expect(page2).toHaveLength(5)
    expect(page1[0].title).toBe('Entry 25')
    expect(page2[4].title).toBe('Entry 1')
  })
})
