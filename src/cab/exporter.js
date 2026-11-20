import { zipSync } from 'fflate'
import { loadAssets, logoAsset } from './assets.js'

export const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  zip: 'application/zip',
}

export async function render(bill, kind, logo) {
  const assets = await loadAssets()
  const a = { ...assets, logo: logoAsset(assets, logo) }
  if (kind === 'docx') return (await import('./docx.js')).buildDocx(bill, a)
  return (await import('./pdf.js')).buildPdf(bill, a)
}

export async function renderPreview(bill, logo) {
  const assets = await loadAssets()
  return (await import('./pdf.js')).buildPdfDetailed(bill, { ...assets, logo: logoAsset(assets, logo) })
}

export function saveBlob(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function downloadOne(bill, base, kind, logo) {
  saveBlob(await render(bill, kind, logo), `${base}.${kind}`, MIME[kind])
}

// Many files -> one ZIP. onProgress(done, total) keeps the UI alive for big batches.
export async function downloadZip(records, kind, logo, zipName, onProgress) {
  const files = {}
  for (let i = 0; i < records.length; i++) {
    files[`${records[i].fileBase}.${kind}`] = await render(records[i].bill, kind, logo)
    onProgress?.(i + 1, records.length)
    if (i % 5 === 4) await new Promise((r) => setTimeout(r)) // let the browser paint
  }
  saveBlob(zipSync(files, { level: 0 }), zipName, MIME.zip)
}

export function downloadText(text, name, type = 'text/csv;charset=utf-8') {
  saveBlob(new TextEncoder().encode(text), name, type)
}
