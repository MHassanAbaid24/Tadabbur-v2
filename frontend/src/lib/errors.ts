import axios from 'axios'

/**
 * Parses any caught error and extracts a clear, user-facing error message.
 * Supports standard FastAPI HTTPException payload shapes, validation arrays,
 * custom backend JSON structures, Axios network disruptions, and native JS Errors.
 *
 * @param error - The caught exception (unknown type).
 * @param fallbackMessage - Custom fallback string if no specific details can be extracted.
 * @returns A clear, human-readable error message.
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage: string = 'An unexpected error occurred'
): string {
  if (!error) return fallbackMessage

  if (axios.isAxiosError(error)) {
    // Handle Axios network errors
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return 'Network Error. Please check your connection.'
    }

    const data = error.response?.data
    if (data && typeof data === 'object') {
      // 1. Standard FastAPI HTTPException detail string
      if ('detail' in data && typeof data.detail === 'string') {
        return data.detail
      }

      // 2. FastAPI validation error list (array of details)
      if ('detail' in data && Array.isArray(data.detail) && data.detail.length > 0) {
        const firstDetail = data.detail[0]
        if (
          firstDetail &&
          typeof firstDetail === 'object' &&
          'msg' in firstDetail &&
          typeof firstDetail.msg === 'string'
        ) {
          return firstDetail.msg
        }
      }

      // 3. Alternative backend payload format: error
      if ('error' in data && typeof data.error === 'string') {
        return data.error
      }

      // 4. Alternative backend payload format: message
      if ('message' in data && typeof data.message === 'string') {
        return data.message
      }
    }

    // Fallback to error message from Axios if present
    if (error.message && typeof error.message === 'string') {
      return error.message
    }
  }

  // Handle native JavaScript Error objects
  if (error instanceof Error) {
    return error.message
  }

  // Handle raw string errors
  if (typeof error === 'string') {
    return error
  }

  return fallbackMessage
}
