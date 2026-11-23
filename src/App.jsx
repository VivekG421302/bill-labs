import { Suspense, lazy, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'

// The cab bill tool (PDF/Word engines, fonts) loads only when it is opened.
const CabBill = lazy(() => import('./pages/CabBill.jsx'))

// The petrol and Uber bill tools are standalone pages (public/petrol-bill, public/uber-bill), outside the React router.
import { PETROL_URL, UBER_URL } from './links.js'
export { PETROL_URL, UBER_URL }

const Sun = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const Moon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
  </svg>
)

// Icon-only theme switch: shows the sun while dark (tap for light) and the moon while light.
function ThemeToggle() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme)
  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('billlabs.theme', next) } catch { /* theme just won't persist */ }
    setTheme(next)
  }
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  return (
    <button type="button" className="theme-btn" onClick={flip} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  )
}

export default function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand" end>
          Bill Labs
        </NavLink>
        <nav className="topnav" aria-label="Bill types">
          <NavLink to="/cab-bill">Cab bill</NavLink>
          <a href={PETROL_URL}>Petrol bill</a>
          <a href={UBER_URL}>Uber bill</a>
          <ThemeToggle />
        </nav>
      </header>
      <main className="main">
        <Suspense fallback={<p className="muted">Loading…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cab-bill" element={<CabBill />} />
          <Route path="*" element={<Home />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  )
}
