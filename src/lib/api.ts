import type { Record, RecordsFile, SummaryResponse } from './types'

const BASE = '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: { [k: string]: string } = { ...(init?.headers as { [k: string]: string }) }
  // Only set JSON content-type when there's actually a body, otherwise
  // Fastify tries to parse an empty payload and rejects with
  // "Unexpected end of JSON input".
  if (init?.body != null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} — ${text}`)
  }
  return res.json() as Promise<T>
}

export function fetchRecords() {
  return req<RecordsFile>('/records')
}

export function fetchSummary() {
  return req<SummaryResponse>('/summary')
}

export function createRecord(record: Omit<Record, 'id'>) {
  return req<Record>('/records', {
    method: 'POST',
    body: JSON.stringify(record),
  })
}

export function updateRecord(id: string, patch: Partial<Omit<Record, 'id'>>) {
  return req<Record>(`/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export function deleteRecord(id: string) {
  return req<{ ok: true }>(`/records/${id}`, { method: 'DELETE' })
}
