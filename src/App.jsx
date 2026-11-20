import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import CabBill from './pages/CabBill.jsx'

// The petrol bill tool is a standalone page kept exactly as it was
// (public/petrol-bill). It lives on its own route, outside the React router.
export const PETROL_URL = `${import.meta.env.BASE_URL}petrol-bill/`

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
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cab-bill" element={<CabBill />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  )
}
