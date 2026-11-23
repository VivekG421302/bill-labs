/**
 * thermal-printer.js – drop-in Web Bluetooth printing for the SC03h (Meow protocol).
 * No dependencies. Works in Chrome / Edge (desktop + Android) on HTTPS or localhost.
 *
 * Usage (connect() MUST run inside a user gesture such as a click):
 *
 *   import { ThermalPrinter } from './thermal-printer.js';
 *   const printer = new ThermalPrinter();
 *   connectBtn.onclick = () => printer.connect();
 *   printBtn.onclick   = () => printer.printText('Hello\nWorld', { size: 32, align: 'center' });
 *   // or: printer.printCanvas(someCanvas)  /  printer.printImage(imgElement)
 */
const CRC = (b) => { let c = 0; for (const x of b) { c ^= x; for (let i = 0; i < 8; i++) c = c & 0x80 ? ((c << 1) ^ 7) & 255 : (c << 1) & 255; } return c; };
const frame = (cmd, p = []) => { const o = new Uint8Array(8 + p.length); o.set([0x51, 0x78, cmd, 0, p.length & 255, p.length >> 8]); o.set(p, 6); o[6 + p.length] = CRC(Uint8Array.from(p)); o[7 + p.length] = 0xff; return o; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WIDTH = 384;

export const DEFAULTS = {
  namePrefix: 'SC03',
  serviceUuid: '0000ae30-0000-1000-8000-00805f9b34fb',
  writeUuid: '0000ae01-0000-1000-8000-00805f9b34fb',
  chunkSize: 20, delayMs: 15, darkness: 60, speed: 32,
};

export class ThermalPrinter {
  constructor(opts = {}) {
    this.cfg = { ...DEFAULTS, ...opts };
    this.device = null; this.char = null; this.busy = false;
    this.onChange = opts.onChange || (() => {});
  }
  static get supported() { return typeof navigator !== 'undefined' && !!navigator.bluetooth; }
  get connected() { return !!this.device?.gatt?.connected && !!this.char; }

  /** Opens the browser device picker (needs a click). */
  async connect() {
    if (!ThermalPrinter.supported) throw new Error('Web Bluetooth is not supported. Use Chrome or Edge (not iOS, not Brave by default).');
    const { serviceUuid, namePrefix } = this.cfg;
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix }, { services: [serviceUuid] }],
      optionalServices: [serviceUuid],
    });
    return this._attach(device);
  }

  /** Silent reconnect to a printer this site already paired with (no picker). Call on page load. */
  async reconnect() {
    if (!navigator.bluetooth?.getDevices) return false;
    const [device] = await navigator.bluetooth.getDevices();
    if (!device) return false;
    await this._attach(device);
    return true;
  }

  async _attach(device) {
    this.device = device;
    device.addEventListener('gattserverdisconnected', () => { this.char = null; this.onChange(false); });
    const server = await device.gatt.connect();
    const svc = await server.getPrimaryService(this.cfg.serviceUuid);
    this.char = await svc.getCharacteristic(this.cfg.writeUuid);
    this.onChange(true);
    return device.name;
  }

  disconnect() { this.device?.gatt?.disconnect(); }

  // ---- printing ----
  async printText(text, o = {}) { return this.printCanvas(textCanvas(text, o), o); }
  async printImage(img, o = {}) { return this.printCanvas(img, { dither: true, ...o }); }

  /** Accepts any canvas or image; scales to 384 px wide. o.dither = Floyd-Steinberg, else threshold. */
  async printCanvas(src, o = {}) {
    if (!this.connected) throw new Error('Printer not connected.');
    if (this.busy) throw new Error('Printer is busy.');
    this.busy = true;
    try {
      const px = toBits(src, o.dither, o.threshold ?? 128);
      await this._send(encode(px, { darkness: o.darkness ?? this.cfg.darkness, speed: this.cfg.speed }));
    } finally { this.busy = false; }
  }

  async _send(bytes) {
    const { chunkSize, delayMs } = this.cfg;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      if (!this.device.gatt.connected) throw new Error('Printer disconnected mid-print.');
      await this.char.writeValueWithoutResponse(bytes.slice(i, i + chunkSize));
      if (delayMs) await sleep(delayMs);
    }
  }
}

// ---- Meow encoder: 1 = black pixels, rows of 384 ----
function encode({ pixels, height }, { darkness, speed }) {
  const energy = Math.round(0x1000 + (darkness / 100) * 0x3000);
  const parts = [frame(0xa3, [0]), frame(0xa4, [0x35]), frame(0xaf, [energy & 255, energy >> 8]), frame(0xbe, [1]), frame(0xbd, [speed]),
    frame(0xa6, [0xaa, 0x55, 0x17, 0x38, 0x44, 0x5f, 0x5f, 0x5f, 0x44, 0x38, 0x2c])];
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(48), rle = [];
    for (let x = 0; x < WIDTH; x++) if (pixels[y * WIDTH + x]) row[x >> 3] |= 1 << (x & 7);
    for (let x = 0; x < WIDTH;) {
      const v = pixels[y * WIDTH + x] ? 1 : 0; let n = 1;
      while (x + n < WIDTH && (pixels[y * WIDTH + x + n] ? 1 : 0) === v && n < 127) n++;
      rle.push((v << 7) | n); x += n;
    }
    parts.push(rle.length < 48 ? frame(0xbf, rle) : frame(0xa2, row));
  }
  parts.push(frame(0xa6, [0xaa, 0x55, 0x17, 0, 0, 0, 0, 0, 0, 0, 0x17]), frame(0xbd, [8]), frame(0xa1, [80, 0]), frame(0xa3, [0]));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function toBits(src, dither, threshold) {
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const h = Math.max(1, Math.round((sh * WIDTH) / sw));
  const c = document.createElement('canvas'); c.width = WIDTH; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, WIDTH, h); g.drawImage(src, 0, 0, WIDTH, h);
  const d = g.getImageData(0, 0, WIDTH, h).data, v = new Float32Array(WIDTH * h), pixels = new Uint8Array(WIDTH * h);
  for (let i = 0; i < v.length; i++) v[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const add = (x, y, e) => { if (x >= 0 && x < WIDTH && y < h) v[y * WIDTH + x] += e; };
  for (let y = 0; y < h; y++) for (let x = 0; x < WIDTH; x++) {
    const i = y * WIDTH + x, old = v[i], nw = old < (dither ? 128 : threshold) ? 0 : 255;
    pixels[i] = nw === 0 ? 1 : 0;
    if (dither) { const e = old - nw; add(x + 1, y, e * 7 / 16); add(x - 1, y + 1, e * 3 / 16); add(x, y + 1, e * 5 / 16); add(x + 1, y + 1, e / 16); }
  }
  return { pixels, height: h };
}

function textCanvas(text, { size = 32, align = 'left', bold = false } = {}) {
  const pad = 8, font = `${bold ? 700 : 400} ${size}px "Courier New", monospace`;
  const m = document.createElement('canvas').getContext('2d'); m.font = font;
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (m.measureText(t).width <= WIDTH - pad * 2 || !line) line = t; else { lines.push(line); line = w; }
    }
    lines.push(line);
  }
  const lh = Math.round(size * 1.25), c = document.createElement('canvas'); c.width = WIDTH; c.height = lines.length * lh + pad * 2;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, WIDTH, c.height);
  g.fillStyle = '#000'; g.font = font; g.textBaseline = 'top'; g.textAlign = align;
  const x = align === 'left' ? pad : align === 'center' ? WIDTH / 2 : WIDTH - pad;
  lines.forEach((l, i) => g.fillText(l, x, pad + i * lh));
  return c;
}
