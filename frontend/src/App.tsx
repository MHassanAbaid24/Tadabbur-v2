import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Auth from './pages/Auth'

interface ProtectedRouteProps {
  element: React.ReactNode
}

function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
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
        <Route path="/auth" element={<Auth />} />

        {/* Redirect home to appropriate page based on auth status */}
        <Route
          path="/"
          element={
            <ProtectedRoute
              element={<div className="flex items-center justify-center min-h-screen">Home</div>}
            />
          }
        />

        {/* Protected routes - Phase 3+ will populate these */}
        <Route
          path="/home"
          element={<ProtectedRoute element={<div className="flex items-center justify-center min-h-screen">Home Page</div>} />}
        />

        <Route
          path="/journal"
          element={<ProtectedRoute element={<div className="flex items-center justify-center min-h-screen">Journal Page</div>} />}
        />

        <Route
          path="/circle"
          element={<ProtectedRoute element={<div className="flex items-center justify-center min-h-screen">Circle Page</div>} />}
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
          element={<ProtectedRoute element={<div className="flex items-center justify-center min-h-screen">Progress Page</div>} />}
        />

        <Route
          path="/onboarding"
          element={<ProtectedRoute element={<div className="flex items-center justify-center min-h-screen">Onboarding</div>} />}
        />

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Router>
  )
}
