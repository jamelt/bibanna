import { Unleash, initialize } from 'unleash-client'

let unleashClient: Unleash | null = null

export interface FeatureFlagContext {
  userId?: string
  sessionId?: string
  environment?: string
  subscriptionTier?: string
  properties?: Record<string, string>
}

const DEFAULT_FLAGS: Record<string, boolean> = {
  'research-companion': true,
  'voice-input': true,
  'veritas-score': true,
  'mindmap-visualization': true,
  'excel-export': true,
  'pdf-export': true,
  'ai-metadata-extraction': true,
  'whisper-transcription': true,
  'custom-citation-styles': true,
  'project-sharing': true,
  'multimodal-embeddings': false,
  'auto-context-generation': false,
  'ai-annotation-generation': false,
  'topic-clustering': false,
  'camera-capture': false,
  'offline-mode': false,
}

export async function initFeatureFlags(): Promise<void> {
  const unleashUrl = process.env.UNLEASH_URL
  const unleashApiToken = process.env.UNLEASH_API_TOKEN

  if (!unleashUrl || !unleashApiToken) {
    console.log('Unleash not configured, using default feature flags')
    return
  }

  try {
    unleashClient = initialize({
      url: unleashUrl,
      appName: 'bibanna-app',
      environment: process.env.NODE_ENV || 'development',
      customHeaders: {
        Authorization: unleashApiToken,
      },
      refreshInterval: 15000,
      metricsInterval: 60000,
    })

    await new Promise<void>((resolve, reject) => {
      unleashClient!.on('ready', () => {
        console.log('Unleash client ready')
        resolve()
      })
      unleashClient!.on('error', (err) => {
        console.error('Unleash client error:', err)
        reject(err)
      })
      
      setTimeout(() => {
        console.log('Unleash client timeout, using defaults')
        resolve()
      }, 5000)
    })
  } catch (error) {
    console.error('Failed to initialize Unleash:', error)
  }
}

export function isFeatureEnabled(
  featureName: string,
  context?: FeatureFlagContext,
): boolean {
  if (!unleashClient) {
    return DEFAULT_FLAGS[featureName] ?? false
  }

  const unleashContext = context ? {
    userId: context.userId,
    sessionId: context.sessionId,
    environment: context.environment || process.env.NODE_ENV,
    properties: {
      subscriptionTier: context.subscriptionTier || 'free',
      ...context.properties,
    },
  } : undefined

  return unleashClient.isEnabled(featureName, unleashContext)
}

export function getFeatureVariant(
  featureName: string,
  context?: FeatureFlagContext,
): string | undefined {
  if (!unleashClient) {
    return undefined
  }

  const unleashContext = context ? {
    userId: context.userId,
    sessionId: context.sessionId,
    environment: context.environment || process.env.NODE_ENV,
    properties: {
      subscriptionTier: context.subscriptionTier || 'free',
      ...context.properties,
    },
  } : undefined

  const variant = unleashClient.getVariant(featureName, unleashContext)
  return variant.enabled ? variant.name : undefined
}

export function getAllFeatureFlags(context?: FeatureFlagContext): Record<string, boolean> {
  const flags: Record<string, boolean> = {}
  
  for (const flagName of Object.keys(DEFAULT_FLAGS)) {
    flags[flagName] = isFeatureEnabled(flagName, context)
  }
  
  return flags
}

export function requireFeature(featureName: string, context?: FeatureFlagContext): void {
  if (!isFeatureEnabled(featureName, context)) {
    throw createError({
      statusCode: 403,
      message: `Feature '${featureName}' is not available`,
    })
  }
}

export async function shutdownFeatureFlags(): Promise<void> {
  if (unleashClient) {
    unleashClient.destroy()
    unleashClient = null
  }
}
