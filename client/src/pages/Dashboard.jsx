import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { getAnalyticsSummary } from '../lib/api'

const SENTIMENT_COLORS = ['#22c55e', '#6b7280', '#ef4444'] // green, gray, red
const THEME_COLOR = '#8b5cf6'

export default function Dashboard() {
  const { user, token, logout } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const result = await getAnalyticsSummary(token)
        setData(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">LOOP Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link to="/inbox" className="text-sm text-purple-400 hover:text-purple-300 transition">
              Feedback Inbox →
            </Link>

            <Link to="/trends" className="text-sm text-purple-400 hover:text-purple-300 transition">
            Trends →
           </Link>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition">
              Log out
            </button>
          </div>
        </div>
        <p className="text-gray-400 mb-8">
          Welcome, {user?.name} — <span className="text-purple-400">{user?.role}</span>
        </p>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded px-3 py-2 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading dashboard...</div>
        ) : data ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard label="Total Feedback" value={data.stats.total} />
              <StatCard label="% Negative" value={`${data.stats.negativePercent}%`} accent="text-red-400" />
              <StatCard label="New This Week" value={data.stats.newThisWeek} accent="text-purple-400" />
            </div>

            {/* Volume over time */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
              <h2 className="text-sm font-medium text-gray-300 mb-4">Feedback Volume — Last 30 Days</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.volumeOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                  <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 6 }} />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Sentiment breakdown */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-sm font-medium text-gray-300 mb-4">Sentiment Breakdown</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.sentimentBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {data.sentimentBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={SENTIMENT_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 6 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top themes */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-sm font-medium text-gray-300 mb-4">Top Themes</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.topThemes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} width={110} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 6 }} />
                    <Bar dataKey="count" fill={THEME_COLOR} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent = 'text-white' }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}