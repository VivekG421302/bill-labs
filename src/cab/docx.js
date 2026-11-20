import {
  AlignmentType, BorderStyle, Document, HeightRule, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow,
  TabStopType, TextRun, VerticalAlign, WidthType, LineRuleType, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType,
} from 'docx'
import { L, ROWS } from './layout.js'
import { DEFAULT_DESCRIPTION, DEFAULT_REMARK, displayPrice, formatRideTime } from './fields.js'
import { wrap } from './pdf.js'

const pt = (v) => Math.round(v * 20)          // points -> twips
const emu = (v) => Math.round(v * 12700)      // points -> EMU
const hp = (v) => Math.round(v * 2)           // points -> half-points (Word's font-size unit)
const clean = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE }
const hex = (c) => c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()

// Word only knows half-point font sizes: 14.4pt -> 14.5pt, 12.6 -> 12.5, 25.2 -> 25, 16.2 -> 16.
const SERIF = 'Times New Roman', SANS = 'Open Sans', SYM = 'DejaVu Sans'
const exact = (h) => ({ line: pt(h), lineRule: LineRuleType.EXACT, before: 0, after: 0 })
const run = (text, font, size, extra = {}) =>
  new TextRun({ text, font: { name: font }, size: hp(size), color: '000000', ...extra })

// Tuning offsets: Word puts the baseline of an exact-height line at a fixed fraction of the line,
// so we pad each paragraph's height instead of guessing per element. Values verified against the PDF.
const T = { top: 0 }

export async function buildDocx(bill, assets) {
  const widthPt = 612 - 2 * L.left               // text width: 535.5pt
  const W = pt(widthPt)
  const kids = []

  // Title
  kids.push(new Paragraph({ spacing: { ...exact(25.2), after: pt(7.2) }, children: [run('Booking History', SANS, L.title.size, { bold: true })] }))

  // Detail rows: label, right-aligned tab, value
  ROWS.forEach(([label, key]) => {
    const v = key === 'rideTime' ? formatRideTime(bill[key]) : clean(bill[key])
    kids.push(new Paragraph({
      spacing: exact(L.rows.pitch),
      tabStops: [{ type: TabStopType.RIGHT, position: W }],
      children: [run(label, SERIF, L.rows.size), run('\t' + v, SERIF, L.rows.size)],
    }))
  })

  // gap before price box
  kids.push(new Paragraph({ spacing: exact(21.05), children: [] }))

  // Price box (single shaded cell)
  const pb = L.priceBox
  const sym = displayPrice(bill).slice(0, 1), amount = displayPrice(bill).slice(1)
  kids.push(new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W], borders: { ...NO_BORDERS, insideHorizontal: NONE, insideVertical: NONE },
    rows: [new TableRow({
      height: { value: pt(pb.bottom - pb.top), rule: HeightRule.EXACT },
      children: [new TableCell({
        width: { size: W, type: WidthType.DXA }, borders: NO_BORDERS, margins: { top: 0, bottom: 0, left: 0, right: 0 },
        shading: { type: ShadingType.CLEAR, fill: hex(pb.fill), color: 'auto' },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...exact(24), before: pt(6.9) }, children: [run('Selected Price', SERIF, L.priceLabel.size)] }),
          new Paragraph({ alignment: AlignmentType.CENTER, indent: { right: pt(7.2) }, spacing: exact(29.25), children: sym ? [run(sym, SYM, L.priceValue.size), run(amount, SANS, L.priceValue.size)] : [] }),
        ],
      })],
    })],
  }))

  // gap between boxes
  kids.push(new Paragraph({ spacing: exact(L.addrBox.top - pb.bottom), children: [] }))

  // Address box: [dot][from] / [rail][ ] / [dot][to]
  const A = L.addr
  const maxW = A.maxX - A.x
  const fromLines = wrap(bill.from, assets.measure.sans, A.size, maxW)
  const toLines = wrap(bill.to, assets.measure.sans, A.size, maxW)
  const dotW = pt(A.x - L.left), textW = W - dotW
  const addrPara = (lines, first = 0, last = 0) => lines.map((s, i) => new Paragraph({
    spacing: { ...exact(A.pitch), before: i === 0 ? pt(first) : 0, after: i === lines.length - 1 ? pt(last) : 0 },
    children: [run(s, SANS, A.size)],
  }))
  const dotPara = (bytes, off) => new Paragraph({
    spacing: exact(A.pitch),
    children: [new ImageRun({
      type: 'png', data: bytes, transformation: { width: A.dot.size / 0.75, height: A.dot.size / 0.75 },
      floating: {
        horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: emu(A.dot.x - L.left) },
        verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: emu(off) },
        wrap: { type: TextWrappingType.NONE }, allowOverlap: true, lockAnchor: true,
      },
    })],
  })
  const fill = { type: ShadingType.CLEAR, fill: hex(L.addrBox.fill), color: 'auto' }
  const cell = (w, children) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: NO_BORDERS, margins: { top: 0, bottom: 0, left: 0, right: 0 }, shading: fill, children })
  const railPara = (before, h) => new Paragraph({
    spacing: { ...exact(h), before: pt(before) },
    indent: { left: pt(A.rail.x + A.rail.w - L.left) },
    border: { left: { style: BorderStyle.SINGLE, size: 7, space: 0, color: hex(A.rail.color) } },
    children: [],
  })
  const railH = A.gap - (fromLines.length ? A.pitch : 0)           // space between the two address blocks
  kids.push(new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [dotW, textW], borders: { ...NO_BORDERS, insideHorizontal: NONE, insideVertical: NONE },
    rows: [
      new TableRow({ children: [cell(dotW, [dotPara(assets.dotFrom, 12.6)]), cell(textW, addrPara(fromLines, 2.35))] }),
      new TableRow({
        height: { value: pt(railH), rule: HeightRule.EXACT },
        children: [
          cell(dotW, [railPara(A.rail.fromLast - (A.pitch - 12.95), railH - (A.rail.fromLast - (A.pitch - 12.95)))]),
          cell(textW, [new Paragraph({ spacing: exact(railH), children: [] })]),
        ],
      }),
      new TableRow({ children: [cell(dotW, [railPara(0, 3.55), dotPara(assets.dotTo, 10.25 - 3.55)]), cell(textW, addrPara(toLines, 0, 3.15))] }),
    ],
  }))

  // Description + remark
  const N = L.note
  const noteParas = (text, fallback, before) =>
    wrap(text?.trim() ? text : fallback, assets.measure.serif, N.size, N.maxX - N.x).map((s, i) =>
      new Paragraph({ indent: { left: pt(N.x - L.left) }, spacing: { ...exact(N.pitch), before: i === 0 ? before : 0 }, children: [run(s, SERIF, N.size)] }))
  kids.push(new Paragraph({ spacing: exact(18.1), children: [] }))
  kids.push(...noteParas(bill.description, DEFAULT_DESCRIPTION, 0))
  kids.push(...noteParas(bill.remark, DEFAULT_REMARK, pt(N.gapBetween - N.pitch)))

  // Logo, anchored to the page so it never pushes the layout around
  let logoPara = null
  if (assets.logo) {
    const { bytes, w, h, settings: s } = assets.logo
    const width = s.width, height = (width * h) / w
    logoPara = new Paragraph({
      spacing: exact(1),
      children: [new ImageRun({
        type: 'png', data: bytes, transformation: { width: width / 0.75, height: height / 0.75 },
        floating: {
          horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: emu(L.logo.right + s.offsetX - width) },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: emu(L.logo.top + s.offsetY) },
          wrap: { type: TextWrappingType.NONE }, allowOverlap: true, lockAnchor: true,
        },
      })],
    })
  }
  if (logoPara) kids.unshift(logoPara)

  const doc = new Document({
    creator: 'Bill Labs', title: `Cab receipt ${clean(bill.rideId)}`.trim(),
    fonts: [
      { name: SANS, data: assets.fonts.sans, bold: assets.fonts.sansBold },
      { name: SYM, data: assets.fonts.dejavu },
    ],
    styles: { default: { document: { run: { font: { name: SERIF }, size: hp(14.4), color: '000000' }, paragraph: { spacing: { before: 0, after: 0 } } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: pt(4.95), bottom: pt(36), left: pt(L.left), right: pt(612 - L.right), header: 0, footer: 0 } } },
      children: kids,
    }],
  })
  return new Uint8Array(await Packer.toArrayBuffer(doc))
}
