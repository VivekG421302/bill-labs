import { useMemo, useState } from 'react'
import { parseBillCsv, templateCsv } from '../cab/csv.js'
import { DEFAULT_PREFIX, displayPrice, sanitizeFileName } from '../cab/fields.js'
import { downloadOne, downloadText, downloadZip } from '../cab/exporter.js'

const PAGE_SIZE = 50

async function readText(file) {
  const buf = await file.arrayBuffer()
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf) }
  catch { return new TextDecoder('windows-1252').decode(buf) } // Excel "CSV (Comma delimited)"
}

export default function BulkPanel({ logo, records, setRecords, stamp, setStamp, onPreview }) {
  const [parsed, setParsed] = useState(null)
  const [source, setSource] = useState('')
  const [readErr, setReadErr] = useState('')
  const [busy, setBusy] = useState('')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [drag, setDrag] = useState(false)

  const load = async (file) => {
    if (!file) return
    setReadErr(''); setParsed(null)
    try { setParsed(parseBillCsv(await readText(file))); setSource(file.name) }
    catch { setReadErr('That file could not be read as a CSV.') }
  }

  const create = () => {
    const t = new Date(stamp).getTime()
    const epoch = Number.isFinite(t) ? t : Date.now()
    const used = new Set(records.map((r) => r.fileBase.toLowerCase()))
    const made = parsed.rows.map(({ bill }, i) => {
      const wanted = sanitizeFileName(bill.fileName) || `${DEFAULT_PREFIX}_${epoch + i}`
      let base = wanted, n = 2
      while (used.has(base.toLowerCase())) base = `${wanted}_${n++}`
      used.add(base.toLowerCase())
      return { id: `${epoch}-${i}-${Math.random().toString(36).slice(2, 7)}`, bill, fileBase: base }
    })
    setRecords([...made, ...records])
    setParsed(null); setSource('')
  }

  const remove = (id) => setRecords(records.filter((r) => r.id !== id))
  const removeAll = () => window.confirm(`Delete all ${records.length} bills from this list?`) && setRecords([])

  const zip = async (kind) => {
    setBusy(`Preparing 0 of ${records.length}…`)
    try {
      await downloadZip(records, kind, logo, `cab-bills-${kind}-${Date.now()}.zip`, (d, n) => setBusy(`Preparing ${d} of ${n}…`))
    } finally { setBusy('') }
  }

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? records.filter((r) => `${r.fileBase} ${r.bill.customerName} ${r.bill.rideId}`.toLowerCase().includes(s)) : records
  }, [records, q])

  const blocking = parsed && parsed.missingColumns.length > 0

  return (
    <div className="bulk">
      <section className="card">
        <h2>Create bills from a CSV</h2>
        <ol className="steps">
          <li>
            Download the template. It has every column header filled in, plus one example row.
            <div><button type="button" className="btn" onClick={() => downloadText(templateCsv(), 'cab-bill-template.csv')}>Download template CSV</button></div>
          </li>
          <li>Fill one row per bill. Time of ride can be like <code>2026-10-30 07:16</code> or <code>30/10/2026 7:16 AM</code>. Leave Description and Remark empty to use the standard wording.</li>
          <li>Upload the file here.</li>
        </ol>
        <label
          className={`drop ${drag ? 'drop-on' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files?.[0]) }}
        >
          <input type="file" accept=".csv,text/csv" onChange={(e) => { load(e.target.files?.[0]); e.target.value = '' }} />
          <span><strong>Choose a CSV file</strong> or drop it here</span>
        </label>
        {readErr && <p className="error" role="alert">{readErr}</p>}

        {parsed && (
          <div className="parsed" aria-live="polite">
            <p><strong>{source}</strong>: {parsed.rows.length} of {parsed.total} rows are ready.</p>
            {blocking && <p className="error">These columns are missing: {parsed.missingColumns.join(', ')}. Use the template headers.</p>}
            {parsed.unknown.length > 0 && <p className="muted small">Ignored columns: {parsed.unknown.join(', ')}</p>}
            {parsed.skipped.length > 0 && (
              <details className="skipped" open={parsed.skipped.length <= 5}>
                <summary>{parsed.skipped.length} rows will be skipped</summary>
                <ul>{parsed.skipped.slice(0, 200).map((s) => <li key={s.line}>Row {s.line}: {s.reason}</li>)}</ul>
              </details>
            )}
            <div className="row">
              <div className="field inline">
                <label htmlFor="b-stamp">Timestamp date for file names</label>
                <input id="b-stamp" type="datetime-local" value={stamp} onChange={(e) => setStamp(e.target.value)} />
              </div>
              <button type="button" className="btn btn-primary" disabled={blocking || !parsed.rows.length} onClick={create}>
                Create {parsed.rows.length} bills
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setParsed(null)}>Cancel</button>
            </div>
            <p className="hint">Rows without a File Name are saved as <code>{DEFAULT_PREFIX}_&lt;timestamp&gt;</code>, each one millisecond apart so names never clash.</p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="list-head">
          <h2>Created bills <span className="count">{records.length}</span></h2>
          {records.length > 0 && (
            <div className="row">
              <button type="button" className="btn" disabled={!!busy} onClick={() => zip('pdf')}>All PDFs (ZIP)</button>
              <button type="button" className="btn" disabled={!!busy} onClick={() => zip('docx')}>All Word (ZIP)</button>
              <button type="button" className="btn btn-danger" disabled={!!busy} onClick={removeAll}>Delete all</button>
            </div>
          )}
        </div>
        {busy && <p className="muted" role="status">{busy}</p>}
        {records.length === 0 ? (
          <p className="empty">No bills yet. Upload a CSV above and they will be listed here.</p>
        ) : (
          <>
            <input type="search" className="search" placeholder="Search by name, customer or ride ID" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE_SIZE) }} aria-label="Search bills" />
            <ul className="records">
              {list.slice(0, shown).map((r) => (
                <li key={r.id} className="record">
                  <div className="record-main">
                    <span className="record-name">{r.fileBase}</span>
                    <span className="record-meta">{r.bill.customerName} · {r.bill.rideId} · {displayPrice(r.bill)}</span>
                  </div>
                  <div className="record-actions">
                    <button type="button" className="btn btn-sm" onClick={() => onPreview(r)}>Preview</button>
                    <button type="button" className="btn btn-sm" onClick={() => downloadOne(r.bill, r.fileBase, 'pdf', logo)}>PDF</button>
                    <button type="button" className="btn btn-sm" onClick={() => downloadOne(r.bill, r.fileBase, 'docx', logo)}>Word</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(r.id)} aria-label={`Delete ${r.fileBase}`}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
            {list.length === 0 && <p className="empty">Nothing matches “{q}”.</p>}
            {list.length > shown && <button type="button" className="btn" onClick={() => setShown(shown + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, list.length - shown)} more</button>}
          </>
        )}
      </section>
    </div>
  )
}
