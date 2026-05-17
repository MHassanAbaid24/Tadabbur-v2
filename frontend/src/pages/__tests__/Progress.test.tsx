// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Progress from '../Progress'
import { useProgressStore } from '../../store/progressStore'
import api from '../../lib/api'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockedGet = vi.mocked(api.get)

const summaryPayload = {
  current_streak: 3,
  longest_streak: 8,
  xp: 120,
  level: 2,
  level_name: 'Learner',
  level_name_ar: 'متعلّم',
  activity_days: ['2026-05-15', '2026-05-16'],
  xp_to_next_level: 30,
}

beforeEach(() => {
  useProgressStore.setState({
    summary: null,
    isLoading: false,
    error: null,
    lastFetchedAt: null,
  })
  mockedGet.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('Progress weekly insights', () => {
  it('requests weekly insights and renders returned markdown after clicking Analyze My Week', async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { data: summaryPayload } })
      .mockResolvedValueOnce({
        data: {
          data: {
            status: 'ready',
            insight_markdown: '## Weekly Wrap-Up\n- You consistently reflected with gratitude.',
            reflection_count: 5,
          },
        },
      })

    render(
      <MemoryRouter>
        <Progress />
      </MemoryRouter>,
    )

    const analyzeButton = await screen.findByRole('button', { name: 'Analyze My Week' })
    fireEvent.click(analyzeButton)

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/api/v1/progress/weekly-insights')
    })

    expect(await screen.findByText('Weekly Wrap-Up')).toBeDefined()
    expect(
      screen.getByText('You consistently reflected with gratitude.'),
    ).toBeDefined()
  })

  it('shows not-enough-data state when no weekly reflections are available', async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { data: summaryPayload } })
      .mockResolvedValueOnce({
        data: {
          data: {
            status: 'not_enough_data',
            insight_markdown: null,
            message: 'Not enough reflection data from the last 7 days yet.',
            reflection_count: 0,
          },
        },
      })

    render(
      <MemoryRouter>
        <Progress />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Analyze My Week' }))

    expect(
      await screen.findByText('Not enough reflection data from the last 7 days yet.'),
    ).toBeDefined()
  })

  it('shows analyzing state while weekly insights are being generated', async () => {
    type WeeklyInsightsResponse = {
      data: {
        data: {
          status: 'ready'
          insight_markdown: string
          reflection_count: number
        }
      }
    }

    let resolveWeekly: ((value: WeeklyInsightsResponse) => void) | undefined
    const weeklyPromise = new Promise<WeeklyInsightsResponse>((resolve) => {
      resolveWeekly = resolve
    })

    mockedGet
      .mockResolvedValueOnce({ data: { data: summaryPayload } })
      .mockImplementationOnce(() => weeklyPromise as ReturnType<typeof mockedGet>)

    render(
      <MemoryRouter>
        <Progress />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Analyze My Week' }))
    expect(await screen.findByRole('button', { name: 'Analyzing...' })).toBeDefined()

    if (!resolveWeekly) {
      throw new Error('Weekly insights resolver was not initialized')
    }

    resolveWeekly({
      data: {
        data: {
          status: 'ready',
          insight_markdown: '## Weekly Wrap-Up\n- Keep going.',
          reflection_count: 1,
        },
      },
    })

    expect(await screen.findByText('Weekly Wrap-Up')).toBeDefined()
  })
})
