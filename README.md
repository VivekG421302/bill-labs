# Bill Labs

React + Vite app with two tools:

- **Cab bill** (`/#/cab-bill`): fill one bill in a form, or create many from a CSV. Download each as PDF or Word, preview it, and manage the created list.
- **Petrol bill** (`/petrol-bill/`): the existing petrol pump bill printer, kept unchanged in `public/petrol-bill`.
- **Uber bill** (`/uber-bill/`): ride receipt generator (route map, driver, fare, CSV bulk, print / save as PDF), a standalone page in `public/uber-bill`.

## Run

```bash
npm install
npm run dev      # development
npm run build    # production build in dist/
```

The app uses relative paths and a hash router, so `dist/` works on any static host or sub-folder.

## Cab bill

### Fidelity to the client template
The bill is issued on **A4** (595.28 x 841.89 pt) in both PDF and Word, and the preview shows the full page. The template's content block is 535.5 pt wide, so it is simply recentred on A4 (`DX` in `layout.js`); no sizes, fonts or vertical positions change.
Every position, font and size is in `src/cab/layout.js`, measured from the client's sample PDF
(Open Sans for the title and addresses, Times / Liberation Serif for rows and notes, DejaVu for the ₹ sign).
`src/cab/pdf.js` draws the PDF with those numbers; `src/cab/docx.js` builds a matching Word file.
Fonts are bundled in `src/assets/fonts`, so output is identical on every machine.
Word only supports half-point sizes, so 14.4 pt becomes 14.5 pt, 12.6 becomes 12.5, 16.2 becomes 16 and 25.2 becomes 25.
Open Sans and DejaVu are embedded in the .docx; Times New Roman is expected on the machine (it ships with Word).

### CSV columns
Use the in-app **Download template CSV**. Headers:
`CustomerName, RideID, DriverName, VehicleNumber, ModeOfVehicle, TimeOfRide, Price, SelectedPrice, FromLocation, ToLocation, FileName, Description, Remark`

- Required per row: CustomerName, RideID, FromLocation, ToLocation, and Price or SelectedPrice. Other rows are skipped and listed.
- `TimeOfRide` accepts `2026-10-30 07:16`, `30/10/2026 7:16 PM`, or already-formatted `Oct 30th 2026, 7:16 AM`.
- Empty `Description` / `Remark` use the standard client wording.
- `FileName` empty gives `CAB_RECEIPT_<RideID>`. If a Ride ID repeats, later files get `_2`, `_3`.
- In the created list, **Preview → Edit** opens the bill in the form with its data filled in; **Save changes to list** updates it.
- The box on the bill shows `SelectedPrice`; if empty it shows `Price`.

### One navbar on every page (`public/shell/shell.js`)
Home, Cab, Petrol and Uber all load the same shell script, so they share one compact bar:

`[ < Home | Page title ]  ......  [page button] [Printers] [Download] [Menu]`

- **Back** goes to the home page (Home shows the Bill Labs brand instead).
- **Menu** opens a collapsible sidebar on the right: the other pages (current one highlighted), page extras (e.g. "How editing works" on Petrol), the **Dark theme** switch and **Install app**. Close it with the X, a click outside, or Esc.
- **Printers** opens one window: thermal printer connection (Connect, Disconnect, Forget, **Test print** which prints a small centred ASCII cat to save paper), Darkness / Text sharpness / Pause between bills, and "Print this bill" (thermal or system printer) where the page supports it. A **green dot** on the button means the thermal printer is connected (amber while connecting).
- **Download** opens a window that asks which format you want. Each page lists what it can make: Petrol PNG, JPEG, PDF, ZIPs of all created bills (PDFs, PNGs or JPEGs) and the CSV template; Cab PDF, Word and ZIPs; Uber PDF (this receipt only, all in one print job, or **PDFs (ZIP)** with one PDF per receipt) and the CSV template.

**PDFs (ZIP)** (Uber and Petrol, after a bulk CSV): every bill is drawn as a picture from the same layout as the preview and wrapped in a PDF (Uber: 2 A4 pages per receipt; Petrol: one page at receipt size), then all PDFs go into one ZIP. No library is used and it works offline, but the text inside these PDFs is part of the picture, so it cannot be selected or searched. Cab PDFs are real text PDFs.
- **Install app** uses the browser's install prompt (`manifest.webmanifest` + `sw.js` at the site root; the Petrol page keeps its own manifest and service worker). On iPhone it explains Share, then Add to Home Screen.

A page tells the shell what it offers with `BillLabs.page({ title, menu, downloads, print })` (React pages use `usePage()` from `src/shell.js`) and can put its own button in the bar with `BillLabs.slot()`. The theme is one switch for the whole site (`billlabs.theme`). The Petrol and Uber pages are standalone (outside the React router) and use relative links, so everything works from any sub-path.

The Uber page keeps its saved settings and logo under `billlabs.uber.*`; its "Reset everything" only clears those keys and never touches the theme, petrol bills or cab data.

## Thermal printing (Petrol bill)

- **Pair once.** The first time, open **Printers** and press Connect, then choose the printer. After that the page reconnects by itself (on open, when the tab comes back, when the printer is switched on, and if the link drops). It only asks again if you press "Forget printer". This needs a browser that supports `navigator.bluetooth.getDevices()`; where it does not, Chrome asks once per page load and then stays connected.
- **Progress bar.** Every thermal print opens a progress window: overall percentage, the current bill's own bar, "n of N printed", time left, and a dot per bill (waiting / printing / done / failed).
- **Bulk printing.** "Thermal all" prints the created bills one after another. The pause between bills is a setting. Pause, Resume and Stop are available; if the printer is switched off or goes out of range the queue waits, and after you switch it on and press Resume the interrupted bill is printed again from the start. "Print remaining" finishes whatever was left. The screen stays awake while printing where the browser allows it.

## Many bills from a CSV: arrows

When a CSV makes many bills you can step through them one by one with the arrows (or the left / right arrow keys): the Petrol preview and print-confirm windows (swipe works on phones), the Cab bill preview, and the Uber page, which shows one receipt at a time with a jump menu. Printing on the Uber page still prints every receipt.

## Petrol bill: bulk create from CSV

On the Petrol bill page, the **Bulk create from CSV** card makes many bills from the current bill rows.

1. Set up one bill the way you want it (rows, logo, paper width).
2. **Template CSV** downloads a file with one column per Key in your bill rows, filled with the current values. If the template has Preset, Sale or Volume rows, they are replaced by a single **Amount** column.
3. Fill one CSV row per bill and **Upload CSV**. Check the summary, then **Create bills**.

Rules: a column whose header matches a Key (ignoring case, spaces and dots, so `Vehi.No` = `vehi no`) fills that row's value. Empty cells keep the template value. `Amount` (with `Rate` from the column, or the Quick fill rate) works out Preset, Rate, Sale and Volume like the Quick fill button; any explicit Preset/Sale/Volume column overrides that. Rows with nothing matching are skipped. Comma or semicolon separated files both work.

Created bills are saved in the browser and listed with **Preview**, **Print**, **Download image** and **Delete**. **Print all** prints every bill in one job, one receipt per page, so the printer cuts between them. Layout changes (paper width, font, logo) apply to all listed bills.

### Download as image
Every bill can be saved as a PNG or JPEG: **Download** in the navbar (current bill, or all created bills in one ZIP), the **Image** button in the preview window, the picture button on each created bill, and **Images (ZIP)** in the created-bills list (files named after the Bill No, repeats get `_2`, `_3`).
The image is drawn from the same layout as the preview and print (same paper width, font and logo) at 3x resolution, so it stays sharp. No extra library is used, it works offline.

### Thermal printer (Bluetooth, SC03 / Meow protocol)
The printer driver is `public/shell/thermal-printer.js` (Web Bluetooth, no dependencies) and is shared by every page through the navbar.

- Needs **Chrome or Edge** (Android or desktop) on **HTTPS** or localhost. iPhone/Safari does not support Web Bluetooth.
- Everything about the printer is in the navbar's **Printers** window; the green dot on its button shows the connection. If you start a print while not connected, the connection is made first (the device picker only opens if no printer is remembered).
- On the Petrol page, print buttons are in **Printers > Print this bill**, in the preview window (**Thermal**), on every created bill, and **Thermal all** (bills are sent one after another).
- The bill is drawn from the same layout as the preview/PNG, scaled to the printer's 384-dot width, and thresholded to black/white. **Darkness**, **Text sharpness** and **Pause between bills** are saved in `localStorage` key `billlabs.thermal`.
- Printer name prefix / BLE UUIDs are in `DEFAULTS` at the top of `thermal-printer.js`.

### Storage
The logo settings and the created-bills list are kept in the browser's `localStorage` (data only; files are generated on demand).

### Limits
Text is rendered in Latin fonts. Devanagari or other scripts are not supported yet.
