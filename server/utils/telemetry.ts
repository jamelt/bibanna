import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { MetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  trace,
  metrics,
  SpanStatusCode,
} from '@opentelemetry/api'

const isProduction = process.env.NODE_ENV === 'production'
const isGCP = !!process.env.GOOGLE_CLOUD_PROJECT

let sdk: NodeSDK | null = null

export async function initTelemetry() {
  if (sdk) return

  const { resourceFromAttributes } = await import('@opentelemetry/resources')

  const resource = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'annobib-app',
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
    sdk
      ?.shutdown()
      .then(() => console.log('Telemetry shut down'))
      .catch((error) => console.error('Error shutting down telemetry', error))
      .finally(() => process.exit(0))
  })
}

export function getTracer(name: string = 'annobib') {
  return trace.getTracer(name)
}

export function getMeter(name: string = 'annobib') {
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

let _metrics: {
  httpRequestDuration: ReturnType<ReturnType<typeof getMeter>['createHistogram']>
  httpRequestTotal: ReturnType<ReturnType<typeof getMeter>['createCounter']>
  dbQueryDuration: ReturnType<ReturnType<typeof getMeter>['createHistogram']>
  aiApiDuration: ReturnType<ReturnType<typeof getMeter>['createHistogram']>
  activeUsers: ReturnType<ReturnType<typeof getMeter>['createUpDownCounter']>
  entryCount: ReturnType<ReturnType<typeof getMeter>['createObservableGauge']>
  projectCount: ReturnType<ReturnType<typeof getMeter>['createObservableGauge']>
} | null = null

function getMetrics() {
  if (!_metrics) {
    if (isProduction && process.env.OTEL_DEBUG === 'true') {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)
    }
    const meter = getMeter()
    _metrics = {
      httpRequestDuration: meter.createHistogram('http_request_duration_ms', {
        description: 'Duration of HTTP requests in milliseconds',
        unit: 'ms',
      }),
      httpRequestTotal: meter.createCounter('http_request_total', {
        description: 'Total number of HTTP requests',
      }),
      dbQueryDuration: meter.createHistogram('db_query_duration_ms', {
        description: 'Duration of database queries in milliseconds',
        unit: 'ms',
      }),
      aiApiDuration: meter.createHistogram('ai_api_duration_ms', {
        description: 'Duration of AI API calls in milliseconds',
        unit: 'ms',
      }),
      activeUsers: meter.createUpDownCounter('active_users', {
        description: 'Number of active users',
      }),
      entryCount: meter.createObservableGauge('entry_count', {
        description: 'Total number of entries in the system',
      }),
      projectCount: meter.createObservableGauge('project_count', {
        description: 'Total number of projects in the system',
      }),
    }
  }
  return _metrics
}

export const httpRequestDuration = {
  record: (...args: any[]) => getMetrics().httpRequestDuration.record(...args),
}
export const httpRequestTotal = {
  add: (...args: any[]) => getMetrics().httpRequestTotal.add(...args),
}
export const dbQueryDuration = {
  record: (...args: any[]) => getMetrics().dbQueryDuration.record(...args),
}
export const aiApiDuration = {
  record: (...args: any[]) => getMetrics().aiApiDuration.record(...args),
}
export const activeUsers = { add: (...args: any[]) => getMetrics().activeUsers.add(...args) }
export const entryCount = {
  addCallback: (...args: any[]) => getMetrics().entryCount.addCallback(...args),
}
export const projectCount = {
  addCallback: (...args: any[]) => getMetrics().projectCount.addCallback(...args),
}

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
