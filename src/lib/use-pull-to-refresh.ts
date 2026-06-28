// Pull-to-refresh — touch-only (mobile/PWA). Listens for a downward drag
// starting at scrollTop=0; once the pull crosses `threshold`, calls the
// refresh callback on release. Returns the live pull distance for any
// indicator the caller wants to render.

import { useEffect, useRef, useState } from 'react'

export interface PullState {
  pull: number       // current pull distance in px (0 = no pull)
  refreshing: boolean
}

export function usePullToRefresh(
  onRefresh: () => void | Promise<void>,
  threshold = 80,
): PullState {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)
  // Latest callback ref so the touch handlers always invoke the current one
  // (avoids stale closures when AppLayout re-creates triggerRouteRefresh on
  // route change).
  const cbRef = useRef(onRefresh)
  cbRef.current = onRefresh

  useEffect(() => {
    function onTouchStart(e: TouchEvent): void {
      // Only engage when the page is already at the very top — otherwise the
      // gesture is a regular scroll.
      if (window.scrollY > 0) {
        startY.current = null
        return
      }
      startY.current = e.touches[0]?.clientY ?? null
      pulling.current = false
    }
    function onTouchMove(e: TouchEvent): void {
      if (startY.current == null) return
      const y = e.touches[0]?.clientY ?? 0
      const delta = y - startY.current
      if (delta <= 0) {
        setPull(0)
        return
      }
      // Resistance: feels heavier the further you pull.
      const eased = Math.min(delta * 0.5, threshold * 1.5)
      pulling.current = true
      setPull(eased)
    }
    function onTouchEnd(): void {
      const shouldFire = pulling.current && pull >= threshold
      pulling.current = false
      startY.current = null
      if (!shouldFire) {
        setPull(0)
        return
      }
      setRefreshing(true)
      setPull(threshold)
      // Run the refresh and reset state once it completes. Always reset
      // even on error — leaving the spinner stuck forever is worse than
      // failing silently.
      const run = async (): Promise<void> => {
        try {
          await cbRef.current()
        } catch (err) {
          console.error('[pull-to-refresh] callback failed', err)
        } finally {
          setRefreshing(false)
          setPull(0)
        }
      }
      // 350ms minimum visible spinner so the user gets feedback the gesture
      // registered, even if the underlying refresh is instant.
      setTimeout(() => { void run() }, 350)
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [threshold, pull])

  return { pull, refreshing }
}
