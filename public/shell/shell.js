/*
 * Bill Labs shell: ONE navbar for every page (Home, Cab, Petrol, Uber).
 *
 *   [ < Home | Page title ]                 [page buttons] [Printers] [Download] [Menu]
 *
 *  - Back goes to the home page.
 *  - Menu opens a collapsible sidebar on the right: other pages, page extras, theme, install app.
 *  - Printers opens one window: thermal printer connection, test print (ASCII cat), print settings,
 *    and the page's print actions. A green dot on the button means the thermal printer is connected.
 *  - Download opens a window that asks which format you want.
 *
 * A page tells the shell what it offers with:
 *   BillLabs.page({
 *     title,                                   // optional, defaults to the page name
 *     menu:      [{ label, icon, run }],       // extra items under "This page" in the menu
 *     downloads: () => [{ label, desc, icon, group, run, closeFirst }],   // formats (or an array)
 *     print:     { label, thermal, system },   // functions used by the Printers window
 *   })
 *   BillLabs.slot()      -> element in the bar for page specific buttons
 *   BillLabs.printers    -> shared thermal printer (ensure(), settings, connected, name, on())
 */
(function () {
  "use strict";
  if (window.BillLabs) return;

  var scr = document.currentScript;
  var SRC = (scr && scr.src) || location.href;
  var BASE = new URL("./", SRC).href;        // .../shell/
  var ROOT = new URL("../", SRC).href;       // the app root = Home page
  var D = document, H = D.documentElement;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ---------------------------------------------------------------- icons */
  var P = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    car: '<path d="M5 17H3v-5l2-5a2 2 0 011.9-1.3h10.2A2 2 0 0119 7l2 5v5h-2"/><path d="M3 12h18"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>',
    fuel: '<path d="M14 13h2a2 2 0 012 2v2a2 2 0 004 0v-7a2 2 0 00-.6-1.4L18 5"/><path d="M14 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16"/><path d="M2 21h13M3 9h11"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
    install: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 7v7m0 0l-3-3m3 3l3-3"/><path d="M11 18h2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.3"/><path d="M12 17h.01"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
    zip: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a2 2 0 002 2h10a2 2 0 002-2V8"/><path d="M10 12h4"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    bt: '<path d="M7 7l10 10-5 5V2l5 5L7 17"/>'
  };
  var ic = function (n, s) {
    s = s || 20;
    return '<svg class="bl-ic" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || P.file) + "</svg>";
  };
  var BRAND = '<svg class="bl-logo" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#f0a919" d="M5 2h14v18.5l-2.33-1.6-2.34 1.6L12 18.9l-2.33 1.6-2.34-1.6L5 20.5z"/><path stroke="#14171d" stroke-width="1.6" stroke-linecap="round" d="M8.5 7h7M8.5 10.5h7M8.5 14h4"/></svg>';

  /* ---------------------------------------------------------------- pages */
  var PAGES = [
    { id: "home", label: "Home", href: ROOT, icon: "home" },
    { id: "cab", label: "Cab bill", href: ROOT + "#/cab-bill", icon: "car" },
    { id: "petrol", label: "Petrol bill", href: ROOT + "petrol-bill/", icon: "fuel" },
    { id: "uber", label: "Uber bill", href: ROOT + "uber-bill/", icon: "pin" }
  ];
  function current() {
    var p = location.pathname;
    if (/\/petrol-bill\//.test(p)) return "petrol";
    if (/\/uber-bill\//.test(p)) return "uber";
    return /^#\/cab-bill/.test(location.hash) ? "cab" : "home";
  }
  var cfg = {};                 // what the page offers (see BillLabs.page)

  /* ---------------------------------------------------------------- shared thermal printer */
  var PR = {
    key: "billlabs.thermal", devKey: "billlabs.thermal.dev",
    settings: { dark: 60, th: 160, gap: 2.5 },
    supported: !!navigator.bluetooth,
    state: navigator.bluetooth ? "off" : "unsupported",   // off | wait | reconnect | on | unsupported
    inst: null, mod: null, listeners: [],
    get thermal() { return this.inst; },
    get connected() { return !!(this.inst && this.inst.connected); },
    get name() { return this.inst ? this.inst.name : ""; },
    get known() { try { return !!localStorage.getItem(this.devKey); } catch (e) { return false; } },
    on: function (fn) { this.listeners.push(fn); },
    save: function () { try { localStorage.setItem(this.key, JSON.stringify(this.settings)); } catch (e) { /* not saved */ } },
    set: function (st) {
      this.state = st;
      paintDot(); paintPrinters();
      this.listeners.forEach(function (f) { try { f(st); } catch (e) { /* ignore */ } });
    },
    load: async function () {
      if (this.inst) return this.inst;
      this.mod = this.mod || await import(BASE + "thermal-printer.js");
      if (!this.mod.ThermalPrinter.supported) { this.set("unsupported"); throw new Error("Bluetooth printing needs Chrome or Edge (Android or desktop) on HTTPS. iPhone/Safari is not supported."); }
      var self = this;
      this.inst = new this.mod.ThermalPrinter({ onState: function (st) { self.set(st); } });
      return this.inst;
    },
    // Silent reconnect first. The picker only opens when no printer is known yet (it needs a tap).
    ensure: async function (picker) {
      var t = await this.load();
      if (t.connected) return t;
      try { await t.ensure({ picker: picker !== false }); }
      catch (e) { if (!t.connected) this.set("off"); throw e; }
      return t;
    },
    autoConnect: function (tries) {
      if (!this.supported) return;
      this.load().then(function (t) { PR.set(t.connected ? "on" : "off"); return t.autoConnect({ tries: tries || 3 }); }).catch(function () { /* not available */ });
    },
    // ASCII cat in the middle of the paper: a cheap test that uses very little paper.
    catCanvas: function () {
      var art = ["  /\\_/\\  ", " ( o.o ) ", "  > ^ <  "];
      var W = 384, size = 34, fam = '"Courier New",Courier,monospace';
      var m = D.createElement("canvas").getContext("2d");
      m.font = "bold " + size + "px " + fam;
      var cw = m.measureText("M").width;
      if (cw * art[0].length > W - 60) { size = Math.floor(size * (W - 60) / (cw * art[0].length)); }
      m.font = "bold " + size + "px " + fam; cw = m.measureText("M").width;
      var lh = Math.round(size * 1.1), cap = 24, pad = 10;
      var c = D.createElement("canvas"); c.width = W; c.height = pad * 2 + art.length * lh + cap;
      var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, c.height);
      g.fillStyle = "#000"; g.textBaseline = "top"; g.font = "bold " + size + "px " + fam;
      var x0 = Math.round((W - cw * art[0].length) / 2);
      art.forEach(function (l, i) { g.fillText(l, x0, pad + i * lh); });
      g.textAlign = "center"; g.font = "bold 16px " + fam;
      g.fillText("PRINTER OK", W / 2, pad + art.length * lh + 4);
      return c;
    },
    test: async function () {
      var t = await this.ensure(true);
      await t.printCanvas(this.catCanvas(), { threshold: this.settings.th, darkness: this.settings.dark });
    }
  };
  try { Object.assign(PR.settings, JSON.parse(localStorage.getItem(PR.key)) || {}); } catch (e) { /* defaults */ }

  /* ---------------------------------------------------------------- styles */
  var CSS = [
    ':root{--bl-bg:#fff;--bl-ink:#1b2430;--bl-mut:#566274;--bl-line:#d8dce3;--bl-hover:#eef0f4;--bl-field:#f3f4f7;--bl-acc:#f0a919;--bl-acc-ink:#2a1c00;--bl-ok:#30a46c;--bl-warn:#f5a524;--bl-err:#b3261e;--bl-h:52px}',
    ':root[data-theme=dark]{--bl-bg:#14171d;--bl-ink:#e5e7eb;--bl-mut:#9ca3af;--bl-line:#333a47;--bl-hover:#262b36;--bl-field:#0e1015;--bl-err:#f2877f}',
    '.bl-bar,.bl-side,.bl-dlg,.bl-scrim{font:14px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--bl-ink);-webkit-text-size-adjust:100%}',
    '.bl-bar *,.bl-side *,.bl-dlg *{box-sizing:border-box}',
    '.bl-bar{position:sticky;top:0;z-index:60;height:var(--bl-h);display:flex;align-items:center;gap:8px;padding:0 max(12px,env(safe-area-inset-right)) 0 max(12px,env(safe-area-inset-left));background:var(--bl-bg);border-bottom:1px solid var(--bl-line)}',
    '.bl-left{display:flex;align-items:center;gap:8px;min-width:0;flex:1}',
    '.bl-back,.bl-brand{display:inline-flex;align-items:center;gap:6px;height:40px;color:var(--bl-ink);text-decoration:none;font-weight:700;font-size:15px;flex:none;border-radius:10px}',
    '.bl-back{padding:0 12px 0 6px;border:1px solid var(--bl-line)}.bl-back:hover{background:var(--bl-hover)}',
    '.bl-brand{font-size:17px}',
    '.bl-sep{width:1px;height:22px;background:var(--bl-line);flex:none}',
    '.bl-title{display:flex;align-items:center;gap:8px;min-width:0;font-weight:700;font-size:16px}.bl-title span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.bl-right{display:flex;align-items:center;gap:8px;flex:none}.bl-slot{display:flex;align-items:center;gap:8px}',
    '.bl-ib{position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;margin:0;padding:0;border:1px solid var(--bl-line);border-radius:10px;background:transparent;color:var(--bl-ink);cursor:pointer;font:inherit;flex:none;text-decoration:none}',
    '.bl-ib:hover:not(:disabled){background:var(--bl-hover)}.bl-ib[hidden]{display:none}',
    '.bl-bar a:focus-visible,.bl-bar button:focus-visible,.bl-side a:focus-visible,.bl-side button:focus-visible,.bl-dlg button:focus-visible,.bl-dlg input:focus-visible{outline:2px solid var(--bl-acc);outline-offset:2px}',
    '.bl-pdot{position:absolute;top:4px;right:4px;width:11px;height:11px;border-radius:50%;background:var(--bl-ok);border:2px solid var(--bl-bg);display:none}',
    '.bl-pdot.on{display:block}.bl-pdot.wait{display:block;background:var(--bl-warn);animation:blp 1s infinite}@keyframes blp{50%{opacity:.35}}',
    '.bl-ic{flex:none}',
    /* sidebar (right) */
    '.bl-scrim{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.5);opacity:0;visibility:hidden;transition:opacity .2s,visibility 0s .2s}',
    '.bl-scrim.on{opacity:1;visibility:visible;transition:opacity .2s}',
    '.bl-side{position:fixed;top:0;right:0;bottom:0;z-index:2001;width:min(320px,86vw);display:flex;flex-direction:column;background:var(--bl-bg);border-left:1px solid var(--bl-line);box-shadow:-12px 0 40px rgba(0,0,0,.25);transform:translateX(104%);visibility:hidden;transition:transform .22s ease,visibility 0s .22s;padding-bottom:env(safe-area-inset-bottom)}',
    '.bl-side.open{transform:none;visibility:visible;transition:transform .22s ease}',
    '.bl-side-h{display:flex;align-items:center;justify-content:space-between;height:var(--bl-h);padding:0 12px 0 16px;border-bottom:1px solid var(--bl-line);flex:none}',
    '.bl-side-t{font-weight:700;font-size:16px}.bl-side-b{overflow:auto;padding:6px 10px 16px}',
    '.bl-sec{margin:14px 6px 6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--bl-mut)}',
    '.bl-item{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;margin:0;padding:8px 10px;border:0;border-radius:10px;background:transparent;color:var(--bl-ink);font:inherit;font-size:15px;text-align:left;text-decoration:none;cursor:pointer}',
    '.bl-item:hover{background:var(--bl-hover)}.bl-item.on{background:var(--bl-hover);font-weight:700;box-shadow:inset 3px 0 0 var(--bl-acc)}',
    '.bl-item.static{cursor:default}.bl-item.static:hover{background:transparent}.bl-item.ok .bl-ic{color:var(--bl-ok)}',
    '.bl-item>span:nth-child(2){flex:1}',
    '.bl-sw{position:relative;width:40px;height:22px;border-radius:99px;background:var(--bl-line);flex:none!important}.bl-sw i{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s}.bl-sw.on{background:var(--bl-ok)}.bl-sw.on i{transform:translateX(18px)}',
    '.bl-hint{margin:2px 10px 6px 46px;font-size:13px;color:var(--bl-mut)}.bl-hint[hidden]{display:none}',
    /* dialogs */
    '.bl-dlg{position:fixed;inset:0;z-index:2002;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55)}.bl-dlg[hidden]{display:none}',
    '.bl-card{width:100%;max-width:460px;max-height:min(86vh,720px);display:flex;flex-direction:column;background:var(--bl-bg);border:1px solid var(--bl-line);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden}',
    '.bl-card-h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 12px 12px 18px;border-bottom:1px solid var(--bl-line);flex:none}',
    '.bl-card-t{font-weight:700;font-size:17px}.bl-card-b{overflow:auto;padding:4px 18px 18px;-webkit-overflow-scrolling:touch}',
    '.bl-sec2{margin:16px 0 8px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--bl-mut)}',
    '.bl-status{display:flex;align-items:center;gap:9px;font-size:15px}.bl-sd{width:11px;height:11px;border-radius:50%;background:#8b8d98;flex:none}.bl-sd.on{background:var(--bl-ok)}.bl-sd.wait{background:var(--bl-warn)}',
    '.bl-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
    '.bl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;margin:0;padding:0 14px;border:1px solid var(--bl-line);border-radius:10px;background:var(--bl-field);color:var(--bl-ink);font:inherit;font-size:14px;cursor:pointer}',
    '.bl-btn:hover:not(:disabled){border-color:var(--bl-acc)}.bl-btn:disabled{opacity:.5;cursor:default}.bl-btn[hidden]{display:none}',
    '.bl-btn.pri{background:var(--bl-acc);border-color:var(--bl-acc);color:var(--bl-acc-ink);font-weight:700}.bl-btn.ghost{background:transparent}',
    '.bl-note{margin:10px 0 0;font-size:13px;line-height:1.5;color:var(--bl-mut)}',
    '.bl-msg{margin:8px 0 0;font-size:13px;min-height:0}.bl-msg.err{color:var(--bl-err)}.bl-msg:empty{display:none}',
    '.bl-sl{margin:12px 0 0}.bl-sl div{display:flex;justify-content:space-between;font-size:14px}.bl-sl b{font-weight:600;color:var(--bl-mut)}',
    '.bl-dlg input[type=range]{display:block;width:100%;margin:6px 0 0;padding:0;border:0;background:none;accent-color:var(--bl-acc);height:24px}',
    '.bl-opt{display:flex;align-items:center;justify-content:flex-start;gap:14px;width:100%;margin:0 0 8px;padding:12px 14px;border:1px solid var(--bl-line);border-radius:12px;background:var(--bl-field);color:var(--bl-ink);font:inherit;text-align:left;cursor:pointer}',
    '.bl-opt:hover:not(:disabled){border-color:var(--bl-acc)}.bl-opt:disabled{opacity:.5;cursor:default}',
    '.bl-oi{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:var(--bl-hover);color:var(--bl-acc);flex:none}',
    '.bl-ot{display:flex;flex-direction:column;gap:2px;min-width:0}.bl-ot b{font-size:15px}.bl-ot small{font-size:12.5px;color:var(--bl-mut);line-height:1.4}',
    '.bl-empty{margin:16px 0 4px;color:var(--bl-mut)}',
    'html.bl-lock{overflow:hidden}',
    '@media (max-width:420px){.bl-back span{display:none}.bl-back{padding:0 8px 0 4px}.bl-title{font-size:15px}.bl-bar{gap:6px}.bl-right,.bl-slot{gap:6px}.bl-ib{width:38px;height:38px}}',
    '@media (prefers-reduced-motion:reduce){.bl-side,.bl-scrim,.bl-sw i{transition:none}.bl-pdot.wait{animation:none}}',
    '@media print{.bl-bar,.bl-side,.bl-scrim,.bl-dlg{display:none!important}}'
  ].join("\n");

  /* ---------------------------------------------------------------- dom */
  var bar, side, scrim, dlPr, dlDl, openEl = null, lastFocus = null, dlItems = [];

  function mkDlg(id, title) {
    var el = D.createElement("div");
    el.className = "bl-dlg"; el.id = id; el.hidden = true;
    el.innerHTML = '<div class="bl-card" role="dialog" aria-modal="true" aria-labelledby="' + id + '-t"><div class="bl-card-h"><span class="bl-card-t" id="' + id + '-t">' + title + '</span><button class="bl-ib" type="button" data-bl="close" aria-label="Close">' + ic("close") + '</button></div><div class="bl-card-b" id="' + id + '-b"></div></div>';
    D.body.appendChild(el);
    el.addEventListener("mousedown", function (e) { if (e.target === el) close(); });
    return el;
  }

  function build() {
    var st = D.createElement("style"); st.id = "bl-style"; st.textContent = CSS; D.head.appendChild(st);

    bar = D.createElement("header"); bar.className = "bl-bar"; bar.id = "bl-bar";
    bar.innerHTML =
      '<div class="bl-left" id="bl-left"></div>' +
      '<div class="bl-right">' +
        '<div class="bl-slot" id="bl-slot"></div>' +
        '<button class="bl-ib" type="button" id="bl-printers" data-bl="printers" aria-label="Printers" title="Printers">' + ic("printer") + '<span class="bl-pdot" id="bl-pdot"></span></button>' +
        '<button class="bl-ib" type="button" id="bl-dl" data-bl="downloads" aria-label="Download" title="Download" hidden>' + ic("download") + '</button>' +
        '<button class="bl-ib" type="button" id="bl-menu" data-bl="menu" aria-label="Menu" aria-haspopup="true" aria-expanded="false" title="Menu">' + ic("menu") + '</button>' +
      '</div>';
    D.body.insertBefore(bar, D.body.firstChild);

    scrim = D.createElement("div"); scrim.className = "bl-scrim"; scrim.id = "bl-scrim"; D.body.appendChild(scrim);
    scrim.addEventListener("click", close);
    side = D.createElement("aside"); side.className = "bl-side"; side.id = "bl-side"; side.setAttribute("aria-label", "Menu"); side.setAttribute("aria-hidden", "true");
    D.body.appendChild(side);
    dlPr = mkDlg("bl-pr", "Printers");
    dlDl = mkDlg("bl-dlx", "Download");

    D.addEventListener("click", onClick);
    D.addEventListener("keydown", onKey);
    addEventListener("hashchange", function () { renderBar(); if (openEl === side) renderSide(); });
    renderBar(); renderSide(); paintDot();
  }

  function renderBar() {
    if (!bar) return;
    var cur = current(), pg = PAGES.filter(function (p) { return p.id === cur; })[0];
    $("#bl-left").innerHTML = cur === "home"
      ? '<a class="bl-brand" href="' + ROOT + '" aria-label="Bill Labs home">' + BRAND + '<span>Bill Labs</span></a>'
      : '<a class="bl-back" href="' + ROOT + '" aria-label="Back to home">' + ic("back") + '<span>Home</span></a><span class="bl-sep"></span><span class="bl-title">' + ic(pg.icon, 18) + '<span>' + esc(cfg.title || pg.label) + '</span></span>';
    $("#bl-dl").hidden = !cfg.downloads;
  }

  /* ---------------------------------------------------------------- install app */
  var dip = null;
  var standalone = function () { return (matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; };
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); dip = e; renderSide(); });
  addEventListener("appinstalled", function () { dip = null; renderSide(); });

  function renderSide() {
    if (!side) return;
    var cur = current(), dark = H.dataset.theme === "dark", h = "";
    h += '<div class="bl-side-h"><span class="bl-side-t">Menu</span><button class="bl-ib" type="button" data-bl="close" aria-label="Close menu">' + ic("close") + '</button></div><div class="bl-side-b">';
    h += '<div class="bl-sec">Pages</div>';
    PAGES.forEach(function (p) { h += '<a class="bl-item' + (p.id === cur ? " on" : "") + '" href="' + p.href + '"' + (p.id === cur ? ' aria-current="page"' : "") + ">" + ic(p.icon) + "<span>" + p.label + "</span></a>"; });
    if (cfg.menu && cfg.menu.length) {
      h += '<div class="bl-sec">This page</div>';
      cfg.menu.forEach(function (m, i) { h += '<button class="bl-item" type="button" data-bl="pm" data-i="' + i + '">' + ic(m.icon || "help") + "<span>" + esc(m.label) + "</span></button>"; });
    }
    h += '<div class="bl-sec">Settings</div>';
    h += '<button class="bl-item" type="button" role="switch" aria-checked="' + dark + '" data-bl="theme">' + ic(dark ? "moon" : "sun") + "<span>Dark theme</span>" + '<span class="bl-sw' + (dark ? " on" : "") + '"><i></i></span></button>';
    h += '<div class="bl-sec">App</div>';
    h += standalone()
      ? '<div class="bl-item static ok">' + ic("check") + "<span>App installed</span></div>"
      : '<button class="bl-item" type="button" data-bl="install">' + ic("install") + "<span>Install app</span></button><div class=\"bl-hint\" id=\"bl-ihint\" hidden></div>";
    h += "</div>";
    side.innerHTML = h;
  }

  /* ---------------------------------------------------------------- open / close */
  function lock(on) { H.classList.toggle("bl-lock", on); }
  function close() {
    if (!openEl) return;
    var el = openEl; openEl = null;
    if (el === side) { side.classList.remove("open"); side.setAttribute("aria-hidden", "true"); scrim.classList.remove("on"); $("#bl-menu").setAttribute("aria-expanded", "false"); }
    else el.hidden = true;
    lock(false);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* gone */ } }
    lastFocus = null;
  }
  function focusIn(el) { var f = el.querySelector("button:not([hidden]):not(:disabled),a[href],input"); if (f) f.focus(); }
  function openMenu() {
    if (openEl) close();
    lastFocus = D.activeElement; renderSide();
    side.classList.add("open"); side.setAttribute("aria-hidden", "false"); scrim.classList.add("on");
    $("#bl-menu").setAttribute("aria-expanded", "true"); openEl = side; lock(true);
    setTimeout(function () { focusIn(side); }, 30);
  }
  function openDlg(el) { if (openEl) close(); lastFocus = D.activeElement; el.hidden = false; openEl = el; lock(true); setTimeout(function () { focusIn(el); }, 30); }

  /* ---------------------------------------------------------------- Printers window */
  function sliderRow(id, label, min, max, step, val, fmt) {
    return '<div class="bl-sl"><div><span>' + label + '</span><b id="' + id + 'v">' + fmt(val) + '</b></div><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" aria-label="' + label + '"></div>';
  }
  function openPrinters() {
    var s = PR.settings, pr = cfg.print || {}, h = "";
    h += '<div class="bl-sec2">Thermal printer (Bluetooth)</div>';
    h += '<div class="bl-status"><span class="bl-sd" id="bl-sd"></span><b id="bl-stx"></b></div>';
    h += '<div class="bl-row"><button class="bl-btn pri" type="button" data-bl="pconn"><span>Connect printer</span></button>' +
         '<button class="bl-btn" type="button" data-bl="pdis">Disconnect</button>' +
         '<button class="bl-btn" type="button" data-bl="ptest">Test print (cat)</button>' +
         '<button class="bl-btn ghost" type="button" data-bl="pforget">Forget printer</button></div>';
    h += '<p class="bl-note" id="bl-pnote"></p><div class="bl-msg" id="bl-pmsg" role="status"></div>';
    h += '<div class="bl-sec2">Print settings</div>';
    h += sliderRow("bl-sdk", "Darkness", 20, 100, 5, s.dark, function (v) { return v + "%"; });
    h += sliderRow("bl-sth", "Text sharpness", 90, 200, 5, s.th, function (v) { return v; });
    h += sliderRow("bl-sgp", "Pause between bills", 0, 10, 0.5, s.gap, function (v) { return v + "s"; });
    if (pr.thermal || pr.system) {
      h += '<div class="bl-sec2">' + esc(pr.label || "Print this page") + "</div><div class=\"bl-row\">" +
        (pr.thermal ? '<button class="bl-btn pri" type="button" data-bl="pthermal">' + ic("bt", 18) + "<span>Thermal printer</span></button>" : "") +
        (pr.system ? '<button class="bl-btn" type="button" data-bl="psys">' + ic("printer", 18) + "<span>System printer</span></button>" : "") + "</div>";
    }
    h += '<div class="bl-sec2">System printer</div><p class="bl-note" style="margin-top:0">The system printer is your browser\'s own print window: any printer connected to this device, or Save as PDF.</p>';
    $("#bl-pr-b").innerHTML = h;
    openDlg(dlPr); paintPrinters();
  }
  var LAB = { off: "Not connected", wait: "Connecting...", reconnect: "Connecting...", on: "Connected", unsupported: "Bluetooth not available" };
  function paintPrinters() {
    if (!dlPr || dlPr.hidden || !$("#bl-sd")) return;
    var st = PR.state, on = st === "on", pend = st === "wait" || st === "reconnect", uns = st === "unsupported";
    $("#bl-sd").className = "bl-sd " + (on ? "on" : pend ? "wait" : "");
    $("#bl-stx").textContent = LAB[st] + (on && PR.name ? ": " + PR.name : "");
    var q = function (a) { return $('[data-bl="' + a + '"]', dlPr); };
    q("pconn").hidden = on || uns; q("pconn").disabled = pend; q("pconn").firstChild.textContent = pend ? "Connecting..." : "Connect printer";
    q("pdis").hidden = !on; q("ptest").hidden = !on; q("pforget").hidden = uns || !(on || PR.known);
    var noMem = PR.supported && PR.mod && !PR.mod.ThermalPrinter.canRemember;
    $("#bl-pnote").textContent = uns ? "This browser has no Web Bluetooth. Use Chrome or Edge on Android or desktop (HTTPS). In Brave, enable brave://flags/#brave-web-bluetooth-api. iPhone/Safari is not supported."
      : on ? "Ready. It reconnects by itself if the link drops, so you do not need to pair again."
      : st === "wait" ? "Pick your printer (name starts with SC03) in the browser window."
      : st === "reconnect" ? "Looking for your printer. Switch it on and keep it close, it connects by itself."
      : (PR.known ? "Switch the printer on and keep it close, it connects by itself." : "First time only: press Connect and choose the printer (name starts with SC03). After that it connects by itself.") +
        (noMem ? " This browser cannot remember Bluetooth printers, so it will ask once each time the page is opened. If your Chrome has chrome://flags/#enable-web-bluetooth-new-permissions-backend, turning it on lets it remember." : "");
  }
  function pmsg(t, err) { var m = $("#bl-pmsg"); if (m) { m.textContent = t || ""; m.className = "bl-msg" + (err ? " err" : ""); } }
  function paintDot() {
    var d = $("#bl-pdot"); if (!d) return;
    d.className = "bl-pdot" + (PR.state === "on" ? " on" : (PR.state === "wait" || PR.state === "reconnect") ? " wait" : "");
    var b = $("#bl-printers");
    if (b) { var t = PR.state === "on" ? "Printers (thermal printer connected" + (PR.name ? ": " + PR.name : "") + ")" : "Printers"; b.setAttribute("title", t); b.setAttribute("aria-label", t); }
  }

  /* ---------------------------------------------------------------- Download window */
  function openDownloads() {
    var raw = typeof cfg.downloads === "function" ? cfg.downloads() : cfg.downloads;
    dlItems = (raw || []).filter(Boolean);
    var b = $("#bl-dlx-b"), h = '<p class="bl-note" style="margin-top:12px">Which format do you want?</p>';
    if (!dlItems.length) h += '<p class="bl-empty">Nothing to download on this page yet.</p>';
    var last = null;
    dlItems.forEach(function (it, i) {
      var g = it.group || "";
      if (g !== last) { h += g ? '<div class="bl-sec2">' + esc(g) + "</div>" : ""; last = g; }
      h += '<button class="bl-opt" type="button" data-bl="dl" data-i="' + i + '"' + (it.disabled ? " disabled" : "") + '><span class="bl-oi">' + ic(it.icon || "file") + '</span><span class="bl-ot"><b>' + esc(it.label) + "</b>" + (it.desc ? "<small>" + esc(it.desc) + "</small>" : "") + "</span></button>";
    });
    h += '<div class="bl-msg" id="bl-dmsg" role="status"></div>';
    b.innerHTML = h; openDlg(dlDl);
  }
  async function runDownload(i) {
    var it = dlItems[i]; if (!it || !it.run) return;
    var msg = $("#bl-dmsg"), btns = dlDl.querySelectorAll(".bl-opt");
    if (it.closeFirst) { close(); setTimeout(function () { try { it.run(); } catch (e) { /* page handles */ } }, 60); return; }
    btns.forEach(function (x) { x.disabled = true; });
    msg.className = "bl-msg"; msg.textContent = "Preparing " + it.label + "...";
    try { await it.run(); close(); }
    catch (e) { msg.className = "bl-msg err"; msg.textContent = (e && e.friendly) ? e.message : "Could not make the file: " + ((e && e.message) || e); btns.forEach(function (x, k) { x.disabled = !!dlItems[k].disabled; }); }
  }

  /* ---------------------------------------------------------------- events */
  async function onClick(e) {
    var t = e.target.closest ? e.target.closest("[data-bl]") : null;
    if (!t) { var a = e.target.closest && e.target.closest(".bl-side a.bl-item"); if (a) setTimeout(close, 0); return; }
    var act = t.getAttribute("data-bl");
    switch (act) {
      case "menu": return openEl === side ? close() : openMenu();
      case "printers": return openPrinters();
      case "downloads": return openDownloads();
      case "close": return close();
      case "theme": {
        var nx = H.dataset.theme === "dark" ? "light" : "dark"; H.dataset.theme = nx;
        try { localStorage.setItem("billlabs.theme", nx); } catch (x) { /* not saved */ }
        renderSide(); var b = $('[data-bl="theme"]', side); if (b) b.focus(); return;
      }
      case "pm": { var m = (cfg.menu || [])[+t.getAttribute("data-i")]; close(); if (m && m.run) setTimeout(m.run, 30); return; }
      case "install": {
        var hint = $("#bl-ihint");
        if (dip) { try { dip.prompt(); await dip.userChoice; } catch (x) { /* dismissed */ } dip = null; renderSide(); return; }
        hint.hidden = false;
        hint.textContent = isIOS ? "Tap the Share button, then choose Add to Home Screen."
          : "Open your browser menu and choose Install app (or Add to Home screen). If you do not see it, this browser may not support installing.";
        return;
      }
      case "pconn": pmsg(""); try { await PR.ensure(true); } catch (x) { if (!x || x.name !== "NotFoundError") pmsg("Could not connect: " + ((x && x.message) || x), true); } return;
      case "pdis": if (PR.inst) PR.inst.disconnect(); pmsg(""); return;
      case "pforget": if (!confirm("Forget this printer? Next time you will choose it from the list again.")) return;
        if (PR.inst) await PR.inst.forget(); else { try { localStorage.removeItem(PR.devKey); } catch (x) { /* ignore */ } } PR.set("off"); return;
      case "ptest": { t.disabled = true; pmsg("Printing the cat..."); try { await PR.test(); pmsg("Done. Meow."); } catch (x) { if (!x || x.name !== "NotFoundError") pmsg("Test print failed: " + ((x && x.message) || x), true); else pmsg(""); } t.disabled = false; return; }
      case "pthermal": { var f = cfg.print && cfg.print.thermal; close(); if (f) setTimeout(f, 30); return; }
      case "psys": { var g = cfg.print && cfg.print.system; close(); if (g) setTimeout(g, 120); return; }
      case "dl": return runDownload(+t.getAttribute("data-i"));
    }
  }
  function onKey(e) {
    if (!openEl) return;
    if (e.key === "Tab") {
      var f = [].slice.call(openEl.querySelectorAll("a[href],button:not(:disabled):not([hidden]),input")).filter(function (x) { return x.offsetParent !== null || x === D.activeElement; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  D.addEventListener("input", function (e) {
    var el = e.target, s = PR.settings;
    if (el.id === "bl-sdk") { s.dark = +el.value; $("#bl-sdkv").textContent = s.dark + "%"; PR.save(); }
    else if (el.id === "bl-sth") { s.th = +el.value; $("#bl-sthv").textContent = s.th; PR.save(); }
    else if (el.id === "bl-sgp") { s.gap = +el.value; $("#bl-sgpv").textContent = s.gap + "s"; PR.save(); }
  });
  // Escape must beat each page's own Escape handlers while a shell window is open
  D.addEventListener("keydown", function (e) { if (e.key === "Escape" && openEl) { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);

  /* ---------------------------------------------------------------- public api */
  window.BillLabs = {
    page: function (o) { cfg = o || {}; renderBar(); if (openEl === side) renderSide(); },
    slot: function () { return $("#bl-slot"); },
    open: function (w) { if (w === "printers") openPrinters(); else if (w === "downloads") openDownloads(); else if (w === "menu") openMenu(); },
    close: close,
    printers: PR,
    root: ROOT
  };

  if (D.body) build(); else D.addEventListener("DOMContentLoaded", build);

  // connect to the remembered printer by itself: on load, and when the tab comes back
  PR.autoConnect();
  D.addEventListener("visibilitychange", function () { if (!D.hidden && PR.inst && !PR.connected) PR.inst.autoConnect({ tries: 1 }); });

  // app shell for offline use (the petrol page registers its own, see data-sw="off")
  if (!(scr && scr.dataset.sw === "off") && "serviceWorker" in navigator && /^https?:/.test(location.protocol) && location.port !== "5173") {
    addEventListener("load", function () { navigator.serviceWorker.register(ROOT + "sw.js").catch(function () { /* optional */ }); });
  }
})();
