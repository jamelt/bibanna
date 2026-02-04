import { db } from '~/server/database/client'
import { entries, entryProjects, entryTags, tags, annotations } from '~/server/database/schema'
import { eq, inArray, and } from 'drizzle-orm'
import type { Entry } from '~/shared/types'

export interface GraphNode {
  id: string
  type: 'entry' | 'author' | 'tag' | 'topic'
  label: string
  metadata: {
    entryType?: string
    year?: number
    authors?: string[]
    annotationCount?: number
    color?: string
  }
}

export interface GraphEdge {
  source: string
  target: string
  type: 'authored_by' | 'has_tag' | 'cites' | 'similar_to' | 'same_author'
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export async function buildProjectGraph(projectId: string, userId: string): Promise<GraphData> {
  const projectEntryIds = await db
    .select({ entryId: entryProjects.entryId })
    .from(entryProjects)
    .where(eq(entryProjects.projectId, projectId))

  const entryIds = projectEntryIds.map(e => e.entryId)

  if (entryIds.length === 0) {
    return { nodes: [], edges: [] }
  }

  const projectEntries = await db.query.entries.findMany({
    where: and(
      inArray(entries.id, entryIds),
      eq(entries.userId, userId),
    ),
  })

  const entryTagsData = await db
    .select({
      entryId: entryTags.entryId,
      tagId: entryTags.tagId,
      tagName: tags.name,
      tagColor: tags.color,
    })
    .from(entryTags)
    .innerJoin(tags, eq(tags.id, entryTags.tagId))
    .where(inArray(entryTags.entryId, entryIds))

  const annotationCounts = await db
    .select({
      entryId: annotations.entryId,
    })
    .from(annotations)
    .where(inArray(annotations.entryId, entryIds))

  const annotationCountMap = new Map<string, number>()
  for (const a of annotationCounts) {
    annotationCountMap.set(a.entryId, (annotationCountMap.get(a.entryId) || 0) + 1)
  }

  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const authorNodeIds = new Map<string, string>()
  const tagNodeIds = new Map<string, string>()

  for (const entry of projectEntries) {
    nodes.push({
      id: entry.id,
      type: 'entry',
      label: entry.title.length > 50 ? entry.title.slice(0, 47) + '...' : entry.title,
      metadata: {
        entryType: entry.entryType,
        year: entry.year || undefined,
        authors: (entry.authors as any[])?.map(a => `${a.firstName || ''} ${a.lastName}`.trim()),
        annotationCount: annotationCountMap.get(entry.id) || 0,
      },
    })

    if (entry.authors && Array.isArray(entry.authors)) {
      for (const author of entry.authors as any[]) {
        const authorName = `${author.firstName || ''} ${author.lastName}`.trim()
        const authorKey = authorName.toLowerCase()

        if (!authorNodeIds.has(authorKey)) {
          const authorId = `author-${authorKey.replace(/\s+/g, '-')}`
          authorNodeIds.set(authorKey, authorId)
          nodes.push({
            id: authorId,
            type: 'author',
            label: authorName,
            metadata: {},
          })
        }

        edges.push({
          source: entry.id,
          target: authorNodeIds.get(authorKey)!,
          type: 'authored_by',
          weight: 1,
        })
      }
    }
  }

  for (const tagData of entryTagsData) {
    if (!tagNodeIds.has(tagData.tagId)) {
      tagNodeIds.set(tagData.tagId, `tag-${tagData.tagId}`)
      nodes.push({
        id: `tag-${tagData.tagId}`,
        type: 'tag',
        label: tagData.tagName,
        metadata: {
          color: tagData.tagColor || undefined,
        },
      })
    }

    edges.push({
      source: tagData.entryId,
      target: `tag-${tagData.tagId}`,
      type: 'has_tag',
      weight: 1,
    })
  }

  const authorEntries = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.type === 'authored_by') {
      const authorId = edge.target
      if (!authorEntries.has(authorId)) {
        authorEntries.set(authorId, [])
      }
      authorEntries.get(authorId)!.push(edge.source)
    }
  }

  for (const [, entryIdsList] of authorEntries) {
    if (entryIdsList.length > 1) {
      for (let i = 0; i < entryIdsList.length; i++) {
        for (let j = i + 1; j < entryIdsList.length; j++) {
          edges.push({
            source: entryIdsList[i],
            target: entryIdsList[j],
            type: 'same_author',
            weight: 0.5,
          })
        }
      }
    }
  }

  const tagEntries = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.type === 'has_tag') {
      const tagId = edge.target
      if (!tagEntries.has(tagId)) {
        tagEntries.set(tagId, [])
      }
      tagEntries.get(tagId)!.push(edge.source)
    }
  }

  for (const [, entryIdsList] of tagEntries) {
    if (entryIdsList.length > 1) {
      for (let i = 0; i < entryIdsList.length; i++) {
        for (let j = i + 1; j < entryIdsList.length; j++) {
          const existingSameAuthor = edges.find(
            e => e.type === 'same_author'
              && ((e.source === entryIdsList[i] && e.target === entryIdsList[j])
                || (e.source === entryIdsList[j] && e.target === entryIdsList[i])),
          )
          if (!existingSameAuthor) {
            edges.push({
              source: entryIdsList[i],
              target: entryIdsList[j],
              type: 'similar_to',
              weight: 0.3,
            })
          }
        }
      }
    }
  }

  return { nodes, edges }
}

export function filterGraphByType(
  graph: GraphData,
  options: {
    showAuthors?: boolean
    showTags?: boolean
    showSameAuthorEdges?: boolean
    showSimilarEdges?: boolean
  },
): GraphData {
  const { showAuthors = true, showTags = true, showSameAuthorEdges = true, showSimilarEdges = true } = options

  let filteredNodes = graph.nodes

  if (!showAuthors) {
    filteredNodes = filteredNodes.filter(n => n.type !== 'author')
  }

  if (!showTags) {
    filteredNodes = filteredNodes.filter(n => n.type !== 'tag')
  }

  const nodeIds = new Set(filteredNodes.map(n => n.id))

  let filteredEdges = graph.edges.filter(
    e => nodeIds.has(e.source) && nodeIds.has(e.target),
  )

  if (!showSameAuthorEdges) {
    filteredEdges = filteredEdges.filter(e => e.type !== 'same_author')
  }

  if (!showSimilarEdges) {
    filteredEdges = filteredEdges.filter(e => e.type !== 'similar_to')
  }

  return { nodes: filteredNodes, edges: filteredEdges }
}
