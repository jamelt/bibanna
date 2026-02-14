const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'

export const RATE_LIMITS = {
  login: {
    maxRequests: isTestOrDev ? 1000 : 5,
    windowMs: 15 * 60 * 1000,
  },
  register: {
    maxRequests: isTestOrDev ? 1000 : 3,
    windowMs: 60 * 60 * 1000,
  },
  ai: {
    maxRequests: isTestOrDev ? 1000 : 20,
    windowMs: 60 * 1000,
  },
  export: {
    maxRequests: isTestOrDev ? 1000 : 10,
    windowMs: 60 * 1000,
  },
  upload: {
    maxRequests: isTestOrDev ? 1000 : 20,
    windowMs: 60 * 1000,
  },
  api: {
    maxRequests: isTestOrDev ? 10000 : 100,
    windowMs: 60 * 1000,
  },
} as const
