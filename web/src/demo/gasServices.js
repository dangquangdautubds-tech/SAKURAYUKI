/**
 * Giả lập các dịch vụ Google Apps Script (Sheets, Cache, Properties, Mail…) trong bộ nhớ,
 * để chạy chính file apps-script/Code.gs cho CHẾ ĐỘ XEM THỬ và kiểm thử. Không dùng ở bản thật.
 */
function sha256(str) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes = Array.from(new TextEncoder().encode(str));
  const len = bytes.length * 8;
  bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(Math.floor(len / 2 ** (i * 8)) & 0xff);
  let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) w[i] = (bytes[o+i*4] << 24) | (bytes[o+i*4+1] << 16) | (bytes[o+i*4+2] << 8) | bytes[o+i*4+3];
    for (let i = 16; i < 64; i++) { const s0 = r(w[i-15],7) ^ r(w[i-15],18) ^ (w[i-15] >>> 3), s1 = r(w[i-2],17) ^ r(w[i-2],19) ^ (w[i-2] >>> 10); w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0; }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (r(e,6) ^ r(e,11) ^ r(e,25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((r(a,2) ^ r(a,13) ^ r(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h = h.map((x, i) => (x + [a, b, c, d, e, f, g, hh][i]) | 0);
  }
  const out = []; h.forEach(x => { for (let i = 3; i >= 0; i--) { const v = (x >>> (i * 8)) & 0xff; out.push(v > 127 ? v - 256 : v); } });
  return out;
}

function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }

/** state = { sheets: {name: any[][]}, props: {}, cache: {}, triggers: [], outbox: [] } */
export function createServices(state, onChange = () => {}) {
  state.sheets ||= {}; state.props ||= {}; state.cache ||= {}; state.triggers ||= []; state.outbox ||= [];
  const changed = () => onChange(state);

  function Range(sh, r, c, nr = 1, nc = 1) {
    const rows = state.sheets[sh];
    const ensure = i => (rows[i] ||= []);
    const api = {
      setFontWeight: () => api, setBackground: () => api, setFontColor: () => api, setNumberFormat: () => api, setDataValidation: () => api,
      setValue(v) { ensure(r - 1)[c - 1] = v; changed(); return api; },
      setValues(vs) { vs.forEach((row, i) => row.forEach((v, j) => { ensure(r - 1 + i)[c - 1 + j] = v; })); changed(); return api; },
      getValue() { return (rows[r - 1] || [])[c - 1] ?? ''; },
      getValues() { return Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (rows[r - 1 + i] || [])[c - 1 + j] ?? '')); },
      getRow: () => r
    };
    return api;
  }
  const Sheet = name => ({
    appendRow(row) { state.sheets[name].push(Array.from(row, v => typeof v === 'string' && v[0] === "'" ? v.slice(1) : v)); changed(); },
    getLastRow: () => state.sheets[name].length,
    getLastColumn: () => state.sheets[name].reduce((m, r) => Math.max(m, r.length), 0),
    getRange: (r, c, nr, nc) => Range(name, r, c, nr, nc),
    setFrozenRows() {}, setColumnWidth() {},
    deleteRow(i) { state.sheets[name].splice(i - 1, 1); changed(); }
  });
  const unquote = v => typeof v === 'string' && v[0] === "'" ? v.slice(1) : v;
  // setValue/setValues với chuỗi bắt đầu bằng ' → lưu dạng chữ (giống Sheets)
  const origRange = Range;
  Range = function (sh, r, c, nr, nc) {
    const g = origRange(sh, r, c, nr, nc);
    const sv = g.setValue, svs = g.setValues;
    g.setValue = v => sv(unquote(v));
    g.setValues = vs => svs(vs.map(row => row.map(unquote)));
    return g;
  };

  const fmt = (d, tz, f) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(d)).map(x => [x.type, x.value]));
    return f.replace('yyyy', p.year).replace('yy', p.year.slice(2)).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('mm', p.minute);
  };
  const triggerBuilder = fn => { const t = { fn }; const b = { timeBased: () => b, everyDays: () => b, everyHours: () => b, atHour: h => (t.hour = h, b), inTimezone: () => b, create: () => { state.triggers.push(t); changed(); return t; } }; return b; };

  return {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: n => state.sheets[n] ? Sheet(n) : null, insertSheet: n => { state.sheets[n] = []; changed(); return Sheet(n); } }),
      newDataValidation: () => ({ requireValueInList: () => ({ build: () => ({}) }) })
    },
    CacheService: { getScriptCache: () => ({
      get: k => state.cache[k] ?? null, put: (k, v) => { state.cache[k] = v; }, remove: k => { delete state.cache[k]; },
      getAll: ks => Object.fromEntries(ks.filter(k => k in state.cache).map(k => [k, state.cache[k]])),
      putAll: m => Object.assign(state.cache, m)
    }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => state.props[k] ?? null, setProperty: (k, v) => { state.props[k] = String(v); changed(); },
      deleteProperty: k => { delete state.props[k]; changed(); }
    }) },
    Utilities: {
      formatDate: fmt, getUuid: uuid, sleep() {},
      base64Decode: s => Array.from(atob(s), ch => ch.charCodeAt(0)),
      newBlob: (b, m, n) => ({ bytes: b, mime: m, name: n }),
      computeDigest: (_a, s) => sha256(s), DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
    },
    UrlFetchApp: { fetch(url, o) { state.outbox.push({ type: /telegram/.test(url) ? 'telegram' : /line\.me/.test(url) ? 'line' : 'http', at: new Date().toISOString(), payload: o && o.payload }); changed(); return { getResponseCode: () => 200, getContentText: () => '{"errors":[{"message":"demo"}]}' }; } },
    MailApp: {
      sendEmail(o) { state.outbox.push({ type: 'email', at: new Date().toISOString(), to: o.to, subject: o.subject, html: o.htmlBody }); changed(); },
      getRemainingDailyQuota: () => 100
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 1 }, Permission: { VIEW: 1 },
      createFolder: () => ({ getId: () => 'DEMO_FOLDER' }),
      getFolderById: () => ({ createFile: () => { const id = 'DEMO' + Date.now(); return { getId: () => id, setSharing() {} }; } }),
      getFileById: () => ({ setTrashed() {} })
    },
    ContentService: { createTextOutput: s => ({ setMimeType() { return this; }, getContent: () => s }), MimeType: { JSON: 'json' } },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@demo.local' }) },
    ScriptApp: {
      getProjectTriggers: () => state.triggers.map(t => ({ getHandlerFunction: () => t.fn, _t: t })),
      deleteTrigger: x => { state.triggers = state.triggers.filter(t => t !== x._t); changed(); },
      newTrigger: triggerBuilder
    },
    console
  };
}

/** Lưu/đọc trạng thái có Date */
export const serialize = state => JSON.stringify(state, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && false) ? v : v, 0);
export function reviveDates(state) {
  for (const rows of Object.values(state.sheets || {})) rows.forEach(r => r.forEach((v, i) => { if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v)) r[i] = new Date(v); }));
  return state;
}
