# bill-labs

Petrol pump bill printer, an installable PWA for 57 mm thermal paper rolls.

- `index.html` is the whole app (works offline once installed)
- `sw.js` caches the app. Bump `V` (e.g. `pump-bill-v2`) after changing any file so phones update
- `manifest.webmanifest` and `icon-*.png` make it installable

Host it on any static https host (Vercel, Netlify, GitHub Pages), then use the browser's Install / Add to Home Screen option.
