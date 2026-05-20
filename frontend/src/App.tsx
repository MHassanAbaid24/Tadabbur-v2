import React, { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useEventStream } from './hooks/useEventStream'

// Lazy-loaded page components — only loaded when navigated to
const Landing = lazy(() => import('./pages/Landing'))
const Auth = lazy(() => import('./pages/Auth'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const QFCallback = lazy(() => import('./pages/QFCallback'))
const Home = lazy(() => import('./pages/Home'))
const Journal = lazy(() => import('./pages/Journal'))
const Circle = lazy(() => import('./pages/Circle'))
const CircleNew = lazy(() => import('./pages/CircleNew'))
const CircleJoin = lazy(() => import('./pages/CircleJoin'))
const Progress = lazy(() => import('./pages/Progress'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const Explore = lazy(() => import('./pages/Explore'))

// Shared loading spinner for Suspense fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cream-50 to-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  )
}

interface ProtectedRouteProps {
  element: React.ReactNode
}

function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (!user?.onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return element
}

function OnboardingRoute({ element }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (user?.onboarded) {
    return <Navigate to="/home" replace />
  }

  return element
}

export default function App() {
  const { loadUser, isAuthenticated, user } = useAuthStore()
  useEventStream()

  // Load user session on app mount
  useEffect(() => {
    loadUser()
  }, [loadUser])

  // Idle background preloading for authenticated onboarded users
  useEffect(() => {
    if (isAuthenticated && user?.onboarded) {
      const preloadPages = () => {
        const pages = [
          () => import('./pages/Journal'),
          () => import('./pages/Circle'),
          () => import('./pages/CircleNew'),
          () => import('./pages/CircleJoin'),
          () => import('./pages/Progress'),
          () => import('./pages/ProfilePage'),
          () => import('./pages/Explore'),
        ]
        pages.forEach((load) => {
          load().catch((err) => console.warn('Preload page chunk failed:', err))
        })
      }

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => preloadPages())
      } else {
        setTimeout(preloadPages, 2000)
      }
    }
  }, [isAuthenticated, user?.onboarded])

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/qf-callback" element={<QFCallback />} />

          <Route path="/" element={<Landing />} />

          <Route
            path="/onboarding"
            element={<OnboardingRoute element={<Onboarding />} />}
          />

          <Route
            path="/home"
            element={<ProtectedRoute element={<Home />} />}
          />

          <Route
            path="/journal"
            element={<ProtectedRoute element={<Journal />} />}
          />

          <Route
            path="/circle"
            element={<ProtectedRoute element={<Circle />} />}
          />

          <Route
            path="/circle/new"
            element={<ProtectedRoute element={<CircleNew />} />}
          />

          <Route
            path="/circle/join/:code"
            element={<ProtectedRoute element={<CircleJoin />} />}
          />

          <Route
            path="/progress"
            element={<ProtectedRoute element={<Progress />} />}
          />
          
          <Route
            path="/profile"
            element={<ProtectedRoute element={<ProfilePage />} />}
          />

          <Route
            path="/explore"
            element={<ProtectedRoute element={<Explore />} />}
          />

          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
