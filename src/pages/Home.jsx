import { Link } from 'react-router-dom'
import { PETROL_URL } from '../App.jsx'

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
      </div>
    </section>
  )
}
