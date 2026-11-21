import { useRef, useState } from 'react'
import { DEFAULT_LOGO, readLogoFile } from '../cab/assets.js'
import defaultLogoUrl from '../assets/img/logo-default.png'
import { DX, L, PAGE } from '../cab/layout.js'

export default function LogoPanel({ logo, setLogo }) {
  const file = useRef(null)
  const [err, setErr] = useState('')
  const src = logo.custom || defaultLogoUrl
  const h = (logo.width * logo.nat.h) / logo.nat.w
  const STRIP = 50 // pt of the page header shown in the mini preview

  const upload = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try { setErr(''); setLogo(await readLogoFile(f)) } catch (x) { setErr(x.message) }
  }
  const set = (k) => (e) => setLogo({ ...logo, [k]: Number(e.target.value) })
  const isDefault = !logo.custom && logo.width === DEFAULT_LOGO.width && !logo.offsetX && !logo.offsetY
  // The width that fits the standard logo box for this logo's shape.
  const fitWidth = +Math.min(L.logo.w, L.logo.h * (logo.nat.w / logo.nat.h)).toFixed(1)
  const atFit = logo.width === fitWidth && !logo.offsetX && !logo.offsetY

  return (
    <details className="card logo-panel">
      <summary>Logo <span className="muted">{logo.custom ? 'Your logo' : 'Default logo'} · saved on this device</span></summary>
      <div className="logo-grid">
        <div>
          <div className="logo-strip" aria-label="Logo position preview">
            <span className="logo-strip-title">Booking History</span>
            <img
              src={src} alt=""
              style={{
                width: `${(logo.width / PAGE.w) * 100}%`,
                right: `${((PAGE.w - (L.logo.right + DX + logo.offsetX)) / PAGE.w) * 100}%`,
                top: `${((L.logo.top + logo.offsetY) / STRIP) * 100}%`,
                aspectRatio: `${logo.nat.w} / ${logo.nat.h}`,
              }}
            />
          </div>
          <p className="muted small">Top strip of the bill. The logo is anchored to the right edge.</p>
        </div>
        <div className="logo-controls">
          <div className="row">
            <button type="button" className="btn" onClick={() => file.current.click()}>Upload logo</button>
            <button type="button" className="btn" disabled={atFit} onClick={() => setLogo({ ...logo, width: fitWidth, offsetX: 0, offsetY: 0 })}>Reset size &amp; position</button>
            <button type="button" className="btn btn-ghost" disabled={isDefault} onClick={() => setLogo(DEFAULT_LOGO)}>Use default logo</button>
            <input ref={file} type="file" accept="image/*" hidden onChange={upload} />
          </div>
          {err && <p className="error" role="alert">{err}</p>}
          <label className="slider">Width <output>{logo.width.toFixed(1)} pt</output>
            <input type="range" min="10" max="150" step="0.5" value={logo.width} onChange={set('width')} />
          </label>
          <label className="slider">Move right / left <output>{logo.offsetX} pt</output>
            <input type="range" min="-60" max="30" step="0.5" value={logo.offsetX} onChange={set('offsetX')} />
          </label>
          <label className="slider">Move down / up <output>{logo.offsetY} pt</output>
            <input type="range" min="-12" max="60" step="0.5" value={logo.offsetY} onChange={set('offsetY')} />
          </label>
          <p className="muted small">Height follows the logo’s shape ({h.toFixed(1)} pt now).</p>
        </div>
      </div>
    </details>
  )
}
