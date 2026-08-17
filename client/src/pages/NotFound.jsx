import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-gray-400 mb-4">Page not found.</p>
        <Link to="/dashboard" className="text-purple-400 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}