import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import sansUrl from '../assets/fonts/OpenSans-Regular.ttf?url'
import sansBoldUrl from '../assets/fonts/OpenSans-Bold.ttf?url'
import serifUrl from '../assets/fonts/LiberationSerif-Regular.ttf?url'
import dejavuUrl from '../assets/fonts/DejaVuSans.ttf?url'
import dotFromUrl from '../assets/img/dot-from.png?url'
import dotToUrl from '../assets/img/dot-to.png?url'
import defaultLogoUrl from '../assets/img/logo-default.png?url'
import { L } from './layout.js'

const get = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Could not load ${url}`)
  return new Uint8Array(await r.arrayBuffer())
}

let cache
// Fonts and images are fetched once and reused for every bill.
export function loadAssets() {
  cache ??= (async () => {
    const [sans, sansBold, serif, dejavu, dotFrom, dotTo, logo] = await Promise.all(
      [sansUrl, sansBoldUrl, serifUrl, dejavuUrl, dotFromUrl, dotToUrl, defaultLogoUrl].map(get),
    )
    // Measuring fonts (used by the Word export to wrap text exactly like the PDF)
    const m = await PDFDocument.create()
    m.registerFontkit(fontkit)
    const measure = { sans: await m.embedFont(sans), serif: await m.embedFont(serif) }
    return { fonts: { sans, sansBold, serif, dejavu }, dotFrom, dotTo, defaultLogo: logo, measure }
  })().catch((e) => { cache = undefined; throw e })
  return cache
}

export const DEFAULT_LOGO = { custom: null, nat: { w: 53, h: 30 }, width: L.logo.w, offsetX: 0, offsetY: 0 }

const dataUrlToBytes = (u) => Uint8Array.from(atob(u.split(',')[1]), (c) => c.charCodeAt(0))

// Combine the stored logo settings with the bundled default logo.
export function logoAsset(assets, logo) {
  const bytes = logo.custom ? dataUrlToBytes(logo.custom) : assets.defaultLogo
  return { bytes, w: logo.nat.w, h: logo.nat.h, settings: { width: logo.width, offsetX: logo.offsetX, offsetY: logo.offsetY } }
}

// Any image the user picks (PNG, JPG, WebP, SVG...) is normalised to a PNG data URL.
export function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 900 / img.naturalWidth)
      const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale))
      const c = document.createElement('canvas'); c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const width = Math.min(L.logo.w, L.logo.h * (w / h))
      resolve({ custom: c.toDataURL('image/png'), nat: { w, h }, width: +width.toFixed(1), offsetX: 0, offsetY: 0 })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')) }
    img.src = url
  })
}
