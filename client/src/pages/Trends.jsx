import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getThemeTrends, getThemeFeedback } from '../lib/api'

export default function Trends() {
  const { token } = useAuth()
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [themeItems, setThemeItems] = useState([])
  const [drillLoading, setDrillLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getThemeTrends(token)
        setTrends(data.trends)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function handleThemeClick(theme) {
    setSelectedTheme(theme)
    setDrillLoading(true)
    try {
      const data = await getThemeFeedback(token, theme.themeId, { limit: 10 })
      setThemeItems(data.items)
    } catch (err) {
      setError(err.message)
    } finally {
      setDrillLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Theme Trends</h1>
          <Link to="/dashboard" className="text-sm text-purple-400 hover:text-purple-300 transition">
            ← Dashboard
          </Link>
        </div>
        <p className="text-gray-400 text-sm mb-6">Last 14 days vs. previous 14 days</p>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading trends...</div>
        ) : (
          <div className="space-y-3">
            {trends.map((theme) => (
              <button
                key={theme.themeId}
                onClick={() => handleThemeClick(theme)}
                className={`w-full text-left bg-gray-800 border rounded-lg p-4 transition hover:border-purple-500 ${
                  selectedTheme?.themeId === theme.themeId ? 'border-purple-500' : 'border-gray-700'
                }`}
              >
                  <div className="flex justify-between items-center flex-wrap gap-2">
               <div className="flex items-center gap-2 flex-wrap">
             <span className="font-medium">{theme.name}</span>
             {theme.isSpike && (
            <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/40 rounded px-2 py-0.5 whitespace-nowrap">
              Spiking
              </span>
        )}
  </div>
  <div className="text-sm text-gray-400">
                    {theme.currentCount} items
                    {theme.percentChange !== null && (
                      <span className={theme.percentChange >= 0 ? 'text-red-400 ml-2' : 'text-green-400 ml-2'}>
                        {theme.percentChange >= 0 ? '+' : ''}{theme.percentChange}%
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedTheme && (
          <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h2 className="font-medium mb-4">Feedback for: {selectedTheme.name}</h2>
            {drillLoading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : themeItems.length === 0 ? (
              <p className="text-gray-400 text-sm">No items found.</p>
            ) : (
              <div className="space-y-2">
                {themeItems.map((item) => (
                  <div key={item._id} className="text-sm border-b border-gray-750 pb-2">
                    <p className="text-gray-200">{item.content}</p>
                    <p className="text-gray-500 text-xs mt-1">{item.channel} · {new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}