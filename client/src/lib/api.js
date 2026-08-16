const API_URL = import.meta.env.VITE_API_URL

export async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong')
  }
  return data
}

export function getFeedback(token, params = {}) {
  const query = new URLSearchParams(params).toString()
  return apiRequest(`/api/feedback?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function updateFeedbackStatus(token, id, status) {
  return apiRequest(`/api/feedback/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  })
}

export function getAnalyticsSummary(token) {
  return apiRequest('/api/analytics/summary', {
    headers: { Authorization: `Bearer ${token}` },
  })
}