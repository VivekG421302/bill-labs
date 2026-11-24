import { useEffect, useMemo, useState } from 'react'
import BillForm from '../components/BillForm.jsx'
import BulkPanel from '../components/BulkPanel.jsx'
import LogoPanel from '../components/LogoPanel.jsx'
import Modal from '../components/Modal.jsx'
import PdfView from '../components/PdfView.jsx'
import { DEFAULT_LOGO } from '../cab/assets.js'
import { FIELDS, emptyBill, resolveFileBase, toInputTime } from '../cab/fields.js'
import { downloadOne, downloadZip } from '../cab/exporter.js'
import { friendly, usePage } from '../shell.js'
import { useStored } from '../cab/store.js'

function useWide(q = '(min-width: 1000px)') {
  const [on, setOn] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q), f = () => setOn(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [q])
  return on
}

const Chev = ({ dir }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'l' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
  </svg>
)

export default function CabBill() {
  const [stored, setLogo, logoErr] = useStored('billlabs.cab.logo', DEFAULT_LOGO)
  const logo = useMemo(() => ({ ...DEFAULT_LOGO, ...stored }), [stored])
  const [records, setRecords, recErr] = useStored('billlabs.cab.records', [])
  const [tab, setTab] = useState('single')
  const [bill, setBill] = useState(emptyBill)
  const [editingId, setEditingId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const wide = useWide()

  const fileBase = resolveFileBase(bill)

  const missing = () => {
    const m = FIELDS.filter((f) => f.required && !bill[f.key].trim()).map((f) => f.label)
    if (!bill.price.trim() && !bill.selectedPrice.trim()) m.push('Price')
    return m
  }
  const run = async (kind) => {
    const m = missing()
    if (m.length) return setMsg(`Please fill: ${m.join(', ')}.`)
    setMsg(''); setBusy(true)
    try { await downloadOne(bill, fileBase, kind, logo) } catch (e) { console.error(e); setMsg('Could not create the file. Please try again.') } finally { setBusy(false) }
  }
  // Open a saved bill in the form so it can be corrected.
  const editRecord = (r) => {
    // A name that simply follows the Ride ID stays automatic, so changing the Ride ID renames the file.
    const auto = resolveFileBase({ ...r.bill, fileName: '' })
    const isAuto = r.fileBase === auto || new RegExp(`^${auto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d+$`).test(r.fileBase)
    setBill({ ...emptyBill(), ...r.bill, rideTime: toInputTime(r.bill.rideTime), fileName: isAuto ? '' : r.fileBase })
    setEditingId(r.id); setPreview(null); setMsg(''); setTab('single')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const editing = records.find((r) => r.id === editingId)
  const saveEdit = () => {
    const m = missing()
    if (m.length) return setMsg(`Please fill: ${m.join(', ')}.`)
    const used = new Set(records.filter((r) => r.id !== editingId).map((r) => r.fileBase.toLowerCase()))
    const wanted = resolveFileBase(bill)
    let base = wanted, n = 2
    while (used.has(base.toLowerCase())) base = `${wanted}_${n++}`
    setRecords(records.map((r) => (r.id === editingId ? { ...r, bill: { ...bill }, fileBase: base } : r)))
    setBill(emptyBill()); setEditingId(null); setMsg(''); setTab('bulk')
  }
  const cancelEdit = () => { setBill(emptyBill()); setEditingId(null); setMsg('') }
  // What the shared navbar's Download window offers on this page.
  const dlBill = async (kind) => {
    const m = missing()
    if (m.length) { setTab('single'); throw friendly(`Please fill: ${m.join(', ')}.`) }
    await downloadOne(bill, fileBase, kind, logo)
  }
  usePage(() => {
    const items = []
    if (tab === 'single') {
      items.push(
        { group: 'This bill', label: 'PDF', desc: 'A4 document, ready to print or send', icon: 'file', run: () => dlBill('pdf') },
        { group: 'This bill', label: 'Word', desc: 'Editable .docx file', icon: 'file', run: () => dlBill('docx') },
      )
    }
    if (records.length) {
      const g = `All ${records.length} created bills`
      items.push(
        { group: g, label: 'PDFs (ZIP)', desc: 'One PDF per bill in one ZIP file', icon: 'zip', run: () => downloadZip(records, 'pdf', logo, `cab-bills-pdf-${Date.now()}.zip`) },
        { group: g, label: 'Word files (ZIP)', desc: 'One .docx per bill in one ZIP file', icon: 'zip', run: () => downloadZip(records, 'docx', logo, `cab-bills-docx-${Date.now()}.zip`) },
      )
    }
    return { downloads: items }
  })

  // arrows in the bill preview: step through the bills created from a CSV
  const previewIdx = preview && preview.id ? records.findIndex((r) => r.id === preview.id) : -1
  const stepPreview = (d) => { const n = records[previewIdx + d]; if (n) setPreview(n) }
  useEffect(() => {
    if (previewIdx < 0) return
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      const n = records[previewIdx + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0)]
      if (n && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); setPreview(n) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewIdx, records])

  const openPreview = () => {
    const m = missing()
    if (m.length) return setMsg(`Please fill: ${m.join(', ')}.`)
    setMsg(''); setPreview({ bill, fileBase })
  }

  return (
    <section className="cab">
      <h1>Cab bill</h1>
      {(logoErr || recErr) && <p className="error" role="alert">{logoErr || recErr}</p>}

      <LogoPanel logo={logo} setLogo={setLogo} />

      <div className="tabs" role="tablist" aria-label="How to fill the bill">
        <button role="tab" aria-selected={tab === 'single'} className={tab === 'single' ? 'tab on' : 'tab'} onClick={() => setTab('single')}>Fill by form</button>
        <button role="tab" aria-selected={tab === 'bulk'} className={tab === 'bulk' ? 'tab on' : 'tab'} onClick={() => setTab('bulk')}>
          Bulk from CSV{records.length > 0 && <span className="count">{records.length}</span>}
        </button>
      </div>

      {tab === 'single' ? (
        <div className={wide ? 'split' : ''}>
          <div className="card">
            {editingId && (
              <div className="banner" role="status">
                {editing ? <>Editing <strong>{editing.fileBase}</strong> from your list.</> : 'This bill is no longer in the list.'}
              </div>
            )}
            <BillForm bill={bill} setBill={setBill} fileBase={bill.fileName.trim() || bill.rideId.trim() ? fileBase : 'CAB_RECEIPT_<Ride ID>'} />
            {msg && <p className="error" role="alert">{msg}</p>}
            <div className="row actions">
              {!wide && <button type="button" className="btn" onClick={openPreview}>Preview PDF</button>}
              {editing && <button type="button" className="btn btn-primary" onClick={saveEdit}>Save changes to list</button>}
              <button type="button" className={editing ? 'btn' : 'btn btn-primary'} disabled={busy} onClick={() => run('pdf')}>Download PDF</button>
              <button type="button" className="btn" disabled={busy} onClick={() => run('docx')}>Download Word</button>
              <button type="button" className="btn btn-ghost" onClick={cancelEdit}>{editingId ? 'Cancel edit' : 'Clear form'}</button>
            </div>
          </div>
          {wide && (
            <aside className="card sticky" aria-label="Live preview">
              <h2>Preview</h2>
              <PdfView bill={bill} logo={logo} delay={350} />
            </aside>
          )}
        </div>
      ) : (
        <BulkPanel logo={logo} records={records} setRecords={setRecords} onPreview={(r) => setPreview(r)} />
      )}

      {preview && (
        <Modal
          title={preview.fileBase}
          onClose={() => setPreview(null)}
          nav={previewIdx >= 0 && records.length > 1 ? (
            <>
              <button type="button" className="btn btn-sm nav-btn" disabled={previewIdx <= 0} onClick={() => stepPreview(-1)} aria-label="Previous bill" title="Previous bill (left arrow)"><Chev dir="l" /></button>
              <span className="muted small" aria-live="polite">{previewIdx + 1} / {records.length}</span>
              <button type="button" className="btn btn-sm nav-btn" disabled={previewIdx >= records.length - 1} onClick={() => stepPreview(1)} aria-label="Next bill" title="Next bill (right arrow)"><Chev dir="r" /></button>
            </>
          ) : null}
          actions={<>
            <button type="button" className="btn" onClick={() => (preview.id ? editRecord(preview) : setPreview(null))}>Edit</button>
            <button type="button" className="btn btn-primary" onClick={() => downloadOne(preview.bill, preview.fileBase, 'pdf', logo)}>Download PDF</button>
            <button type="button" className="btn" onClick={() => downloadOne(preview.bill, preview.fileBase, 'docx', logo)}>Download Word</button>
          </>}
        >
          <PdfView bill={preview.bill} logo={logo} />
        </Modal>
      )}
    </section>
  )
}
