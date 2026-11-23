import { Link } from 'react-router-dom'
import { PETROL_URL, UBER_URL } from '../App.jsx'

export default function Home() {
  return (
    <section className="home">
      <h1>Which bill do you need today?</h1>
      <div className="home-grid">
        <Link to="/cab-bill" className="home-card">
          <span className="home-card-title">Cab bill</span>
          <span className="home-card-body">
            Fill one receipt in a form or generate hundreds from a CSV. Download each as PDF or Word.
          </span>
        </Link>
        <a href={PETROL_URL} className="home-card">
          <span className="home-card-title">Petrol bill</span>
          <span className="home-card-body">The existing petrol pump bill printer.</span>
        </a>
        <a href={UBER_URL} className="home-card">
          <span className="home-card-title">Uber bill</span>
          <span className="home-card-body">
            Ride receipts with route map, driver and fare details. Make one or many from a CSV, then print or save as PDF.
          </span>
        </a>
      </div>
    </section>
  )
}
