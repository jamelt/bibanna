import { db } from '~/server/database/client'
import { projects } from '~/server/database/schema'
import { buildProjectGraph, filterGraphByType } from '~/server/services/graph/build-graph'
import { requireLightOrProTier } from '~/server/utils/auth'
import { buildProjectWhere } from '~/server/utils/project-query'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireLightOrProTier(user)

  const projectId = getRouterParam(event, 'id')
  const query = getQuery(event)

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const project = await db.query.projects.findFirst({
    where: buildProjectWhere(projectId, user.id),
  })

  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  const graph = await buildProjectGraph(project.id, user.id)

  const filteredGraph = filterGraphByType(graph, {
    showAuthors: query.showAuthors !== 'false',
    showTags: query.showTags !== 'false',
    showSameAuthorEdges: query.showSameAuthorEdges !== 'false',
    showSimilarEdges: query.showSimilarEdges !== 'false',
  })

  return filteredGraph
})
