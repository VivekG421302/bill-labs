import Papa from 'papaparse'
import { FIELDS, emptyBill, norm } from './fields.js'

// Header lookup: normalised header text -> field key
const HEADER_MAP = new Map()
FIELDS.forEach((f) => [f.csv, f.key, f.label, ...(f.aliases || [])].forEach((n) => HEADER_MAP.set(norm(n), f.key)))

const SAMPLE = {
  customerName: 'Rinku', rideId: 'RD17933239627951099', driverName: 'Alataf Husen', vehicleNumber: 'MH01EW7839',
  vehicleMode: 'Car', rideTime: '2026-10-30 07:16', price: '831', selectedPrice: '831',
  from: '3, Ram Mandir Rd, Dhamankar Naka, Padma Nagar, Bhiwandi, Maharashtra 421305, India',
  to: '35 Chowpatty sea face 23, Dr N A Purandare Marg, above jain temple, Charni Road East, Chowpatty, Girgaon, Mumbai, Maharashtra 400007, India',
  fileName: '', description: '', remark: '',
}

// UTF-8 with BOM so Excel shows the rupee sign and accents correctly.
export function templateCsv() {
  return '\ufeff' + Papa.unparse({ fields: FIELDS.map((f) => f.csv), data: [FIELDS.map((f) => SAMPLE[f.key])] }, { newline: '\r\n' })
}

export function parseBillCsv(text) {
  const res = Papa.parse(text.replace(/^\ufeff/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => norm(h) })
  const present = new Set()
  const unknown = []
  ;(res.meta.fields || []).forEach((h) => (HEADER_MAP.has(h) ? present.add(HEADER_MAP.get(h)) : h && unknown.push(h)))
  const missingColumns = FIELDS.filter((f) => f.required && !present.has(f.key)).map((f) => f.csv)
  if (!present.has('price') && !present.has('selectedPrice')) missingColumns.push('Price or SelectedPrice')

  const rows = [], skipped = []
  res.data.forEach((raw, i) => {
    const line = i + 2
    const bill = emptyBill()
    bill.vehicleMode = ''
    for (const [h, v] of Object.entries(raw)) {
      const key = HEADER_MAP.get(h)
      if (key) bill[key] = String(v ?? '').trim()
    }
    const need = FIELDS.filter((f) => f.required && !bill[f.key]).map((f) => f.label)
    if (!bill.price && !bill.selectedPrice) need.push('Price')
    if (need.length) skipped.push({ line, reason: `missing ${need.join(', ')}` })
    else rows.push({ line, bill })
  })
  return { rows, skipped, missingColumns, unknown, total: res.data.length }
}
