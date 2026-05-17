// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ActivityCalendar from '../ActivityCalendar'

afterEach(() => {
  cleanup()
})

describe('ActivityCalendar', () => {
  it('renders reflection activity heading and stats correctly', () => {
    const activityDays = ['2026-05-17', '2026-05-16']
    render(<ActivityCalendar activityDays={activityDays} currentStreak={5} />)
    
    // Check main title
    expect(screen.getByText('Reflection Activity')).toBeDefined()
    
    // Check activity stats are displayed correctly
    expect(screen.getByText('Day Streak')).toBeDefined()
    expect(screen.getByText('5')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('Days Active')).toBeDefined()
  })

  it('renders the scrollable wrapper and hidden scrollbars structure', () => {
    const { container } = render(<ActivityCalendar activityDays={[]} currentStreak={0} />)
    
    // Find the scroll container by class names
    const scrollContainer = container.querySelector('.overflow-x-auto')
    expect(scrollContainer).not.toBeNull()
    expect(scrollContainer?.classList.contains('no-scrollbar')).toBe(true)
    expect(scrollContainer?.classList.contains('scroll-smooth')).toBe(true)
    expect(scrollContainer?.classList.contains('w-full')).toBe(true)
    
    // Find the inner grid wrapper and verify it has the min-width utility
    const innerWrapper = container.querySelector('.min-w-\\[420px\\]')
    expect(innerWrapper).not.toBeNull()
    expect(innerWrapper?.classList.contains('inline-block')).toBe(true)
  })

  it('renders the mobile-only pulsing swipe hint accompanied by swipe text', () => {
    render(<ActivityCalendar activityDays={[]} currentStreak={0} />)
    
    // Verify swipe hint text exists
    const swipeHint = screen.getByText('Swipe left to view past activity')
    expect(swipeHint).toBeDefined()
    
    // Verify it is styled correctly (hidden on desktop md screen, pulsing)
    expect(swipeHint.parentElement?.className).toContain('md:hidden')
    expect(swipeHint.parentElement?.className).toContain('animate-pulse')
  })
})
