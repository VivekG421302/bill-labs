// Every number below was measured from the client's template PDF
// (CAB_RECEIPT_..._Sample_Format_.pdf, US Letter 612 x 792 pt, origin top-left).
// Change nothing here unless the template itself changes.

export const PAGE = { w: 612, h: 792 }

export const L = {
  left: 38.25,            // left text edge
  right: 573.75,          // right text edge (values are right-aligned here)
  title: { base: 26.1, size: 14.4 },                      // "Booking History" (Open Sans Bold)
  rows: { firstBase: 58.5, pitch: 25.2, size: 14.4 },     // detail rows (Times / Liberation Serif)
  logo: { right: 574.2, top: 13.5, w: 47.7, h: 27 },      // default logo box
  priceBox: { x0: 38.7, x1: 574.2, top: 210.6, bottom: 281.7, fill: [0.9804, 0.9804, 0.9804] },
  priceLabel: { base: 236.7, size: 16.2, cx: 306 },
  priceValue: { base: 264.6, size: 25.2, cx: 302.4 },   // template centre sits 3.6pt left of the box centre
  addrBox: { x0: 38.7, x1: 574.2, top: 299.7, fill: [0.9373, 0.9373, 0.9373] },
  addr: {
    x: 55.35, maxX: 565, size: 12.6, pitch: 16.2,
    firstBase: 315.0,         // baseline of first "from" line
    gap: 39.6,                // last "from" baseline -> first "to" baseline
    bottomPad: 6.3,           // last "to" baseline -> box bottom
    dot: { x: 41.4, size: 10.8, up: 2.7 },       // dot top = line baseline - 2.7
    rail: { x: 46.4, w: 0.9, fromLast: 6.8, toFirst: 9.4, color: [0.7686, 0.7686, 0.7686] },
  },
  note: { x: 47.25, maxX: 573.75, size: 9, pitch: 9.9, firstAfterBox: 26.1, gapBetween: 18.9 },
}

export const ROWS = [
  ['Customer Name', 'customerName'],
  ['Ride ID', 'rideId'],
  ['Driver name', 'driverName'],
  ['Vehicle Number', 'vehicleNumber'],
  ['Mode of Vehicle', 'vehicleMode'],
  ['Time of Ride', 'rideTime'],
]
