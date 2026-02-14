import { db } from '~/server/database/client'
import { sql, eq, inArray } from 'drizzle-orm'
import { entries, entryProjects, tags, entryTags } from '~/server/database/schema'

export interface GraphNode {
  id: string
  type: 'entry' | 'author' | 'topic' | 'project'
  label: string
  properties: Record<string, unknown>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'cites' | 'cited_by' | 'same_author' | 'same_topic' | 'related' | 'in_project' | 'user_link'
  weight?: number
  properties?: Record<string, unknown>
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export async function initializeGraphExtension(): Promise<void> {
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS age`)
    await db.execute(sql`LOAD 'age'`)
    await db.execute(sql`SET search_path = ag_catalog, "$user", public`)

    const graphExists = await db.execute<{ count: number }>(
      sql`SELECT count(*) FROM ag_catalog.ag_graph WHERE name = 'annobib_graph'`,
    )

    if (graphExists[0]?.count === 0) {
      await db.execute(sql`SELECT create_graph('annobib_graph')`)
    }

    console.log('Apache AGE graph extension initialized')
  } catch (error) {
    console.error('Failed to initialize graph extension:', error)
  }
}

export async function createEntryVertex(
  entryId: string,
  entry: {
    title: string
    entryType: string
    year?: number
    authors?: Array<{ firstName: string; lastName: string }>
  },
): Promise<void> {
  const authorNames = entry.authors?.map((a) => `${a.firstName} ${a.lastName}`).join(', ') || ''

  await db.execute(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MERGE (e:Entry {id: ${entryId}})
      SET e.title = ${entry.title},
          e.type = ${entry.entryType},
          e.year = ${entry.year || 0},
          e.authors = ${authorNames}
      RETURN e
    $$) AS (e agtype)
  `)
}

export async function createCitationEdge(
  sourceEntryId: string,
  targetEntryId: string,
): Promise<void> {
  await db.execute(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MATCH (source:Entry {id: ${sourceEntryId}})
      MATCH (target:Entry {id: ${targetEntryId}})
      MERGE (source)-[r:CITES]->(target)
      RETURN r
    $$) AS (r agtype)
  `)
}

export async function createAuthorVertex(authorName: string): Promise<string> {
  const authorId = `author:${authorName.toLowerCase().replace(/\s+/g, '_')}`

  await db.execute(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MERGE (a:Author {id: ${authorId}})
      SET a.name = ${authorName}
      RETURN a
    $$) AS (a agtype)
  `)

  return authorId
}

export async function linkEntryToAuthor(entryId: string, authorId: string): Promise<void> {
  await db.execute(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MATCH (e:Entry {id: ${entryId}})
      MATCH (a:Author {id: ${authorId}})
      MERGE (e)-[r:AUTHORED_BY]->(a)
      RETURN r
    $$) AS (r agtype)
  `)
}

export async function createTopicVertex(topic: string): Promise<string> {
  const topicId = `topic:${topic.toLowerCase().replace(/\s+/g, '_')}`

  await db.execute(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MERGE (t:Topic {id: ${topicId}})
      SET t.name = ${topic}
      RETURN t
    $$) AS (t agtype)
  `)

  return topicId
}

export async function linkEntryToTopic(entryId: string, topicId: string): Promise<void> {
  await db.execute(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MATCH (e:Entry {id: ${entryId}})
      MATCH (t:Topic {id: ${topicId}})
      MERGE (e)-[r:HAS_TOPIC]->(t)
      RETURN r
    $$) AS (r agtype)
  `)
}

export async function createUserLink(
  sourceEntryId: string,
  targetEntryId: string,
  linkType: string,
  notes?: string,
): Promise<void> {
  await db.execute(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MATCH (source:Entry {id: ${sourceEntryId}})
      MATCH (target:Entry {id: ${targetEntryId}})
      MERGE (source)-[r:USER_LINK {type: ${linkType}, notes: ${notes || ''}}]->(target)
      RETURN r
    $$) AS (r agtype)
  `)
}

export async function getCitationNetwork(entryId: string, depth: number = 2): Promise<GraphData> {
  const result = await db.execute<{ path: string }>(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MATCH path = (start:Entry {id: ${entryId}})-[:CITES*1..${depth}]->(cited:Entry)
      RETURN path
    $$) AS (path agtype)
  `)

  return parseGraphResult(result)
}

export async function getRelatedEntriesByAuthor(entryId: string): Promise<GraphData> {
  const result = await db.execute<{ e: string }>(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MATCH (start:Entry {id: ${entryId}})-[:AUTHORED_BY]->(a:Author)<-[:AUTHORED_BY]-(related:Entry)
      WHERE related.id <> ${entryId}
      RETURN DISTINCT related
    $$) AS (e agtype)
  `)

  return parseGraphResult(result)
}

export async function getRelatedEntriesByTopic(entryId: string): Promise<GraphData> {
  const result = await db.execute<{ e: string }>(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MATCH (start:Entry {id: ${entryId}})-[:HAS_TOPIC]->(t:Topic)<-[:HAS_TOPIC]-(related:Entry)
      WHERE related.id <> ${entryId}
      RETURN DISTINCT related
    $$) AS (e agtype)
  `)

  return parseGraphResult(result)
}

export async function findShortestPath(
  sourceEntryId: string,
  targetEntryId: string,
): Promise<GraphData> {
  const result = await db.execute<{ path: string }>(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MATCH path = shortestPath((source:Entry {id: ${sourceEntryId}})-[*]-(target:Entry {id: ${targetEntryId}}))
      RETURN path
    $$) AS (path agtype)
  `)

  return parseGraphResult(result)
}

export async function getTopicClusters(projectId: string): Promise<
  Array<{
    topic: string
    entries: string[]
    count: number
  }>
> {
  const result = await db.execute<{ topic: string; entries: string[]; count: number }>(sql`
    SELECT * FROM cypher('annobib_graph', $$
      MATCH (e:Entry)-[:HAS_TOPIC]->(t:Topic)
      WHERE e.projectId = ${projectId}
      RETURN t.name AS topic, collect(e.id) AS entries, count(e) AS count
      ORDER BY count DESC
    $$) AS (topic agtype, entries agtype, count agtype)
  `)

  return result.map((r) => ({
    topic: r.topic,
    entries: r.entries,
    count: r.count,
  }))
}

export async function syncProjectToGraph(projectId: string, userId: string): Promise<void> {
  const projectEntries = await db.query.entryProjects.findMany({
    where: eq(entryProjects.projectId, projectId),
    with: {
      entry: true,
    },
  })

  for (const { entry } of projectEntries) {
    await createEntryVertex(entry.id, {
      title: entry.title,
      entryType: entry.entryType,
      year: entry.year || undefined,
      authors: entry.authors as Array<{ firstName: string; lastName: string }>,
    })

    if (entry.authors) {
      for (const author of entry.authors as Array<{ firstName: string; lastName: string }>) {
        const authorId = await createAuthorVertex(`${author.firstName} ${author.lastName}`)
        await linkEntryToAuthor(entry.id, authorId)
      }
    }

    const entryTagRecords = await db.query.entryTags.findMany({
      where: eq(entryTags.entryId, entry.id),
      with: {
        tag: true,
      },
    })

    for (const { tag } of entryTagRecords) {
      const topicId = await createTopicVertex(tag.name)
      await linkEntryToTopic(entry.id, topicId)
    }
  }
}

function parseGraphResult(result: any[]): GraphData {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()

  for (const row of result) {
    try {
      const parsed = JSON.parse(JSON.stringify(row))

      if (parsed.vertices) {
        for (const vertex of parsed.vertices) {
          if (!nodeIds.has(vertex.id)) {
            nodes.push({
              id: vertex.id,
              type: vertex.label?.toLowerCase() || 'entry',
              label: vertex.properties?.title || vertex.properties?.name || vertex.id,
              properties: vertex.properties || {},
            })
            nodeIds.add(vertex.id)
          }
        }
      }

      if (parsed.edges) {
        for (const edge of parsed.edges) {
          edges.push({
            id: `${edge.start_id}-${edge.end_id}`,
            source: edge.start_id,
            target: edge.end_id,
            type: edge.label?.toLowerCase() || 'related',
            properties: edge.properties || {},
          })
        }
      }
    } catch {
      continue
    }
  }

  return { nodes, edges }
}
