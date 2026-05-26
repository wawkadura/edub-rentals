import { create } from 'zustand'
import type { Record, SummaryResponse } from '../lib/types'
import {
  fetchRecords as apiFetchRecords,
  fetchSummary as apiFetchSummary,
  createRecord as apiCreate,
  updateRecord as apiUpdate,
  deleteRecord as apiDelete,
} from '../lib/api'

interface RecordsState {
  records: Record[]
  summary: SummaryResponse | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  add: (r: Omit<Record, 'id'>) => Promise<Record>
  update: (id: string, patch: Partial<Omit<Record, 'id'>>) => Promise<Record>
  remove: (id: string) => Promise<void>
}

export const useRecords = create<RecordsState>((set, get) => ({
  records: [],
  summary: null,
  loading: false,
  error: null,

  async refresh() {
    set({ loading: true, error: null })
    try {
      const [r, s] = await Promise.all([apiFetchRecords(), apiFetchSummary()])
      set({ records: r.records, summary: s, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  async add(record) {
    const created = await apiCreate(record)
    await get().refresh()
    return created
  },

  async update(id, patch) {
    const updated = await apiUpdate(id, patch)
    await get().refresh()
    return updated
  },

  async remove(id) {
    await apiDelete(id)
    await get().refresh()
  },
}))
