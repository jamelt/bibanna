import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import * as schema from '~/server/database/schema'

const testDbUrl =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/annobib_test'

let db: ReturnType<typeof drizzle>
let client: postgres.Sql
let testUserId: string

beforeAll(async () => {
  client = postgres(testDbUrl, { max: 1 })
  db = drizzle(client, { schema })

  const [user] = await db
    .insert(schema.users)
    .values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      auth0Id: `test-${Date.now()}`,
    })
    .returning()
  testUserId = user.id
})

afterAll(async () => {
  if (testUserId) {
    await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
    await db.delete(schema.users).where(eq(schema.users.id, testUserId))
  }
  await client.end()
})

beforeEach(async () => {
  await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
})

describe('Entries API Integration', () => {
  it('creates a new entry', async () => {
    const [entry] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'Test Book',
        authors: [{ firstName: 'John', lastName: 'Doe' }],
        year: 2024,
      })
      .returning()

    expect(entry.id).toBeDefined()
    expect(entry.title).toBe('Test Book')
    expect(entry.entryType).toBe('book')
    expect(entry.year).toBe(2024)
  })

  it('retrieves entries by user', async () => {
    await db.insert(schema.entries).values([
      { userId: testUserId, entryType: 'book', title: 'Book 1', authors: [], year: 2024 },
      {
        userId: testUserId,
        entryType: 'journal_article',
        title: 'Article 1',
        authors: [],
        year: 2023,
      },
    ])

    const entries = await db.query.entries.findMany({
      where: eq(schema.entries.userId, testUserId),
    })

    expect(entries).toHaveLength(2)
  })

  it('updates an entry', async () => {
    const [entry] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'Original Title',
        authors: [],
        year: 2024,
      })
      .returning()

    await db
      .update(schema.entries)
      .set({ title: 'Updated Title' })
      .where(eq(schema.entries.id, entry.id))

    const updated = await db.query.entries.findFirst({
      where: eq(schema.entries.id, entry.id),
    })

    expect(updated?.title).toBe('Updated Title')
  })

  it('deletes an entry', async () => {
    const [entry] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'To Delete',
        authors: [],
        year: 2024,
      })
      .returning()

    await db.delete(schema.entries).where(eq(schema.entries.id, entry.id))

    const deleted = await db.query.entries.findFirst({
      where: eq(schema.entries.id, entry.id),
    })

    expect(deleted).toBeUndefined()
  })

  it('filters entries by type', async () => {
    await db.insert(schema.entries).values([
      { userId: testUserId, entryType: 'book', title: 'Book', authors: [], year: 2024 },
      {
        userId: testUserId,
        entryType: 'journal_article',
        title: 'Article',
        authors: [],
        year: 2024,
      },
      { userId: testUserId, entryType: 'book', title: 'Another Book', authors: [], year: 2024 },
    ])

    const books = await db.query.entries.findMany({
      where: (entries, { eq, and }) =>
        and(eq(entries.userId, testUserId), eq(entries.entryType, 'book')),
    })

    expect(books).toHaveLength(2)
    expect(books.every((e) => e.entryType === 'book')).toBe(true)
  })

  it('stores and retrieves metadata', async () => {
    const metadata = {
      doi: '10.1234/test',
      isbn: '978-0-12-345678-9',
      publisher: 'Test Publisher',
    }

    const [entry] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'With Metadata',
        authors: [],
        year: 2024,
        metadata,
      })
      .returning()

    const retrieved = await db.query.entries.findFirst({
      where: eq(schema.entries.id, entry.id),
    })

    expect(retrieved?.metadata).toEqual(metadata)
  })

  it('handles favorite entries', async () => {
    const [entry] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'Favorite',
        authors: [],
        year: 2024,
        isFavorite: true,
      })
      .returning()

    const favorites = await db.query.entries.findMany({
      where: (entries, { eq, and }) =>
        and(eq(entries.userId, testUserId), eq(entries.isFavorite, true)),
    })

    expect(favorites).toHaveLength(1)
    expect(favorites[0].id).toBe(entry.id)
  })
})
