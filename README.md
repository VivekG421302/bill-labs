# Bill Labs

React + Vite app with two tools:

- **Cab bill** (`/#/cab-bill`): fill one bill in a form, or create many from a CSV. Download each as PDF or Word, preview it, and manage the created list.
- **Petrol bill** (`/petrol-bill/`): the existing petrol pump bill printer, kept unchanged in `public/petrol-bill`.

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

### Theme and navigation
Both tools use one shared theme (dark by default, toggle in the top bar, remembered in `localStorage` key `billlabs.theme`).
The Petrol bill page has a top bar linking back to Bill Labs and the Cab bill.

## Petrol bill: bulk create from CSV

On the Petrol bill page, the **Bulk create from CSV** card makes many bills from the current bill rows.

1. Set up one bill the way you want it (rows, logo, paper width).
2. **Template CSV** downloads a file with one column per Key in your bill rows, filled with the current values. If the template has Preset, Sale or Volume rows, they are replaced by a single **Amount** column.
3. Fill one CSV row per bill and **Upload CSV**. Check the summary, then **Create bills**.

Rules: a column whose header matches a Key (ignoring case, spaces and dots, so `Vehi.No` = `vehi no`) fills that row's value. Empty cells keep the template value. `Amount` (with `Rate` from the column, or the Quick fill rate) works out Preset, Rate, Sale and Volume like the Quick fill button; any explicit Preset/Sale/Volume column overrides that. Rows with nothing matching are skipped. Comma or semicolon separated files both work.

Created bills are saved in the browser and listed with **Preview**, **Print**, **Download image** and **Delete**. **Print all** prints every bill in one job, one receipt per page, so the printer cuts between them. Layout changes (paper width, font, logo) apply to all listed bills.

### Download as image
Every bill can be saved as a PNG: the picture button in the top bar (current bill), the **Image** button in the preview window, the picture button on each created bill, and **Images (ZIP)** to get all created bills in one ZIP (files named after the Bill No, repeats get `_2`, `_3`).
The image is drawn from the same layout as the preview and print (same paper width, font and logo) at 3x resolution, so it stays sharp. No extra library is used, it works offline.

### Thermal printer (Bluetooth, SC03 / Meow protocol)
The Petrol bill page can print straight to a Bluetooth thermal printer using Web Bluetooth (`public/petrol-bill/thermal-printer.js`, no dependencies).

- Needs **Chrome or Edge** (Android or desktop) on **HTTPS** or localhost. iPhone/Safari does not support Web Bluetooth.
- Pair once with **Connect printer** in the *Thermal printer* card; later visits reconnect silently when the browser allows it. If you press a Bluetooth button while not connected, the device picker opens first.
- Bluetooth buttons: top bar (current bill), preview window (**Thermal**), every created bill, and **Thermal all** (bills are sent one after another).
- The bill is drawn from the same layout as the preview/PNG, scaled to the printer's 384-dot width, and thresholded to black/white. **Darkness** and **Text sharpness** sliders are saved in `localStorage` key `billlabs.thermal`.
- Printer name prefix / BLE UUIDs are in `DEFAULTS` at the top of `thermal-printer.js`.

### Storage
The logo settings and the created-bills list are kept in the browser's `localStorage` (data only; files are generated on demand).

### Limits
Text is rendered in Latin fonts. Devanagari or other scripts are not supported yet.
