import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import QFCallback from './pages/QFCallback'
import Home from './pages/Home'
import Journal from './pages/Journal'
import Circle from './pages/Circle'
import Progress from './pages/Progress'

interface ProtectedRouteProps {
  element: React.ReactNode
}

function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null)

  useEffect(() => {
    const onboarded = localStorage.getItem('tadabbur_onboarded') === 'true'
    setIsOnboarded(onboarded)
  }, [])

  if (isLoading || isOnboarded === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return element
}

function OnboardingRoute({ element }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null)

  useEffect(() => {
    const onboarded = localStorage.getItem('tadabbur_onboarded') === 'true'
    setIsOnboarded(onboarded)
  }, [])

  if (isLoading || isOnboarded === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (isOnboarded) {
    return <Navigate to="/home" replace />
  }

  return element
}

export default function App() {
  const { loadUser } = useAuthStore()

  // Load user session on app mount
  useEffect(() => {
    loadUser()
  }, [loadUser])

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/qf-callback" element={<QFCallback />} />

        {/* Protected routes - require auth + onboarding */}
        <Route
          path="/"
          element={<ProtectedRoute element={<Navigate to="/home" replace />} />}
        />

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
          element={<ProtectedRoute element={<div className="flex items-center justify-center min-h-screen">Create Circle</div>} />}
        />

        <Route
          path="/circle/join/:code"
          element={<ProtectedRoute element={<div className="flex items-center justify-center min-h-screen">Join Circle</div>} />}
        />

        <Route
          path="/progress"
          element={<ProtectedRoute element={<Progress />} />}
        />

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
