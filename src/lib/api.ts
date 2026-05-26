import type { Record, RecordsFile, SummaryResponse } from './types'

const BASE = '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
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
