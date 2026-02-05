import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, and } from 'drizzle-orm'
import * as schema from '~/server/database/schema'

const testDbUrl = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/bibanna_test'

let db: ReturnType<typeof drizzle>
let client: postgres.Sql
let testUserId: string

beforeAll(async () => {
  client = postgres(testDbUrl, { max: 1 })
  db = drizzle(client, { schema })
  
  const [user] = await db.insert(schema.users).values({
    email: `project-test-${Date.now()}@example.com`,
    name: 'Project Test User',
    auth0Id: `project-test-${Date.now()}`,
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
    await db.delete(schema.projects).where(eq(schema.projects.userId, testUserId))
    await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
    await db.delete(schema.users).where(eq(schema.users.id, testUserId))
  }
  await client.end()
})

beforeEach(async () => {
  await db.delete(schema.entryProjects)
  await db.delete(schema.projects).where(eq(schema.projects.userId, testUserId))
  await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
})

describe('Projects API Integration', () => {
  it('creates a new project', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Test Project',
      description: 'A test project',
      color: '#4F46E5',
    }).returning()

    expect(project.id).toBeDefined()
    expect(project.name).toBe('Test Project')
    expect(project.color).toBe('#4F46E5')
  })

  it('associates entries with projects', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Project with Entries',
    }).returning()

    const [entry1, entry2] = await db.insert(schema.entries).values([
      { userId: testUserId, entryType: 'book', title: 'Entry 1', authors: [], year: 2024 },
      { userId: testUserId, entryType: 'book', title: 'Entry 2', authors: [], year: 2024 },
    ]).returning()

    await db.insert(schema.entryProjects).values([
      { entryId: entry1.id, projectId: project.id },
      { entryId: entry2.id, projectId: project.id },
    ])

    const projectEntries = await db.query.entryProjects.findMany({
      where: eq(schema.entryProjects.projectId, project.id),
    })

    expect(projectEntries).toHaveLength(2)
  })

  it('retrieves project with entries', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Full Project',
    }).returning()

    const [entry] = await db.insert(schema.entries).values({
      userId: testUserId,
      entryType: 'book',
      title: 'Project Entry',
      authors: [],
      year: 2024,
    }).returning()

    await db.insert(schema.entryProjects).values({
      entryId: entry.id,
      projectId: project.id,
    })

    const projectWithEntries = await db.query.projects.findFirst({
      where: eq(schema.projects.id, project.id),
      with: {
        entryProjects: {
          with: {
            entry: true,
          },
        },
      },
    })

    expect(projectWithEntries?.entryProjects).toHaveLength(1)
    expect(projectWithEntries?.entryProjects[0].entry.title).toBe('Project Entry')
  })

  it('removes entry from project', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Removal Test',
    }).returning()

    const [entry] = await db.insert(schema.entries).values({
      userId: testUserId,
      entryType: 'book',
      title: 'To Remove',
      authors: [],
      year: 2024,
    }).returning()

    await db.insert(schema.entryProjects).values({
      entryId: entry.id,
      projectId: project.id,
    })

    await db.delete(schema.entryProjects).where(
      and(
        eq(schema.entryProjects.entryId, entry.id),
        eq(schema.entryProjects.projectId, project.id),
      ),
    )

    const remaining = await db.query.entryProjects.findMany({
      where: eq(schema.entryProjects.projectId, project.id),
    })

    expect(remaining).toHaveLength(0)
  })

  it('cascades delete to entry associations', async () => {
    const [project] = await db.insert(schema.projects).values({
      userId: testUserId,
      name: 'Cascade Test',
    }).returning()

    const [entry] = await db.insert(schema.entries).values({
      userId: testUserId,
      entryType: 'book',
      title: 'Cascade Entry',
      authors: [],
      year: 2024,
    }).returning()

    await db.insert(schema.entryProjects).values({
      entryId: entry.id,
      projectId: project.id,
    })

    await db.delete(schema.projects).where(eq(schema.projects.id, project.id))

    const associations = await db.query.entryProjects.findMany({
      where: eq(schema.entryProjects.projectId, project.id),
    })

    expect(associations).toHaveLength(0)
  })
})
