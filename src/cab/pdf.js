import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { L, PAGE, ROWS } from './layout.js'
import { DEFAULT_DESCRIPTION, DEFAULT_REMARK, displayPrice, formatRideTime } from './fields.js'

const clean = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\u00a0/g, ' ')

// Greedy word wrap that honours explicit line breaks and splits over-long words.
export function wrap(text, font, size, maxWidth) {
  const out = []
  for (const para of clean(text).split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) { out.push(''); continue }
    let line = ''
    for (let w of words) {
      while (font.widthOfTextAtSize(w, size) > maxWidth) {
        let i = w.length
        while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > maxWidth) i--
        if (line) { out.push(line); line = '' }
        out.push(w.slice(0, i)); w = w.slice(i)
      }
      const t = line ? `${line} ${w}` : w
      if (!line || font.widthOfTextAtSize(t, size) <= maxWidth) line = t
      else { out.push(line); line = w }
    }
    out.push(line)
  }
  return out
}

/**
 * Builds the bill PDF.
 * assets: { fonts:{sans,sansBold,serif,dejavu}, dotFrom, dotTo, logo?:{bytes, w, h, settings} }
 */
export async function buildPdf(bill, assets) {
  return (await buildPdfDetailed(bill, assets)).bytes
}

// Same as buildPdf, plus `bottom`: y (pt from top) where the content ends, used to crop previews.
export async function buildPdfDetailed(bill, assets) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const f = {
    sans: await doc.embedFont(assets.fonts.sans, { subset: true }),
    sansBold: await doc.embedFont(assets.fonts.sansBold, { subset: true }),
    serif: await doc.embedFont(assets.fonts.serif, { subset: true }),
    dejavu: await doc.embedFont(assets.fonts.dejavu, { subset: true }),
  }
  doc.setTitle(`Cab receipt ${clean(bill.rideId)}`.trim())
  doc.setProducer('Bill Labs')
  doc.setCreator('Bill Labs')

  const page = doc.addPage([PAGE.w, PAGE.h])
  const Y = (top) => PAGE.h - top
  const black = rgb(0, 0, 0)
  const text = (s, x, base, font, size) => s && page.drawText(s, { x, y: Y(base), font, size, color: black })
  const right = (s, xr, base, font, size) => s && text(s, xr - font.widthOfTextAtSize(s, size), base, font, size)
  const center = (s, cx, base, font, size) => s && text(s, cx - font.widthOfTextAtSize(s, size) / 2, base, font, size)
  const box = (x0, x1, top, bottom, c) =>
    page.drawRectangle({ x: x0, y: Y(bottom), width: x1 - x0, height: bottom - top, color: rgb(...c) })

  // Header
  text('Booking History', L.left, L.title.base, f.sansBold, L.title.size)
  if (assets.logo) {
    const { bytes, w, h, settings: s } = assets.logo
    const img = await doc.embedPng(bytes)
    const width = s.width, height = (width * h) / w
    page.drawImage(img, { x: L.logo.right + s.offsetX - width, y: Y(L.logo.top + s.offsetY + height), width, height })
  }

  // Detail rows: label left, value right-aligned
  ROWS.forEach(([label, key], i) => {
    const base = L.rows.firstBase + i * L.rows.pitch
    text(label, L.left, base, f.serif, L.rows.size)
    const v = key === 'rideTime' ? formatRideTime(bill[key]) : clean(bill[key])
    right(v, L.right, base, f.serif, L.rows.size)
  })

  // Price box
  const pb = L.priceBox
  box(pb.x0, pb.x1, pb.top, pb.bottom, pb.fill)
  center('Selected Price', L.priceLabel.cx, L.priceLabel.base, f.serif, L.priceLabel.size)
  // Template detail: the rupee sign comes from DejaVu, the amount from Open Sans.
  const price = displayPrice(bill)
  if (price) {
    const sym = price.slice(0, 1), rest = price.slice(1), sz = L.priceValue.size
    const total = f.dejavu.widthOfTextAtSize(sym, sz) + f.sans.widthOfTextAtSize(rest, sz)
    const x = L.priceValue.cx - total / 2
    text(sym, x, L.priceValue.base, f.dejavu, sz)
    text(rest, x + f.dejavu.widthOfTextAtSize(sym, sz), L.priceValue.base, f.sans, sz)
  }

  // Address box (height follows the number of wrapped lines)
  const A = L.addr
  const maxW = A.maxX - A.x
  const fromLines = wrap(bill.from, f.sans, A.size, maxW)
  const toLines = wrap(bill.to, f.sans, A.size, maxW)
  const fromFirst = A.firstBase
  const fromLast = fromFirst + (fromLines.length - 1) * A.pitch
  const toFirst = fromLast + A.gap
  const toLast = toFirst + (toLines.length - 1) * A.pitch
  const boxBottom = toLast + A.bottomPad
  box(L.addrBox.x0, L.addrBox.x1, L.addrBox.top, boxBottom, L.addrBox.fill)
  const railTop = fromLast + A.rail.fromLast, railBottom = toFirst - A.rail.toFirst
  if (railBottom > railTop) box(A.rail.x, A.rail.x + A.rail.w, railTop, railBottom, A.rail.color)
  const dot = async (bytes, base) => {
    const img = await doc.embedPng(bytes)
    page.drawImage(img, { x: A.dot.x, y: Y(base - A.dot.up + A.dot.size), width: A.dot.size, height: A.dot.size })
  }
  await dot(assets.dotFrom, fromFirst)
  await dot(assets.dotTo, toFirst)
  fromLines.forEach((s, i) => text(s, A.x, fromFirst + i * A.pitch, f.sans, A.size))
  toLines.forEach((s, i) => text(s, A.x, toFirst + i * A.pitch, f.sans, A.size))

  // Description + remark (Times 9). Empty fields fall back to the standard client wording.
  const N = L.note, nmax = N.maxX - N.x
  let base = boxBottom + N.firstAfterBox
  const descLines = wrap(bill.description?.trim() ? bill.description : DEFAULT_DESCRIPTION, f.serif, N.size, nmax)
  descLines.forEach((s, i) => text(s, N.x, base + i * N.pitch, f.serif, N.size))
  base += (descLines.length - 1) * N.pitch + N.gapBetween
  wrap(bill.remark?.trim() ? bill.remark : DEFAULT_REMARK, f.serif, N.size, nmax)
    .forEach((s, i) => text(s, N.x, base + i * N.pitch, f.serif, N.size))

  const noteLines = wrap(bill.remark?.trim() ? bill.remark : DEFAULT_REMARK, f.serif, N.size, nmax).length
  return { bytes: await doc.save(), bottom: base + (noteLines - 1) * N.pitch }
}
