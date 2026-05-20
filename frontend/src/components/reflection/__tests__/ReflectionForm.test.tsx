// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ReflectionForm from '../ReflectionForm'

vi.mock('../../../store/reflectionStore', () => ({
  useReflectionStore: () => ({
    submitReflection: vi.fn(),
  }),
}))

let mockCircle: any = null

vi.mock('../../../store/circleStore', () => ({
  useCircleStore: () => ({
    circle: mockCircle,
    fetchMyCircle: vi.fn(),
  }),
}))

vi.mock('../../ui/QFAuthModal', () => ({
  default: () => null,
}))

vi.mock('../../../lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: {} } }),
  },
}))

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: {} } }),
  },
}))

afterEach(() => {
  mockCircle = null
  cleanup()
})

describe('ReflectionForm prompt labels', () => {
  it('renders dynamic prompts when provided', () => {
    render(
      <ReflectionForm
        verseKey="2:255"
        onSubmitted={() => {}}
        prompt1Label='Dynamic prompt one'
        prompt2Label='Dynamic prompt two'
      />,
    )

    expect(screen.getByText('Dynamic prompt one')).toBeDefined()
    expect(screen.getByText('Dynamic prompt two')).toBeDefined()
  })

  it('falls back to static prompts when dynamic prompts are missing', async () => {
    render(<ReflectionForm verseKey="2:255" onSubmitted={() => {}} />)

    expect(
      await screen.findByText('What does this ayah mean to you, right now, in your life?'),
    ).toBeDefined()
    expect(
      await screen.findByText('What is one thing you will do differently today because of this ayah?'),
    ).toBeDefined()
  })
})

describe('ReflectionForm circle sharing visibility', () => {
  it('does not render circle sharing checkbox when no circle exists', () => {
    mockCircle = null
    render(<ReflectionForm verseKey="2:255" onSubmitted={() => {}} />)

    expect(screen.queryByText(/Share with/i)).toBeNull()
  })

  it('renders circle sharing checkbox with circle name when circle exists', async () => {
    mockCircle = { id: 'circle-123', name: 'Al-Kahf Study Group' }
    render(<ReflectionForm verseKey="2:255" onSubmitted={() => {}} />)

    expect(await screen.findByText('Share with Al-Kahf Study Group')).toBeDefined()
  })
})
