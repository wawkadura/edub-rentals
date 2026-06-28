// Page-level helper: call ensureLoaded() on each given store the first time
// the page mounts. Idempotent — re-renders, re-mounts, and concurrent calls
// are safe (each store's ensureLoaded short-circuits when loaded/loading).
//
// Usage in a route component:
//   useEnsureStores(useBudgetStore, useRevenusStore)

import { useEffect } from 'react'

export interface LazyStore {
  getState: () => { ensureLoaded: () => Promise<unknown>; refresh?: () => Promise<unknown> }
}

export function useEnsureStores(...stores: LazyStore[]): void {
  useEffect(() => {
    for (const s of stores) {
      s.getState().ensureLoaded().catch(err => console.error('[ensureLoaded] failed', err))
    }
    // stores are zustand singletons → identity is stable; safe to omit deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// Background-preload a list of stores once the browser is idle. Use for
// secondary domains the user will likely visit next.
export function preloadStores(...stores: LazyStore[]): void {
  const trigger = (): void => {
    for (const s of stores) {
      s.getState().ensureLoaded().catch(() => { /* preload failures are non-fatal */ })
    }
  }
  if (typeof window === 'undefined') return
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(trigger, { timeout: 2000 })
  } else {
    setTimeout(trigger, 800)
  }
}
