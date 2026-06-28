import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { LayoutDashboard, Plus, ListTree, Sun, Moon, RefreshCw, History as HistoryIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import Overview from './routes/Overview'
import AddTransaction from './routes/AddTransaction'
import EditTransaction from './routes/EditTransaction'
import Transactions from './routes/Transactions'
import History from './routes/History'
import { useRecords } from './stores/records'
import { useEnsureStores } from './lib/use-ensure-stores'
import { usePullToRefresh } from './lib/use-pull-to-refresh'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end: boolean
  center?: boolean
}
const NAV: NavItem[] = [
  { to: '/', label: 'Aperçu', icon: LayoutDashboard, end: true },
  { to: '/add', label: 'Ajouter', icon: Plus, end: false, center: true },
  { to: '/transactions', label: 'Transactions', icon: ListTree, end: false },
]

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('edub-rentals.theme') as 'dark' | 'light' | null
    return stored ?? 'dark'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('edub-rentals.theme', theme)
  }, [theme])
  return { theme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) }
}

export default function App() {
  const { theme, toggle } = useTheme()
  const loading = useRecords(s => s.loading)

  // Lazy-load the records store on mount. Idempotent across re-renders.
  useEnsureStores(useRecords)

  // Pull-to-refresh: rentals only has one store, so the gesture re-fetches
  // records + summary unconditionally. usePullToRefresh awaits the promise
  // and clears its spinner when refresh resolves.
  const triggerRefresh = useCallback(() => useRecords.getState().refresh(), [])
  const { pull, refreshing } = usePullToRefresh(triggerRefresh)

  async function hardReload() {
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      } catch {
        // ignore
      }
    }
    if ('caches' in window) {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      } catch {
        // ignore
      }
    }
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Pull-to-refresh indicator — slides under the header, spins while
          refresh is in flight, disappears when it resolves. */}
      {(pull > 0 || refreshing) && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(56px + env(safe-area-inset-top))',
            left: '50%',
            transform: `translate(-50%, ${Math.min(pull - 40, 60)}px)`,
            zIndex: 30,
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 999,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            transition: refreshing ? 'transform 0.15s ease-out' : 'none',
          }}
        >
          <RefreshCw
            size={16}
            style={{
              color: 'var(--accent-primary)',
              transform: `rotate(${pull * 2}deg)`,
              animation: refreshing ? 'spin 1s linear infinite' : undefined,
            }}
          />
        </div>
      )}
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 md:px-8"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(14px)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight">edub · rentals</span>
          <span className="hidden text-xs opacity-50 md:inline">Libya Villa Business</span>
        </div>

        <nav className="is-desktop hidden items-center gap-1 md:flex">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <NavLink
            to="/history"
            aria-label="Historique"
            className={({ isActive }) =>
              `rounded-md p-2 hover:bg-white/10 ${isActive ? 'bg-white/10' : ''}`
            }
          >
            <HistoryIcon size={16} />
          </NavLink>
          <button
            onClick={hardReload}
            disabled={loading}
            aria-label="Hard refresh (vide le cache + reload complet)"
            title="Hard refresh — vide le cache, dégage le service worker, recharge la page"
            className="rounded-md p-2 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />
          </button>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-md p-2 hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main
        className="flex-1"
        style={{
          paddingLeft: 'var(--main-padding)',
          paddingRight: 'var(--main-padding)',
          paddingTop: '20px',
          paddingBottom: 'var(--main-padding-bottom)',
        }}
      >
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="/edit/:id" element={<EditTransaction />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav
        className="is-mobile fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--border-color)',
          paddingBottom: 'calc(8px + var(--safe-bottom))',
          paddingTop: '8px',
          backdropFilter: 'blur(14px)',
        }}
      >
        {NAV.map(({ to, label, icon: Icon, end, center }) =>
          center ? (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="flex flex-1 items-center justify-center"
              aria-label={label}
            >
              {({ isActive }) => (
                <div
                  className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition"
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#111418',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isActive
                      ? '0 8px 24px rgba(245,200,66,0.4)'
                      : '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <Icon size={26} />
                </div>
              )}
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] ${
                  isActive ? 'opacity-100' : 'opacity-50'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ),
        )}
      </nav>
    </div>
  )
}
