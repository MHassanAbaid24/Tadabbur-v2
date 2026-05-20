// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Landing from '../Landing'
import { useAuthStore } from '../../store/authStore'

// Mock framer-motion to avoid animation delays and dynamic tag issues in tests
vi.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, key) => {
        return ({ children, ...props }: any) => {
          const Tag = key as any
          // Strip motion-specific props so React doesn't complain about invalid attributes
          const {
            animate,
            initial,
            exit,
            transition,
            variants,
            whileHover,
            whileTap,
            whileInView,
            viewport,
            ...cleanProps
          } = props
          return <Tag {...cleanProps}>{children}</Tag>
        }
      }
    }
  )
  return { motion, AnimatePresence: ({ children }: any) => <>{children}</> }
})

// Mock useAuthStore
vi.mock('../../store/authStore', () => {
  let state = {
    isAuthenticated: false,
    isLoading: false,
    user: null as any,
  }

  const mockStore = () => state
  mockStore.getState = () => state
  mockStore.setState = (update: any) => {
    state = { ...state, ...update }
  }

  return {
    useAuthStore: mockStore
  }
})

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: false,
    isLoading: false,
    user: null,
  })
})

afterEach(() => {
  cleanup()
})

describe('Landing Page Component', () => {
  it('renders branding and tagline', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    )

    // Verify Latin and Arabic branding presence
    expect(screen.getAllByText('Tadabbur')).toBeDefined()
    expect(screen.getAllByText('تدبّر')).toBeDefined()

    // Verify the spiritual tagline parts
    expect(screen.getByText('Read. Reflect.')).toBeDefined()
    expect(screen.getByText('Grow Together.')).toBeDefined()

    // Verify interactive demo disclaimer
    expect(screen.getByText(/This is a demo interaction to showcase the reflection functionality/i)).toBeDefined()
    expect(screen.getByText('— Al-Baqarah 2:152')).toBeDefined()
  })

  it('renders standard dynamic CTAs for unauthenticated users', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    )

    const loginButtons = screen.getAllByText('Log In')
    expect(loginButtons.length).toBeGreaterThan(0)
  })

  it('renders Go to App dynamic CTAs for authenticated users', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: { onboarded: true } as any,
    })

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    )

    expect(screen.getAllByText('Go to App').length).toBeGreaterThan(0)
  })

  it('allows user to interact with the mock simulator and achieve a level up', async () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    )

    const meaningInput = screen.getByPlaceholderText('Your reflection…') as HTMLTextAreaElement
    meaningInput.focus()
    fireEvent.change(meaningInput, { target: { value: 'This verse teaches me patience.' } })
    meaningInput.blur()

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Your reflection…') as HTMLTextAreaElement
      expect(input.value).toBe('This verse teaches me patience.')
    })

    const commitmentInput = screen.getByPlaceholderText('Your commitment…') as HTMLTextAreaElement
    commitmentInput.focus()
    fireEvent.change(commitmentInput, { target: { value: 'I will pause before reacting today.' } })
    commitmentInput.blur()

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Your commitment…') as HTMLTextAreaElement
      expect(input.value).toBe('I will pause before reacting today.')
    })

    const moodButton = screen.getByTitle('Grateful & growing')
    fireEvent.click(moodButton)

    await waitFor(() => {
      const freshSubmitButton = screen.getByRole('button', { name: 'Reflect Now' })
      expect(freshSubmitButton.hasAttribute('disabled')).toBe(false)
    })

    const submitButton = screen.getByRole('button', { name: 'Reflect Now' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/\+10 XP Earned/i)).toBeDefined()
      expect(screen.getByText(/Streak Activated!/i)).toBeDefined()
    })
  })
})
