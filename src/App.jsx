import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'

// The cab bill tool (PDF/Word engines, fonts) loads only when it is opened.
const CabBill = lazy(() => import('./pages/CabBill.jsx'))

// The navbar (back, printers, download, menu) is the shared shell in public/shell/shell.js,
// the same one the Petrol and Uber pages use. Pages tell it what they offer with usePage().
export default function App() {
  return (
    <div className="shell">
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
