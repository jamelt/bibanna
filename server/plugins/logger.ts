import { createRequestLogger, logApiRequest } from '~/server/utils/logger'
import { randomUUID } from 'crypto'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const requestId = (event.headers.get('x-request-id') || randomUUID()) as string
    const userId = event.context.user?.id as string | undefined
    
    event.context.requestId = requestId
    event.context.log = createRequestLogger(requestId, userId)
    event.context._requestStart = Date.now()
    
    event.node.res.setHeader('x-request-id', requestId)
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    const startTime = event.context._requestStart as number | undefined
    const log = event.context.log
    
    if (startTime && log) {
      const duration = Date.now() - startTime
      const method = event.method
      const path = event.path
      const statusCode = event.node.res.statusCode
      const error = event.context._error as Error | undefined
      
      logApiRequest(log, method, path, statusCode, duration, error)
    }
  })

  nitroApp.hooks.hook('error', (error, { event }) => {
    if (event) {
      event.context._error = error
    }
  })
})
