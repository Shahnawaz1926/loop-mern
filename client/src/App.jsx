import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import Trends from './pages/Trends'
import Ask from './pages/Ask'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <Inbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trends"
          element={
            <ProtectedRoute>
               <Trends />
            </ProtectedRoute>
         }
       />
       <Route
        path="/ask"
         element={<ProtectedRoute>
          <Ask />
          </ProtectedRoute>}
        />

        <Route path="/" element={<Navigate to="/signup" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App