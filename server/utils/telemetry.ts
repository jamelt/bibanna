import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { MetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { diag, DiagConsoleLogger, DiagLogLevel, trace, metrics, SpanStatusCode } from '@opentelemetry/api'

const config = useRuntimeConfig()

const isProduction = process.env.NODE_ENV === 'production'
const isGCP = !!process.env.GOOGLE_CLOUD_PROJECT

if (isProduction && process.env.OTEL_DEBUG === 'true') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)
}

let sdk: NodeSDK | null = null

export function initTelemetry() {
  if (sdk) return

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'bibanna-app',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  })

  const spanProcessors: BatchSpanProcessor[] = []
  let metricReader: PeriodicExportingMetricReader | undefined

  if (isGCP) {
    const traceExporter = new TraceExporter({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
    spanProcessors.push(new BatchSpanProcessor(traceExporter))

    const metricExporter = new MetricExporter({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
    metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000,
    })
  }

  sdk = new NodeSDK({
    resource,
    spanProcessors,
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingPaths: ['/api/health', '/_nuxt'],
        },
      }),
    ],
  })

  sdk.start()

  process.on('SIGTERM', () => {
    sdk?.shutdown()
      .then(() => console.log('Telemetry shut down'))
      .catch((error) => console.error('Error shutting down telemetry', error))
      .finally(() => process.exit(0))
  })
}

export function getTracer(name: string = 'bibanna') {
  return trace.getTracer(name)
}

export function getMeter(name: string = 'bibanna') {
  return metrics.getMeter(name)
}

export interface SpanOptions {
  attributes?: Record<string, string | number | boolean>
}

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  options: SpanOptions = {},
): Promise<T> {
  const tracer = getTracer()
  return tracer.startActiveSpan(name, { attributes: options.attributes }, async (span) => {
    try {
      const result = await fn()
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      })
      span.recordException(error)
      throw error
    } finally {
      span.end()
    }
  })
}

const meter = getMeter()

export const httpRequestDuration = meter.createHistogram('http_request_duration_ms', {
  description: 'Duration of HTTP requests in milliseconds',
  unit: 'ms',
})

export const httpRequestTotal = meter.createCounter('http_request_total', {
  description: 'Total number of HTTP requests',
})

export const dbQueryDuration = meter.createHistogram('db_query_duration_ms', {
  description: 'Duration of database queries in milliseconds',
  unit: 'ms',
})

export const aiApiDuration = meter.createHistogram('ai_api_duration_ms', {
  description: 'Duration of AI API calls in milliseconds',
  unit: 'ms',
})

export const activeUsers = meter.createUpDownCounter('active_users', {
  description: 'Number of active users',
})

export const entryCount = meter.createObservableGauge('entry_count', {
  description: 'Total number of entries in the system',
})

export const projectCount = meter.createObservableGauge('project_count', {
  description: 'Total number of projects in the system',
})

export function recordHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
) {
  const attributes = { method, path, status_code: statusCode.toString() }
  httpRequestTotal.add(1, attributes)
  httpRequestDuration.record(durationMs, attributes)
}

export function recordDbQuery(operation: string, table: string, durationMs: number) {
  dbQueryDuration.record(durationMs, { operation, table })
}

export function recordAiApiCall(provider: string, model: string, durationMs: number) {
  aiApiDuration.record(durationMs, { provider, model })
}
