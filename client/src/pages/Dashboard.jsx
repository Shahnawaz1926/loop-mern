import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">LOOP Dashboard</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Log out
        </button>
      </div>
      <p className="text-gray-300">
        Welcome, <span className="font-medium">{user?.name}</span> — role:{' '}
        <span className="text-purple-400">{user?.role}</span>
      </p>
    </div>
  )
}