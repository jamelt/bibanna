import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { project1Config } from './seed-data/project1-sources'
import { project2Config } from './seed-data/project2-sources'
import type { SeedEntry, SeedProjectConfig } from './seed-data/types'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://annobib:annobib@localhost:5432/annobib'
const userEmail = process.argv[2]

async function hashPassword(raw: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(raw)
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function getOrCreateUser(
  db: ReturnType<typeof drizzle>,
  email: string,
  password: string,
  name: string,
): Promise<string> {
  const existing = await db.execute(sql`SELECT id FROM users WHERE email = ${email}`)
  if (existing.length > 0) {
    console.log(`  Found existing user: ${email}`)
    return existing[0].id as string
  }

  const hashed = await hashPassword(password)
  const auth0Id = `local:${email}:${hashed}`
  const created = await db.execute(
    sql`INSERT INTO users (email, name, auth0_id, subscription_tier, role)
        VALUES (${email}, ${name}, ${auth0Id}, 'pro', 'user')
        RETURNING id`,
  )
  console.log(`  Created user: ${email} (password: ${password})`)
  return created[0].id as string
}

async function seedProjectConfig(
  db: ReturnType<typeof drizzle>,
  userId: string,
  config: SeedProjectConfig,
  label: string,
): Promise<{ projectIds: Record<string, string>; tagIds: Record<string, string> }> {
  console.log(`\n--- Seeding: ${label} ---`)

  // Create projects
  const projectIds: Record<string, string> = {}
  for (const p of config.projects) {
    const existing = await db.execute(
      sql`SELECT id FROM projects WHERE user_id = ${userId} AND name = ${p.name}`,
    )
    if (existing.length > 0) {
      projectIds[p.key] = existing[0].id as string
      console.log(`  Project already exists: ${p.name}`)
      continue
    }

    const slug = p.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const created = await db.execute(
      sql`INSERT INTO projects (user_id, name, description, color, is_starred, is_archived, slug, settings)
          VALUES (${userId}, ${p.name}, ${p.description}, ${p.color}, ${p.isStarred ?? false}, ${p.isArchived ?? false}, ${slug}, '{}')
          RETURNING id`,
    )
    projectIds[p.key] = created[0].id as string
    console.log(`  Created project: ${p.name}`)
  }

  // Create tags
  const tagIds: Record<string, string> = {}
  for (const t of config.tags) {
    const existing = await db.execute(
      sql`SELECT id FROM tags WHERE user_id = ${userId} AND name = ${t.name}`,
    )
    if (existing.length > 0) {
      tagIds[t.key] = existing[0].id as string
      console.log(`  Tag already exists: ${t.name}`)
      continue
    }

    const created = await db.execute(
      sql`INSERT INTO tags (user_id, name, color, description)
          VALUES (${userId}, ${t.name}, ${t.color}, ${t.description})
          RETURNING id`,
    )
    tagIds[t.key] = created[0].id as string
    console.log(`  Created tag: ${t.name}`)
  }

  // Create entries
  const mainProjectKey = config.projects[0].key
  let entryCount = 0
  let annotationCount = 0
  let veritasCount = 0

  for (const entry of config.entries) {
    const existingEntry = await db.execute(
      sql`SELECT id FROM entries WHERE user_id = ${userId} AND title = ${entry.title}`,
    )

    let entryId: string
    if (existingEntry.length > 0) {
      entryId = existingEntry[0].id as string
    } else {
      const created = await db.execute(
        sql`INSERT INTO entries (user_id, entry_type, title, authors, year, metadata, custom_fields, notes, is_favorite)
            VALUES (
              ${userId},
              ${entry.entryType},
              ${entry.title},
              ${JSON.stringify(entry.authors)},
              ${entry.year ?? null},
              ${JSON.stringify(entry.metadata)},
              ${JSON.stringify(entry.customFields ?? {})},
              ${entry.notes ?? null},
              ${entry.isFavorite ?? false}
            )
            RETURNING id`,
      )
      entryId = created[0].id as string
      entryCount++
    }

    // Link to main project
    await db.execute(
      sql`INSERT INTO entry_projects (id, entry_id, project_id)
          VALUES (${randomUUID()}, ${entryId}, ${projectIds[mainProjectKey]})
          ON CONFLICT DO NOTHING`,
    )

    // Link to additional projects
    if (entry.extraProjectKeys) {
      for (const pk of entry.extraProjectKeys) {
        if (projectIds[pk]) {
          await db.execute(
            sql`INSERT INTO entry_projects (id, entry_id, project_id)
                VALUES (${randomUUID()}, ${entryId}, ${projectIds[pk]})
                ON CONFLICT DO NOTHING`,
          )
        }
      }
    }

    // Assign tag
    if (tagIds[entry.tagKey]) {
      await db.execute(
        sql`INSERT INTO entry_tags (id, entry_id, tag_id)
            VALUES (${randomUUID()}, ${entryId}, ${tagIds[entry.tagKey]})
            ON CONFLICT DO NOTHING`,
      )
    }

    // Create annotation
    const existingAnnotation = await db.execute(
      sql`SELECT id FROM annotations WHERE entry_id = ${entryId} AND user_id = ${userId} LIMIT 1`,
    )
    if (existingAnnotation.length === 0) {
      await db.execute(
        sql`INSERT INTO annotations (entry_id, user_id, content, annotation_type, highlights, sort_order)
            VALUES (${entryId}, ${userId}, ${entry.annotation.content}, ${entry.annotation.type}, '[]', 0)`,
      )
      annotationCount++
    }

    // Create Veritas score
    if (entry.veritasScore) {
      const existingScore = await db.execute(
        sql`SELECT id FROM veritas_scores WHERE entry_id = ${entryId} LIMIT 1`,
      )
      if (existingScore.length === 0) {
        const vs = entry.veritasScore
        const dsArray = `{${vs.dataSources.map((s) => `"${s}"`).join(',')}}`
        await db.execute(
          sql`INSERT INTO veritas_scores (entry_id, overall_score, confidence, label, factors, data_sources, calculated_at, expires_at, user_override, user_override_reason)
              VALUES (
                ${entryId},
                ${vs.overallScore},
                ${vs.confidence},
                ${vs.label},
                ${JSON.stringify(vs.factors)},
                ${dsArray}::text[],
                NOW(),
                NOW() + INTERVAL '90 days',
                ${vs.userOverride ?? null},
                ${vs.userOverrideReason ?? null}
              )`,
        )
        veritasCount++
      }
    }
  }

  console.log(`  Entries: ${entryCount} created`)
  console.log(`  Annotations: ${annotationCount} created`)
  console.log(`  Veritas scores: ${veritasCount} created`)

  return { projectIds, tagIds }
}

async function createProjectShares(
  db: ReturnType<typeof drizzle>,
  projectId1: string,
  projectId2: string,
  primaryUserId: string,
  secondaryUserId: string,
) {
  console.log('\n--- Creating project shares ---')

  // Share project 1 with secondary user (edit permission)
  const existing1 = await db.execute(
    sql`SELECT id FROM project_shares WHERE project_id = ${projectId1} AND shared_with_user_id = ${secondaryUserId}`,
  )
  if (existing1.length === 0) {
    await db.execute(
      sql`INSERT INTO project_shares (project_id, shared_with_user_id, permission, is_public_link)
          VALUES (${projectId1}, ${secondaryUserId}, 'edit', false)`,
    )
    console.log('  Shared Project 1 with collaborator (edit)')
  }

  // Public link for project 1
  const existingPublic = await db.execute(
    sql`SELECT id FROM project_shares WHERE project_id = ${projectId1} AND is_public_link = true`,
  )
  if (existingPublic.length === 0) {
    const token = randomUUID().replace(/-/g, '')
    await db.execute(
      sql`INSERT INTO project_shares (project_id, permission, is_public_link, public_link_token)
          VALUES (${projectId1}, 'view', true, ${token})`,
    )
    console.log(`  Created public link for Project 1 (token: ${token})`)
  }

  // Share project 2 with secondary user (comment permission)
  const existing2 = await db.execute(
    sql`SELECT id FROM project_shares WHERE project_id = ${projectId2} AND shared_with_user_id = ${secondaryUserId}`,
  )
  if (existing2.length === 0) {
    await db.execute(
      sql`INSERT INTO project_shares (project_id, shared_with_user_id, permission, is_public_link)
          VALUES (${projectId2}, ${secondaryUserId}, 'comment', false)`,
    )
    console.log('  Shared Project 2 with collaborator (comment)')
  }
}

async function createExcelPreset(db: ReturnType<typeof drizzle>, userId: string) {
  console.log('\n--- Creating Excel export preset ---')

  const existing = await db.execute(
    sql`SELECT id FROM excel_presets WHERE user_id = ${userId} AND name = 'Full Bibliography Export'`,
  )
  if (existing.length > 0) {
    console.log('  Preset already exists')
    return
  }

  const columns = [
    {
      id: 'title',
      field: 'title',
      header: 'Title',
      width: 40,
      format: 'text',
      enabled: true,
      order: 0,
    },
    {
      id: 'authors',
      field: 'authors',
      header: 'Authors',
      width: 30,
      format: 'text',
      enabled: true,
      order: 1,
    },
    {
      id: 'year',
      field: 'year',
      header: 'Year',
      width: 8,
      format: 'number',
      enabled: true,
      order: 2,
    },
    {
      id: 'entryType',
      field: 'entryType',
      header: 'Type',
      width: 15,
      format: 'text',
      enabled: true,
      order: 3,
    },
    {
      id: 'tags',
      field: 'tags',
      header: 'Tags',
      width: 25,
      format: 'tags',
      enabled: true,
      order: 4,
    },
    {
      id: 'doi',
      field: 'metadata.doi',
      header: 'DOI',
      width: 25,
      format: 'hyperlink',
      enabled: true,
      order: 5,
    },
    {
      id: 'isbn',
      field: 'metadata.isbn',
      header: 'ISBN',
      width: 18,
      format: 'text',
      enabled: true,
      order: 6,
    },
    {
      id: 'publisher',
      field: 'metadata.publisher',
      header: 'Publisher',
      width: 20,
      format: 'text',
      enabled: true,
      order: 7,
    },
    {
      id: 'journal',
      field: 'metadata.journal',
      header: 'Journal',
      width: 25,
      format: 'text',
      enabled: true,
      order: 8,
    },
    {
      id: 'notes',
      field: 'notes',
      header: 'Notes',
      width: 40,
      format: 'text',
      enabled: true,
      order: 9,
    },
  ]

  const options = {
    includeHeaderRow: true,
    freezeHeaderRow: true,
    autoFitColumns: true,
    alternateRowColors: true,
    enableWrapping: true,
    headerStyle: {
      bold: true,
      backgroundColor: '#4F46E5',
      textColor: '#FFFFFF',
      fontSize: 11,
    },
    sortBy: [{ field: 'year', direction: 'desc' }],
    filters: {},
    additionalSheets: {
      summary: true,
      tagBreakdown: true,
      sourceTypeDistribution: true,
      veritasDistribution: false,
      timelineChart: false,
    },
  }

  await db.execute(
    sql`INSERT INTO excel_presets (user_id, name, description, columns, options)
        VALUES (${userId}, 'Full Bibliography Export', 'Comprehensive export with all key fields, DOI links, and summary sheet', ${JSON.stringify(columns)}, ${JSON.stringify(options)})`,
  )
  console.log('  Created preset: Full Bibliography Export')
}

async function main() {
  console.log('=== AnnoBib Seed Script ===\n')

  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  try {
    // Users
    console.log('--- Setting up users ---')
    const primaryEmail = userEmail?.toLowerCase() || 'seed@annobib.dev'
    const primaryUserId = await getOrCreateUser(db, primaryEmail, 'seed123', 'Seed User')
    const secondaryUserId = await getOrCreateUser(
      db,
      'collaborator@annobib.dev',
      'collab123',
      'Research Collaborator',
    )

    // Project 1: Post-Labor Economy
    const p1 = await seedProjectConfig(
      db,
      primaryUserId,
      project1Config,
      'Post-Labor Economy & Digital Commons',
    )

    // Project 2: Human Cooperation & Welfare
    const p2 = await seedProjectConfig(
      db,
      primaryUserId,
      project2Config,
      'Human Cooperation & Welfare Institutions',
    )

    // Shares
    const p1MainId = p1.projectIds[project1Config.projects[0].key]
    const p2MainId = p2.projectIds[project2Config.projects[0].key]
    await createProjectShares(db, p1MainId, p2MainId, primaryUserId, secondaryUserId)

    // Excel preset
    await createExcelPreset(db, primaryUserId)

    // Summary
    console.log('\n=== Seed complete ===')
    console.log(`  Primary user: ${primaryEmail}`)
    console.log(`  Collaborator: collaborator@annobib.dev`)
    console.log(`  Projects: ${project1Config.projects.length + project2Config.projects.length}`)
    console.log(`  Tags: ${project1Config.tags.length + project2Config.tags.length}`)
    console.log(`  Entries: ${project1Config.entries.length + project2Config.entries.length}`)
    if (!userEmail) {
      console.log(`\n  Login with: email=seed@annobib.dev password=seed123`)
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
