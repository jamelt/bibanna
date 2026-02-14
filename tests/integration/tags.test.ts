import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, sql, asc } from 'drizzle-orm'
import * as schema from '~/server/database/schema'

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/annobib'

let db: ReturnType<typeof drizzle>
let client: postgres.Sql
let testUserId: string

function tagsWithEntryCount(userId: string) {
  return db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      color: schema.tags.color,
      description: schema.tags.description,
      createdAt: schema.tags.createdAt,
      entryCount:
        sql<number>`(SELECT count(*) FROM entry_tags WHERE entry_tags.tag_id = "tags"."id")`.as(
          'entry_count',
        ),
    })
    .from(schema.tags)
    .where(eq(schema.tags.userId, userId))
    .orderBy(asc(schema.tags.name))
    .then((rows) => rows.map((t) => ({ ...t, entryCount: Number(t.entryCount) })))
}

beforeAll(async () => {
  client = postgres(testDbUrl, { max: 1, connect_timeout: 2 })
  db = drizzle(client, { schema })

  const [user] = await db
    .insert(schema.users)
    .values({
      email: `test-tags-${Date.now()}@example.com`,
      name: 'Tag Test User',
      auth0Id: `test-tags-${Date.now()}`,
    })
    .returning()
  testUserId = user.id
})

afterAll(async () => {
  if (testUserId) {
    await db
      .delete(schema.entryTags)
      .where(
        sql`${schema.entryTags.entryId} IN (SELECT id FROM entries WHERE user_id = ${testUserId})`,
      )
    await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
    await db.delete(schema.tags).where(eq(schema.tags.userId, testUserId))
    await db.delete(schema.users).where(eq(schema.users.id, testUserId))
  }
  await client.end()
})

beforeEach(async () => {
  await db
    .delete(schema.entryTags)
    .where(
      sql`${schema.entryTags.entryId} IN (SELECT id FROM entries WHERE user_id = ${testUserId})`,
    )
  await db.delete(schema.entries).where(eq(schema.entries.userId, testUserId))
  await db.delete(schema.tags).where(eq(schema.tags.userId, testUserId))
})

describe('Tags entry count query', () => {
  it('returns zero entry count for tags with no entries', async () => {
    await db.insert(schema.tags).values({
      userId: testUserId,
      name: 'Empty Tag',
      color: '#4F46E5',
    })

    const tags = await tagsWithEntryCount(testUserId)

    expect(tags).toHaveLength(1)
    expect(tags[0].name).toBe('Empty Tag')
    expect(tags[0].entryCount).toBe(0)
  })

  it('returns accurate entry count for tags with associated entries', async () => {
    const [tag1] = await db
      .insert(schema.tags)
      .values({
        userId: testUserId,
        name: 'Alpha',
        color: '#4F46E5',
      })
      .returning()

    const [tag2] = await db
      .insert(schema.tags)
      .values({
        userId: testUserId,
        name: 'Beta',
        color: '#EC4899',
      })
      .returning()

    const [entry1] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'Book One',
        authors: [],
        year: 2024,
      })
      .returning()

    const [entry2] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'journal_article',
        title: 'Article One',
        authors: [],
        year: 2023,
      })
      .returning()

    const [entry3] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'Book Two',
        authors: [],
        year: 2025,
      })
      .returning()

    await db.insert(schema.entryTags).values([
      { entryId: entry1.id, tagId: tag1.id },
      { entryId: entry2.id, tagId: tag1.id },
      { entryId: entry3.id, tagId: tag1.id },
      { entryId: entry2.id, tagId: tag2.id },
    ])

    const tags = await tagsWithEntryCount(testUserId)

    expect(tags).toHaveLength(2)

    const alpha = tags.find((t) => t.name === 'Alpha')!
    const beta = tags.find((t) => t.name === 'Beta')!

    expect(alpha.entryCount).toBe(3)
    expect(beta.entryCount).toBe(1)
  })

  it('returns accurate counts for a mix of tags with and without entries', async () => {
    const [tagA] = await db
      .insert(schema.tags)
      .values({
        userId: testUserId,
        name: 'Has Entries',
        color: '#22C55E',
      })
      .returning()

    await db.insert(schema.tags).values({
      userId: testUserId,
      name: 'No Entries',
      color: '#6B7280',
    })

    const [entry] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'Tagged Book',
        authors: [],
        year: 2024,
      })
      .returning()

    await db.insert(schema.entryTags).values({
      entryId: entry.id,
      tagId: tagA.id,
    })

    const tags = await tagsWithEntryCount(testUserId)

    expect(tags).toHaveLength(2)

    const hasEntries = tags.find((t) => t.name === 'Has Entries')!
    const noEntries = tags.find((t) => t.name === 'No Entries')!

    expect(hasEntries.entryCount).toBe(1)
    expect(noEntries.entryCount).toBe(0)
  })

  it('entryCount is a number, not a string or null', async () => {
    const [tag] = await db
      .insert(schema.tags)
      .values({
        userId: testUserId,
        name: 'Type Check',
        color: '#3B82F6',
      })
      .returning()

    const [entry] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'Type Test Book',
        authors: [],
        year: 2024,
      })
      .returning()

    await db.insert(schema.entryTags).values({
      entryId: entry.id,
      tagId: tag.id,
    })

    const tags = await tagsWithEntryCount(testUserId)

    expect(tags).toHaveLength(1)
    expect(tags[0].entryCount).toBe(1)
    expect(typeof tags[0].entryCount).toBe('number')
    expect(Number.isNaN(tags[0].entryCount)).toBe(false)
  })

  it('updates count when an entry-tag association is removed', async () => {
    const [tag] = await db
      .insert(schema.tags)
      .values({
        userId: testUserId,
        name: 'Remove Test',
        color: '#F97316',
      })
      .returning()

    const [entry1] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'Stay',
        authors: [],
        year: 2024,
      })
      .returning()

    const [entry2] = await db
      .insert(schema.entries)
      .values({
        userId: testUserId,
        entryType: 'book',
        title: 'Remove',
        authors: [],
        year: 2024,
      })
      .returning()

    const [assoc1] = await db
      .insert(schema.entryTags)
      .values([
        { entryId: entry1.id, tagId: tag.id },
        { entryId: entry2.id, tagId: tag.id },
      ])
      .returning()

    let tags = await tagsWithEntryCount(testUserId)
    expect(tags[0].entryCount).toBe(2)

    await db.delete(schema.entryTags).where(eq(schema.entryTags.id, assoc1.id))

    tags = await tagsWithEntryCount(testUserId)
    expect(tags[0].entryCount).toBe(1)
  })
})
