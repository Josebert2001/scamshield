const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function analyze(text, lang, signal) {
  const res = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
    signal,
  })
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e }
  return res.json()
}
