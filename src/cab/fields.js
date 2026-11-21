// Field definitions, defaults and formatters for the cab bill.

export const DEFAULT_DESCRIPTION =
  'This document is issued on request by the passenger. Rapido does not collect any fee/commission from passengers and shall not issue tax invoices to the passengers under this segment. The document may be used for all official / reimbursement purposes.'
export const DEFAULT_REMARK =
  '*Selected Price refers to the initial price decided between User and Drivers from the estimated price range'

// key = internal name, csv = header written to the template CSV,
// aliases = other header spellings accepted on upload (compared after normalising).
export const FIELDS = [
  { key: 'customerName', csv: 'CustomerName', label: 'Customer name', required: true, aliases: ['customer', 'name', 'passenger', 'passengername'] },
  { key: 'rideId', csv: 'RideID', label: 'Ride ID', required: true, aliases: ['rideno', 'bookingid'] },
  { key: 'driverName', csv: 'DriverName', label: 'Driver name', aliases: ['driver', 'captain', 'captainname'] },
  { key: 'vehicleNumber', csv: 'VehicleNumber', label: 'Vehicle number', aliases: ['vehicleno', 'vehicle', 'regnumber', 'registrationnumber'] },
  { key: 'vehicleMode', csv: 'ModeOfVehicle', label: 'Mode of vehicle', aliases: ['mode', 'vehicletype', 'vehiclemode'] },
  { key: 'rideTime', csv: 'TimeOfRide', label: 'Time of ride', aliases: ['ridetime', 'datetime', 'time', 'date'] },
  { key: 'price', csv: 'Price', label: 'Price', aliases: ['amount', 'fare'] },
  { key: 'selectedPrice', csv: 'SelectedPrice', label: 'Selected price', aliases: ['selprice'] },
  { key: 'from', csv: 'FromLocation', label: 'From location', required: true, aliases: ['from', 'pickup', 'pickuplocation', 'source'] },
  { key: 'to', csv: 'ToLocation', label: 'To location', required: true, aliases: ['to', 'drop', 'droplocation', 'destination'] },
  { key: 'fileName', csv: 'FileName', label: 'File name', aliases: ['filename', 'name_of_file'] },
  { key: 'description', csv: 'Description', label: 'Description', aliases: ['desc'] },
  { key: 'remark', csv: 'Remark', label: 'Remark', aliases: ['remarks', 'note'] },
]

export const emptyBill = () => ({
  customerName: '', rideId: '', driverName: '', vehicleNumber: '', vehicleMode: 'Car',
  rideTime: '', price: '', selectedPrice: '', from: '', to: '', fileName: '',
  description: '', remark: '',
})

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ordinal = (n) => {
  const t = n % 100
  if (t >= 11 && t <= 13) return 'th'
  return { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'
}

export function formatDate(d) {
  let h = d.getHours()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${ordinal(d.getDate())} ${d.getFullYear()}, ${h}:${mm} ${ap}`
}

const ALREADY = /^[A-Z][a-z]{2} \d{1,2}(st|nd|rd|th) \d{4},? \d{1,2}:\d{2} ?[AP]M$/i

function build(y, mo, d, hh, mi, ap) {
  y = +y; mo = +mo; d = +d; hh = +(hh || 0); mi = +(mi || 0)
  if (ap) { const p = ap.toUpperCase(); if (p === 'PM' && hh < 12) hh += 12; if (p === 'AM' && hh === 12) hh = 0 }
  if (y < 100) y += 2000
  const dt = new Date(y, mo - 1, d, hh, mi)
  return dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null
}

// Reads a ride time typed in any of these shapes (returns a Date, or null if it is not a date):
// 2026-10-30T07:16 | 2026-10-30 07:16 | 30-10-2026 7:16 AM | 30/10/2026 19:16 | "Oct 30th 2026, 7:16 AM"
export function parseRideTime(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  let m = s.match(/^([A-Za-z]{3}) (\d{1,2})(?:st|nd|rd|th) (\d{4}),? (\d{1,2}):(\d{2}) ?([AaPp][Mm])$/)
  if (m) { const mo = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()); return mo < 0 ? null : build(m[3], mo + 1, m[2], m[4], m[5], m[6]) }
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?)?$/)
  if (m) return build(m[1], m[2], m[3], m[4], m[5], m[6])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?)?$/)
  if (m) return build(m[3], m[2], m[1], m[4], m[5], m[6])
  return null
}

// What is printed on the bill. Text that is not a date is printed as typed.
export function formatRideTime(raw) {
  const s = String(raw ?? '').trim()
  if (ALREADY.test(s)) return s
  const d = parseRideTime(s)
  return d ? formatDate(d) : s
}

// Value for <input type="datetime-local"> (local time), or the original text if it is not a date.
export function toInputTime(raw) {
  const d = parseRideTime(raw)
  if (!d) return String(raw ?? '')
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// "831" | "₹831" | "Rs. 831" -> "₹ 831"
export function formatPrice(raw) {
  const s = String(raw ?? '').trim().replace(/^(₹|rs\.?|inr)\s*/i, '').trim()
  return s ? `₹ ${s}` : ''
}

export const displayPrice = (b) => formatPrice(b.selectedPrice || b.price)

export const sanitizeFileName = (s) =>
  String(s ?? '').replace(/\.(pdf|docx?)$/i, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)

export const DEFAULT_PREFIX = 'CAB_RECEIPT'

// Epoch (ms) used in a default file name: a date picked by the user wins, otherwise the bill's own
// Time of ride, otherwise `fallback` (the moment the page was opened).
export function epochFor(bill, override, fallback) {
  const o = override ? new Date(override).getTime() : NaN
  if (Number.isFinite(o)) return o
  return parseRideTime(bill.rideTime)?.getTime() ?? fallback
}

// File name = given name, otherwise CAB_RECEIPT_<epoch ms>. Epoch comes from the chosen date.
export function resolveFileBase(bill, epochMs) {
  return sanitizeFileName(bill.fileName) || `${DEFAULT_PREFIX}_${epochMs}`
}

export const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
