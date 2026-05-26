import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { LayoutDashboard, ListTree, Users, Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import Dashboard from './routes/Dashboard'
import Transactions from './routes/Transactions'
import Participants from './routes/Participants'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ListTree, end: false },
  { to: '/participants', label: 'Participants', icon: Users, end: false },
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

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 md:px-6"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">edub · rentals</span>
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
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="rounded-md p-2 hover:bg-white/10"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/participants" element={<Participants />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav
        className="is-mobile fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t py-2"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--border-color)',
          paddingBottom: 'calc(8px + var(--safe-bottom))',
          backdropFilter: 'blur(12px)',
        }}
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs ${
                isActive ? 'opacity-100' : 'opacity-60'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
