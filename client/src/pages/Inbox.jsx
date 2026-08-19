import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getFeedback, updateFeedbackStatus, uploadCSV, simulateChannel } from '../lib/api'

const STATUS_COLORS = {
  NEW: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  REVIEWED: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  ACTIONED: 'bg-green-500/20 text-green-300 border-green-500/40',
}

const SENTIMENT_COLORS = {
  POS: 'text-green-400',
  NEU: 'text-gray-400',
  NEG: 'text-red-400',
}

const CHANNELS = ['support_ticket', 'app_store', 'nps_survey', 'sales_call', 'community_post', 'social_mention']

export default function Inbox() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [channelFilter, setChannelFilter] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 15 }
      if (search) params.search = search
      if (channelFilter) params.channel = channelFilter
      if (sentimentFilter) params.sentiment = sentimentFilter
      if (statusFilter) params.status = statusFilter

      const data = await getFeedback(token, params)
      setItems(data.items)
      setPagination(data.pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, page, search, channelFilter, sentimentFilter, statusFilter])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    try {
      const result = await uploadCSV(token, file)
      setUploadResult(result)
      loadFeedback()
    } catch (err) {
      setError('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = '' // reset file input
    }
  }

  async function handleSimulate(channel) {
    try {
      await simulateChannel(token, channel)
      loadFeedback()
    } catch (err) {
      setError('Simulate failed: ' + err.message)
    }
  }

  async function handleStatusChange(id, newStatus) {
    setItems((prev) =>
      prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
    )
    try {
      await updateFeedbackStatus(token, id, newStatus)
    } catch (err) {
      setError('Failed to update status: ' + err.message)
      loadFeedback()
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    setPage(1)
    loadFeedback()
  }

  function handleFilterChange(setter, value) {
    setter(value)
    setPage(1) // reset to page 1 whenever a filter changes
  }

  function clearFilters() {
    setChannelFilter('')
    setSentimentFilter('')
    setStatusFilter('')
    setSearch('')
    setPage(1)
  }

  const hasActiveFilters = channelFilter || sentimentFilter || statusFilter || search

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Feedback Inbox</h1>
          <span className="text-gray-400 text-sm">{pagination.total} total items</span>
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Search feedback content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 rounded px-4 py-2 font-medium transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <label className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 text-sm cursor-pointer transition">
            {uploading ? 'Uploading...' : 'Upload CSV'}
            <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
          <button
            onClick={() => handleSimulate('app_store')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 text-sm transition"
          >
            Simulate App Store
          </button>
          <button
            onClick={() => handleSimulate('support_ticket')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 text-sm transition"
          >
            Simulate Support Tickets
          </button>
        </div>

        {uploadResult && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 text-sm rounded px-3 py-2 mb-4">
            Imported {uploadResult.imported}, failed {uploadResult.failed}
            {uploadResult.errors.length > 0 && (
              <ul className="mt-1 text-xs text-green-400">
                {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <select
            value={channelFilter}
            onChange={(e) => handleFilterChange(setChannelFilter, e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="">All channels</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sentimentFilter}
            onChange={(e) => handleFilterChange(setSentimentFilter, e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="">All sentiment</option>
            <option value="POS">Positive</option>
            <option value="NEU">Neutral</option>
            <option value="NEG">Negative</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="">All statuses</option>
            <option value="NEW">New</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="ACTIONED">Actioned</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-white transition underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading feedback...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-400 text-center py-12">No feedback items found.</div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-750 border-b border-gray-700 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Content</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Sentiment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b border-gray-750 hover:bg-gray-750/50 transition">
                    <td className="px-4 py-3 max-w-md">
                      <p className="truncate">{item.content}</p>
                      {item.customerLabel && (
                        <p className="text-gray-500 text-xs mt-0.5">{item.customerLabel}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{item.channel}</td>
                    <td className="px-4 py-3">
                      <span className={SENTIMENT_COLORS[item.sentiment] || 'text-gray-500'}>
                        {item.sentiment || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item._id, e.target.value)}
                        className={`text-xs rounded border px-2 py-1 bg-gray-800 cursor-pointer ${STATUS_COLORS[item.status]}`}
                      >
                        <option value="NEW">NEW</option>
                        <option value="REVIEWED">REVIEWED</option>
                        <option value="ACTIONED">ACTIONED</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded disabled:opacity-40 hover:bg-gray-700 transition text-sm"
            >
              Previous
            </button>
            <span className="text-gray-400 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded disabled:opacity-40 hover:bg-gray-700 transition text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}