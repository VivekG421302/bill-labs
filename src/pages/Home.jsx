import { Link } from 'react-router-dom'
import { PETROL_URL, UBER_URL } from '../links.js'

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const CarIcon = () => (
  <Icon>
    <path d="M5 17H3v-5l2-5a2 2 0 011.9-1.3h10.2A2 2 0 0119 7l2 5v5h-2" />
    <path d="M3 12h18" /><circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" /><path d="M9.5 17h5" />
  </Icon>
)
const FuelIcon = () => (
  <Icon>
    <path d="M14 13h2a2 2 0 012 2v2a2 2 0 004 0v-7a2 2 0 00-.6-1.4L18 5" />
    <path d="M14 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16" /><path d="M2 21h13M3 9h11" />
  </Icon>
)
const PinIcon = () => (
  <Icon>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
  </Icon>
)
const Arrow = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const TOOLS = [
  {
    key: 'cab', title: 'Cab bill', tone: 'amber', Ico: CarIcon, to: '/cab-bill',
    body: 'Cab ride receipts as clean A4 documents. Fill one in a form, or turn a CSV into hundreds.',
    tags: ['PDF', 'Word', 'CSV bulk', 'ZIP of all'],
  },
  {
    key: 'petrol', title: 'Petrol bill', tone: 'green', Ico: FuelIcon, href: PETROL_URL,
    body: 'Pump bills in small or big style. Prints straight to a Bluetooth thermal printer that reconnects by itself.',
    tags: ['Thermal print', 'Progress bar', 'CSV bulk', 'PNG image'],
  },
  {
    key: 'uber', title: 'Uber bill', tone: 'blue', Ico: PinIcon, href: UBER_URL,
    body: 'Ride receipts with route map, driver and fare. Flip through many receipts one by one with arrows.',
    tags: ['Route map', 'Print / PDF', 'CSV bulk', 'Logo editor'],
  },
]

const STEPS = [
  { n: '1', t: 'Pick a bill type', d: 'Cab, petrol or Uber. Each one remembers your logo and settings.' },
  { n: '2', t: 'Fill one or upload a CSV', d: 'Use the form for a single bill, or the template CSV for as many as you need.' },
  { n: '3', t: 'Print or download', d: 'PDF, Word, image, ZIP of everything, or a thermal printer, one bill after another.' },
]

function Card({ tool }) {
  const body = (
    <>
      <span className="tool-ico" aria-hidden="true"><tool.Ico /></span>
      <span className="tool-title">{tool.title}</span>
      <span className="tool-body">{tool.body}</span>
      <span className="tool-tags" aria-hidden="true">{tool.tags.map((t) => <span key={t}>{t}</span>)}</span>
      <span className="tool-go">Open {tool.title} <Arrow /></span>
    </>
  )
  const cls = `tool tone-${tool.tone}`
  return tool.to
    ? <Link to={tool.to} className={cls}>{body}</Link>
    : <a href={tool.href} className={cls}>{body}</a>
}

export default function Home() {
  return (
    <div className="home2">
      <section className="hero">
        <p className="eyebrow">Bill Labs</p>
        <h1>Make any bill in seconds.</h1>
        <p className="lead">
          Pick a tool, fill one bill or upload a CSV for hundreds, then print it, save it as a PDF, Word file or image,
          or send it to your thermal printer.
        </p>
      </section>

      <section aria-labelledby="tools-h">
        <h2 id="tools-h" className="sr-only">Bill tools</h2>
        <div className="tools">
          {TOOLS.map((t) => <Card key={t.key} tool={t} />)}
        </div>
      </section>

      <section className="how" aria-labelledby="how-h">
        <h2 id="how-h">How it works</h2>
        <ol className="how-steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="how-n" aria-hidden="true">{s.n}</span>
              <span className="how-t">{s.t}</span>
              <span className="how-d">{s.d}</span>
            </li>
          ))}
        </ol>
      </section>

      <ul className="assure">
        <li>Your bills and settings are saved only in this browser.</li>
        <li>One light / dark theme for every page.</li>
        <li>Many bills from a CSV? Step through them one by one with the arrows.</li>
      </ul>
    </div>
  )
}
