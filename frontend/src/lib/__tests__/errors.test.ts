import { describe, it, expect } from 'vitest'
import { getErrorMessage } from '../errors'

describe('getErrorMessage', () => {
  it('should parse standard FastAPI HTTPException payloads (response.data.detail)', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          detail: 'Email already registered'
        }
      }
    }
    expect(getErrorMessage(error)).toBe('Email already registered')
  })

  it('should parse FastAPI validation details array (first element msg)', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          detail: [
            {
              loc: ['body', 'username'],
              msg: 'Username must be at least 3 characters',
              type: 'value_error.any_str.min_length'
            }
          ]
        }
      }
    }
    expect(getErrorMessage(error)).toBe('Username must be at least 3 characters')
  })

  it('should parse alternative backend payload structure (response.data.error)', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: 'Username already taken'
        }
      }
    }
    expect(getErrorMessage(error)).toBe('Username already taken')
  })

  it('should parse alternative backend payload structure (response.data.message)', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    }
    expect(getErrorMessage(error)).toBe('Invalid credentials')
  })

  it('should handle Axios-specific network disruption ERR_NETWORK', () => {
    const error = {
      isAxiosError: true,
      code: 'ERR_NETWORK',
      message: 'Network Error'
    }
    expect(getErrorMessage(error)).toBe('Network Error. Please check your connection.')
  })

  it('should handle Axios-specific network disruption via message only', () => {
    const error = {
      isAxiosError: true,
      message: 'Network Error'
    }
    expect(getErrorMessage(error)).toBe('Network Error. Please check your connection.')
  })

  it('should fall back to Axios error.message if no response payload is available', () => {
    const error = {
      isAxiosError: true,
      message: 'Something went wrong on the client side'
    }
    expect(getErrorMessage(error)).toBe('Something went wrong on the client side')
  })

  it('should parse native JavaScript Error objects', () => {
    const error = new Error('Generic file system error')
    expect(getErrorMessage(error)).toBe('Generic file system error')
  })

  it('should parse raw string errors', () => {
    expect(getErrorMessage('Raw database crash error')).toBe('Raw database crash error')
  })

  it('should fall back cleanly to default message for invalid objects', () => {
    expect(getErrorMessage({})).toBe('An unexpected error occurred')
    expect(getErrorMessage(null)).toBe('An unexpected error occurred')
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred')
  })

  it('should fall back cleanly to custom fallbackMessage', () => {
    expect(getErrorMessage(null, 'Custom failure message')).toBe('Custom failure message')
    expect(getErrorMessage({}, 'Custom failure message')).toBe('Custom failure message')
  })
})
