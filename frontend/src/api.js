const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function handle(res) {
  let body
  try {
    body = await res.json()
  } catch {
    throw new Error(`Server returned an unreadable response (status ${res.status}).`)
  }
  if (!res.ok) {
    const detail = body?.detail || body?.error || `Request failed (status ${res.status}).`
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return body
}

export async function analyzeCall({ transcript, criteria, callTitle, responseLanguage = 'auto', saveToHistory = true }) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      criteria: criteria && criteria.length ? criteria : null,
      call_title: callTitle || null,
      response_language: responseLanguage,
      save_to_history: saveToHistory,
    }),
  })
  return handle(res)
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/api/history`)
  return handle(res)
}

export async function deleteHistoryItem(id) {
  const res = await fetch(`${API_BASE}/api/history/${id}`, { method: 'DELETE' })
  return handle(res)
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`)
  return handle(res)
}
