import { useEffect, useMemo, useState } from 'react'
import BillForm from '../components/BillForm.jsx'
import BulkPanel from '../components/BulkPanel.jsx'
import LogoPanel from '../components/LogoPanel.jsx'
import Modal from '../components/Modal.jsx'
import PdfView from '../components/PdfView.jsx'
import { DEFAULT_LOGO } from '../cab/assets.js'
import { FIELDS, emptyBill, resolveFileBase, toInputTime } from '../cab/fields.js'
import { downloadOne } from '../cab/exporter.js'
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
