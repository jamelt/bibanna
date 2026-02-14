import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const isGCP = !!process.env.GOOGLE_CLOUD_PROJECT

function getGcpSeverity(level: number): string {
  if (level >= 60) return 'CRITICAL'
  if (level >= 50) return 'ERROR'
  if (level >= 40) return 'WARNING'
  if (level >= 30) return 'INFO'
  if (level >= 20) return 'DEBUG'
  return 'DEFAULT'
}

export const logger: pino.Logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

  ...(isGCP && {
    messageKey: 'message',
    formatters: {
      level(label: string, number: number) {
        return {
          severity: getGcpSeverity(number),
          level: label,
        }
      },
      log(object: Record<string, unknown>) {
        const { err, error, ...rest } = object as {
          err?: Error
          error?: Error
          [key: string]: unknown
        }
        const errorObj = err || error

        if (errorObj && errorObj instanceof Error) {
          return {
            ...rest,
            error: {
              message: errorObj.message,
              name: errorObj.name,
              stack: errorObj.stack,
            },
            '@type':
              'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
          }
        }

        return rest
      },
    },
  }),

  base: {
    service: 'annobib-app',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },

  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'apiKey',
      'secret',
      'creditCard',
      '*.password',
      '*.token',
      '*.apiKey',
    ],
    censor: '[REDACTED]',
  },

  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        host: req.headers?.host,
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
        'x-request-id': req.headers?.['x-request-id'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
})

export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId,
    'logging.googleapis.com/trace': process.env.GOOGLE_CLOUD_PROJECT
      ? `projects/${process.env.GOOGLE_CLOUD_PROJECT}/traces/${requestId}`
      : undefined,
  })
}

export function logApiRequest(
  log: pino.Logger,
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  error?: Error,
) {
  const logData = {
    httpRequest: {
      requestMethod: method,
      requestUrl: path,
      status: statusCode,
      latency: `${durationMs / 1000}s`,
    },
  }

  if (error) {
    log.error({ ...logData, err: error }, `${method} ${path} ${statusCode} - ${durationMs}ms`)
  } else if (statusCode >= 500) {
    log.error(logData, `${method} ${path} ${statusCode} - ${durationMs}ms`)
  } else if (statusCode >= 400) {
    log.warn(logData, `${method} ${path} ${statusCode} - ${durationMs}ms`)
  } else {
    log.info(logData, `${method} ${path} ${statusCode} - ${durationMs}ms`)
  }
}

export function logDatabaseQuery(
  log: pino.Logger,
  operation: string,
  table: string,
  durationMs: number,
  rowCount?: number,
) {
  log.debug(
    {
      db: {
        operation,
        table,
        durationMs,
        rowCount,
      },
    },
    `DB ${operation} on ${table} - ${durationMs}ms`,
  )
}

export function logExternalApiCall(
  log: pino.Logger,
  service: string,
  endpoint: string,
  statusCode: number,
  durationMs: number,
  error?: Error,
) {
  const logData = {
    externalApi: {
      service,
      endpoint,
      statusCode,
      durationMs,
    },
  }

  if (error) {
    log.error(
      { ...logData, err: error },
      `External API ${service} ${endpoint} failed - ${durationMs}ms`,
    )
  } else if (statusCode >= 400) {
    log.warn(logData, `External API ${service} ${endpoint} ${statusCode} - ${durationMs}ms`)
  } else {
    log.debug(logData, `External API ${service} ${endpoint} ${statusCode} - ${durationMs}ms`)
  }
}

export function logBusinessEvent(log: pino.Logger, event: string, data: Record<string, unknown>) {
  log.info(
    {
      event,
      eventData: data,
    },
    `Business event: ${event}`,
  )
}

export default logger
