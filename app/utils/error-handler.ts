interface ApiError {
  data?: {
    message?: string
    data?: {
      fieldErrors?: Record<string, string>
    }
  }
  message?: string
  statusCode?: number
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error !== null &&
    typeof error === 'object' &&
    ('data' in error || 'message' in error || 'statusCode' in error)
  )
}

export function getErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  if (isApiError(error)) {
    return error.data?.message || error.message || fallback
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

export function getFieldErrors(error: unknown): Record<string, string> | undefined {
  if (isApiError(error) && error.data?.data?.fieldErrors) {
    return error.data.data.fieldErrors
  }
  return undefined
}
