import { useEffect, useRef, useState } from 'react'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { renderPreview } from '../cab/exporter.js'
import { PAGE } from '../cab/layout.js'

let pdfjsP
const loadPdfjs = () => (pdfjsP ??= import('pdfjs-dist').then((m) => { m.GlobalWorkerOptions.workerSrc = workerSrc; return m }))

// Renders the real generated PDF (the full A4 page) onto a canvas,
// so what you preview is exactly what you download. Works the same on phones.
export default function PdfView({ bill, logo, delay = 0 }) {
  const canvas = useRef(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    let dead = false, task, loading
    setState((s) => (s === 'ready' ? 'ready' : 'loading'))
    const t = setTimeout(async () => {
      try {
        const { bytes } = await renderPreview(bill, logo)
        const pdfjs = await loadPdfjs()
        loading = pdfjs.getDocument({ data: bytes.slice() })
        const pdf = await loading.promise
        const page = await pdf.getPage(1)
        if (dead) return
        const scale = Math.min(3, Math.max(1.5, (window.devicePixelRatio || 1) * 1.4))
        const viewport = page.getViewport({ scale })
        const c = canvas.current
        c.width = Math.round(PAGE.w * scale)
        c.height = Math.round(PAGE.h * scale)
        task = page.render({ canvasContext: c.getContext('2d'), viewport })
        await task.promise
        if (!dead) setState('ready')
      } catch (e) {
        if (!dead && e?.name !== 'RenderingCancelledException') setState('error')
      }
    }, delay)
    return () => {
      dead = true; clearTimeout(t)
      try { task?.cancel() } catch { /* already finished */ }
      try { loading?.destroy() } catch { /* already destroyed */ }
    }
  }, [bill, logo, delay])

  return (
    <div className="pdfview" aria-busy={state === 'loading'}>
      <canvas ref={canvas} className="pdfview-canvas" role="img" aria-label="Preview of the generated bill" />
      {state === 'loading' && <p className="pdfview-note">Building preview…</p>}
      {state === 'error' && <p className="pdfview-note pdfview-error">The preview could not be built. Check the fields and try again.</p>}
    </div>
  )
}
