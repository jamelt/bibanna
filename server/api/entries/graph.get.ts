import { buildLibraryGraph, filterGraphByType } from '~/server/services/graph/build-graph'
import { requireLightOrProTier } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireLightOrProTier(user)

  const query = getQuery(event)

  const limit = Math.min(Number(query.limit) || 200, 500)

  const graph = await buildLibraryGraph(user.id, limit)

  const filteredGraph = filterGraphByType(graph, {
    showAuthors: query.showAuthors !== 'false',
    showTags: query.showTags !== 'false',
    showSameAuthorEdges: query.showSameAuthorEdges !== 'false',
    showSimilarEdges: query.showSimilarEdges !== 'false',
  })

  return filteredGraph
})
