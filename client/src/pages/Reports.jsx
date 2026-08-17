import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { generateReport, getReports, getReportById } from '../lib/api'

export default function Reports() {
  const { token } = useAuth()
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    setLoading(true)
    try {
      const data = await getReports(token)
      setReports(data.reports)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const data = await generateReport(token, 30)
      setSelectedReport(data.report)
      loadReports()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleViewReport(id) {
    try {
      const data = await getReportById(token, id)
      setSelectedReport(data.report)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Voice of Customer Reports</h1>
          <Link to="/dashboard" className="text-sm text-purple-400 hover:text-purple-300 transition">
            ← Dashboard
          </Link>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded px-4 py-2 font-medium transition mb-6"
        >
          {generating ? 'Generating (this takes ~10s)...' : 'Generate New Report (Last 30 Days)'}
        </button>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Past Reports</h2>
            {loading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : reports.length === 0 ? (
              <p className="text-gray-500 text-sm">No reports yet.</p>
            ) : (
              <div className="space-y-2">
                {reports.map((r) => (
                  <button
                    key={r._id}
                    onClick={() => handleViewReport(r._id)}
                    className="w-full text-left bg-gray-800 border border-gray-700 hover:border-purple-500 rounded px-3 py-2 text-xs transition"
                  >
                    {new Date(r.createdAt).toLocaleDateString()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="col-span-2">
            {selectedReport ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6" id="report-content">
                <h2 className="font-bold text-lg mb-1">{selectedReport.title}</h2>
                <p className="text-gray-500 text-xs mb-4">{selectedReport.contentJson.periodLabel}</p>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-gray-750 rounded p-3 text-center">
                    <p className="text-xl font-bold">{selectedReport.contentJson.total}</p>
                    <p className="text-xs text-gray-400">Total Items</p>
                  </div>
                  <div className="bg-gray-750 rounded p-3 text-center">
                    <p className="text-xl font-bold text-green-400">{selectedReport.contentJson.sentimentPositive}</p>
                    <p className="text-xs text-gray-400">Positive</p>
                  </div>
                  <div className="bg-gray-750 rounded p-3 text-center">
                    <p className="text-xl font-bold text-red-400">{selectedReport.contentJson.sentimentNegative}</p>
                    <p className="text-xs text-gray-400">Negative</p>
                  </div>
                </div>

                <h3 className="text-sm font-medium text-gray-300 mb-2">Executive Summary</h3>
                <p className="text-sm text-gray-300 mb-5">{selectedReport.contentJson.executiveSummary}</p>

                <h3 className="text-sm font-medium text-gray-300 mb-2">Top Themes</h3>
                <div className="flex flex-wrap gap-2 mb-5">
                  {selectedReport.contentJson.topThemes.map((t) => (
                    <span key={t.name} className="text-xs bg-purple-600/20 text-purple-300 border border-purple-600/40 rounded px-2 py-1">
                      {t.name} ({t.count})
                    </span>
                  ))}
                </div>

                <h3 className="text-sm font-medium text-gray-300 mb-2">Notable Quotes</h3>
                <div className="space-y-1 mb-5">
                  {selectedReport.contentJson.quotes.map((q, i) => (
                    <p key={i} className="text-xs text-gray-400 italic">"{q}"</p>
                  ))}
                </div>

                <h3 className="text-sm font-medium text-gray-300 mb-2">Recommended Actions</h3>
                <ul className="list-disc list-inside space-y-1">
                  {selectedReport.contentJson.recommendedActions.map((a, i) => (
                    <li key={i} className="text-sm text-gray-300">{a}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center py-12 border border-dashed border-gray-700 rounded-lg">
                Select a report or generate a new one
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}