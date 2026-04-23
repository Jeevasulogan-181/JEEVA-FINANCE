import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AuthPage   from './pages/AuthPage'
import Dashboard  from './pages/Dashboard'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#FAF3DC]">
      <div className="spinner" />
    </div>
  )
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/*"    element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
