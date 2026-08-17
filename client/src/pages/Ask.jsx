import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { askLoop } from '../lib/api'

export default function Ask() {
  const { token } = useAuth()
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState([]) // [{ question, answer, sources }]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError('')
    const q = question
    setQuestion('')
    try {
      const result = await askLoop(token, q)
      setHistory((prev) => [...prev, { question: q, answer: result.answer, sources: result.sources }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Ask LOOP</h1>
          <Link to="/dashboard" className="text-sm text-purple-400 hover:text-purple-300 transition">
            ← Dashboard
          </Link>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Ask plain-English questions about your customer feedback. Answers are grounded in real feedback items.
        </p>

        <div className="space-y-6 mb-6">
          {history.length === 0 && !loading && (
            <p className="text-gray-500 text-sm italic">
              Try: "What are users saying about onboarding?" or "Any complaints about billing?"
            </p>
          )}
          {history.map((entry, i) => (
            <div key={i} className="space-y-2">
              <div className="bg-purple-600/20 border border-purple-600/40 rounded-lg px-4 py-2 inline-block">
                <p className="text-sm">{entry.question}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-200 text-sm mb-3">{entry.answer}</p>
                {entry.sources.length > 0 && (
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <p className="text-xs text-gray-500 mb-2">Sources:</p>
                    <div className="space-y-1">
                      {entry.sources.map((s) => (
                        <p key={s.id} className="text-xs text-gray-400">
                          · "{s.content}" <span className="text-gray-600">({s.channel})</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Thinking...</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 sticky bottom-4">
          <input
            type="text"
            placeholder="Ask a question about your feedback..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded px-4 py-2 font-medium transition"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  )
}