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
  storeKey: 'billlabs.thermal.dev',   // remembers which printer this site uses
};

const abortErr = () => Object.assign(new Error('Printing stopped.'), { name: 'AbortError' });
const lostErr = (m) => Object.assign(new Error(m || 'Printer disconnected.'), { name: 'PrinterLost' });

/**
 * Connection model (so nobody has to pair again and again):
 *  - First time: connect() opens the browser picker (needs a tap). The choice is remembered.
 *  - Later: autoConnect() reuses the remembered printer with no picker (navigator.bluetooth.getDevices()),
 *    retries a few times, and if the printer is off / out of range it waits for it to appear
 *    (device.watchAdvertisements) and connects the moment it is switched on.
 *  - If the link drops, it reconnects by itself unless you pressed Disconnect.
 *  - If a browser has no getDevices(), the picker is needed once per page load (nothing else can be done there),
 *    after that it stays connected and reconnects silently while the page is open.
 */
export class ThermalPrinter {
  constructor(opts = {}) {
    this.cfg = { ...DEFAULTS, ...opts };
    this.device = null; this.char = null; this.busy = false;
    this.onChange = opts.onChange || (() => {});
    this.onState = opts.onState || (() => {});   // 'on' | 'off' | 'reconnect'
    this.autoReconnect = true; this._manual = false; this._job = null; this._ac = null; this._epoch = 0;
    this._onDrop = () => { this._epoch++; this.char = null; this.onChange(false); if (!this._manual && this.autoReconnect) this._recover(); else this.onState('off'); };
  }
  static get supported() { return typeof navigator !== 'undefined' && !!navigator.bluetooth; }
  static get canRemember() { return typeof navigator !== 'undefined' && !!navigator.bluetooth?.getDevices; }
  get connected() { return !!this.device?.gatt?.connected && !!this.char; }
  get name() { return this.device?.name || this._saved()?.name || ''; }

  _saved() { try { return JSON.parse(localStorage.getItem(this.cfg.storeKey)); } catch { return null; } }
  _save(d) { try { localStorage.setItem(this.cfg.storeKey, JSON.stringify({ id: d.id, name: d.name })); } catch { /* not remembered */ } }

  /** Opens the browser device picker (needs a click). */
  async connect() {
    if (!ThermalPrinter.supported) throw new Error('Web Bluetooth is not supported. Use Chrome or Edge (not iOS, not Brave by default).');
    const { serviceUuid, namePrefix } = this.cfg;
    this.onState('wait');
    let device;
    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix }, { services: [serviceUuid] }],
        optionalServices: [serviceUuid],
      });
    } catch (e) { this.onState(this.connected ? 'on' : 'off'); throw e; }
    this._manual = false;
    try { return await this._attach(device); }
    catch (e) { this.onState('off'); throw e; }
  }

  /** The printer this site was paired with before, found without any picker. */
  async knownDevice() {
    if (this.device) return this.device;
    if (!ThermalPrinter.canRemember) return null;
    let list = [];
    try { list = await navigator.bluetooth.getDevices(); } catch { return null; }
    const saved = this._saved();
    return list.find((d) => saved && d.id === saved.id)
      || list.find((d) => (d.name || '').startsWith(this.cfg.namePrefix))
      || list[0] || null;
  }

  /** Silent connect to the remembered printer. Never opens a picker. Resolves true when connected. */
  async autoConnect({ tries = 3, wait = true } = {}) {
    if (this.connected) return true;
    if (this._job) return this._job;                 // one attempt at a time
    this._job = (async () => {
      try {
        const device = await this.knownDevice();
        if (!device) return false;
        this._manual = false;
        this.onState('reconnect');
        for (let i = 0; i < tries; i++) {
          try { await this._attach(device); return true; }
          catch { await sleep(700 * (i + 1)); }
        }
        if (wait) this._watch(device);               // connect as soon as it is switched on / in range
        return false;
      } finally { this._job = null; if (!this.connected && !this._ac) this.onState('off'); }
    })();
    return this._job;
  }

  /** Make sure we are connected. Silent first; the picker only when no printer is known (needs a click). */
  async ensure({ picker = true } = {}) {
    if (this.connected) return this;
    if (this._job) await this._job;
    if (this.connected) return this;
    const device = await this.knownDevice();
    if (device) {
      if (await this.autoConnect({ tries: 2, wait: false })) return this;
      throw lostErr('Printer not reachable. Switch it on and keep it close.');
    }
    if (!picker) throw lostErr('No printer paired yet.');
    await this.connect();
    return this;
  }

  _watch(device) {
    if (this._ac || !device.watchAdvertisements) return;
    const ac = this._ac = new AbortController();
    const done = async () => {
      ac.abort(); this._ac = null;
      if (this._manual || this.connected) return;
      try { await this._attach(device); } catch { this._watch(device); }
    };
    device.addEventListener('advertisementreceived', done, { once: true });
    device.watchAdvertisements({ signal: ac.signal }).catch(() => { this._ac = null; });
  }

  _recover() {
    this.onState('reconnect');
    this.autoConnect({ tries: 4 });
  }

  async _attach(device) {
    if (this.device && this.device !== device) this.device.removeEventListener('gattserverdisconnected', this._onDrop);
    this.device = device;
    device.removeEventListener('gattserverdisconnected', this._onDrop);
    device.addEventListener('gattserverdisconnected', this._onDrop);
    const server = await device.gatt.connect();
    const svc = await server.getPrimaryService(this.cfg.serviceUuid);
    this.char = await svc.getCharacteristic(this.cfg.writeUuid);
    this._save(device);
    this.onChange(true); this.onState('on');
    return device.name;
  }

  /** Disconnect on purpose: it will not reconnect by itself until you connect again. */
  disconnect() {
    this._manual = true;
    if (this._ac) { this._ac.abort(); this._ac = null; }
    this.device?.gatt?.disconnect();
    this.char = null; this.onChange(false); this.onState('off');
  }

  /** Forget the remembered printer (next time the picker is shown again). */
  async forget() {
    this.disconnect();
    try { await this.device?.forget?.(); } catch { /* older browsers */ }
    try { localStorage.removeItem(this.cfg.storeKey); } catch { /* ignore */ }
    this.device = null;
  }

  // ---- printing ----
  async printText(text, o = {}) { return this.printCanvas(textCanvas(text, o), o); }
  async printImage(img, o = {}) { return this.printCanvas(img, { dither: true, ...o }); }

  /**
   * Accepts any canvas or image; scales to 384 px wide. o.dither = Floyd-Steinberg, else threshold.
   * o.onProgress(0..1) reports how much of this print is sent; o.signal (AbortSignal) stops it.
   */
  async printCanvas(src, o = {}) {
    if (!this.connected) throw lostErr('Printer not connected.');
    if (this.busy) throw new Error('Printer is busy.');
    this.busy = true;
    try {
      const px = toBits(src, o.dither, o.threshold ?? 128);
      await this._send(encode(px, { darkness: o.darkness ?? this.cfg.darkness, speed: this.cfg.speed }), o);
    } finally { this.busy = false; }
  }

  async _send(bytes, { onProgress, signal } = {}) {
    const { chunkSize, delayMs } = this.cfg;
    let lastPct = -1;
    const epoch = this._epoch;   // any drop of the link ruins the bill being sent, even if it reconnects instantly
    for (let i = 0; i < bytes.length; i += chunkSize) {
      if (signal?.aborted) throw abortErr();
      if (epoch !== this._epoch || !this.device.gatt.connected) throw lostErr('Printer disconnected mid-print.');
      const part = bytes.slice(i, i + chunkSize);
      for (let t = 0; ; t++) {                       // "operation already in progress" is transient: retry briefly
        try { await this.char.writeValueWithoutResponse(part); break; }
        catch (e) { if (t >= 4 || epoch !== this._epoch || !this.device.gatt.connected) throw lostErr(epoch === this._epoch && this.device.gatt.connected ? e.message : 'Printer disconnected mid-print.'); await sleep(40); }
      }
      if (delayMs) await sleep(delayMs);
      if (onProgress) { const pct = Math.floor(((i + part.length) / bytes.length) * 100); if (pct !== lastPct) { lastPct = pct; onProgress(pct / 100); } }
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
