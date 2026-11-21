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
Every position, font and size is in `src/cab/layout.js`, measured from the client's sample PDF
(US Letter, Open Sans for the title and addresses, Times / Liberation Serif for rows and notes, DejaVu for the ₹ sign).
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
- `FileName` empty gives `CAB_RECEIPT_<epoch ms>`. By default the epoch is the row's own `TimeOfRide`; picking a "Timestamp date" overrides it for all rows. Equal timestamps are moved one millisecond apart so names never clash.
- In the created list, **Preview → Edit** opens the bill in the form with its data filled in; **Save changes to list** updates it.
- The box on the bill shows `SelectedPrice`; if empty it shows `Price`.

### Theme and navigation
Both tools use one shared theme (dark by default, toggle in the top bar, remembered in `localStorage` key `billlabs.theme`).
The Petrol bill page has a top bar linking back to Bill Labs and the Cab bill.

### Storage
The logo settings and the created-bills list are kept in the browser's `localStorage` (data only; files are generated on demand).

### Limits
Text is rendered in Latin fonts. Devanagari or other scripts are not supported yet.
