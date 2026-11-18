const VT_RU_NUM = { ноль: 0, один: 1, одна: 1, одно: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
  одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19,
  двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90,
  сто: 100, двести: 200, триста: 300, четыреста: 400, пятьсот: 500, шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900,
  двух: 2, трех: 3, четырех: 4, пяти: 5, шести: 6, семи: 7, восьми: 8, девяти: 9, десяти: 10, двенадцати: 12, пятнадцати: 15, двадцати: 20, тридцати: 30, сорока: 40, пятидесяти: 50, ста: 100, сотни: 100, сотен: 100,
  тысяча: 1e3, тысячи: 1e3, тысяч: 1e3, тысячу: 1e3, миллион: 1e6, миллиона: 1e6, миллионов: 1e6, миллиард: 1e9, миллиарда: 1e9, миллиардов: 1e9 };

function vtNorm(w) { return String(w == null ? "" : w).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, ""); }

function vtNumOf(w) {
  const s = String(w == null ? "" : w).replace(/[\s\u00a0]/g, "").replace(/^№/, "");
  if (/^\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(",", "."));
  const n = vtNorm(w);
  return Object.prototype.hasOwnProperty.call(VT_RU_NUM, n) && VT_RU_NUM[n] < 1e3 ? VT_RU_NUM[n] : null;
}

function vtWhen(words, q, n, def) {
  if (!Array.isArray(words) || !words.length || q == null) return def === undefined ? null : def;
  const qn = vtNorm(q), num = vtNumOf(q);
  n = Math.max(1, Math.floor(+n || 1));
  if (!qn) return def === undefined ? null : def;
  const END = ["иями", "ями", "ами", "ого", "его", "ому", "ему", "ыми", "ими", "ая", "яя", "ое", "ее", "ые", "ие", "ый", "ий", "ой", "ую", "юю", "ых", "их", "ым", "им", "ом", "ем", "ам", "ям", "ах", "ях", "ов", "ев", "ей", "ут", "ют", "ат", "ят", "ит", "ет", "ть", "ти", "а", "я", "о", "е", "ы", "и", "у", "ю", "ь", "s"];
  let st = qn;
  for (const e of END) if (st.length - e.length >= 3 && st.endsWith(e)) { st = st.slice(0, -e.length); break; }
  const pre = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
  const hit = [];
  for (const x of words) {
    if (!x) continue;
    const wn = vtNorm(x.w);
    if (!wn) continue;
    if (num != null) { if (vtNumOf(x.w) === num) hit.push(x); continue; }
    if (wn === qn) { hit.push(x); continue; }
    const p = pre(st, wn);
    if (p >= Math.max(3, Math.min(st.length, wn.length) - 1) && Math.abs(wn.length - qn.length) <= 3 + Math.max(0, qn.length - st.length)) hit.push(x);
  }
  if (!hit.length) return def === undefined ? null : def;
  return +hit[Math.min(n, hit.length) - 1].t0;
}

function SFX_LIB(R) {
  const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * R)));
  const rnd = (seed) => { let x = seed || 1; return () => ((x = (x * 16807) % 2147483647) / 2147483647) * 2 - 1; };
  function partials(f, list, sec, att = 0.002) { // [ratio, amp, decay]
    const o = buf(sec);
    for (let i = 0; i < o.length; i++) { const t = i / R; let v = 0; for (const [k, a, d] of list) v += a * Math.sin(2 * Math.PI * f * k * t) * Math.exp(-t * d); o[i] = v * Math.min(1, t / att); }
    return o;
  }
  function sweep(f0, f1, sec, decay, type = "sine", curve = 1) {
    const o = buf(sec); let ph = 0;
    for (let i = 0; i < o.length; i++) { const p = i / o.length, f = f0 + (f1 - f0) * Math.pow(p, curve); ph += f / R; const x = ph % 1;
      const w = type === "tri" ? 4 * Math.abs(x - 0.5) - 1 : type === "square" ? (x < .5 ? .6 : -.6) : Math.sin(2 * Math.PI * x);
      o[i] = w * Math.exp(-p * sec * decay) * Math.min(1, i / 60) * (p > .96 ? (1 - p) / .04 : 1); }
    return o;
  }
  function bandNoise(sec, fc, q, env, seed = 5) { // полосовой шум (biquad)
    const o = buf(sec), r = rnd(seed), w = 2 * Math.PI * fc / R, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0; let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < o.length; i++) { const x = r(); const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; o[i] = y * env(i / o.length, i / R); }
    return o;
  }
  function pluck(f, sec, bright = 0.5, seed = 3) { // струна (Карплус-Стронг)
    const o = buf(sec), n = Math.round(R / f), line = new Float32Array(n), r = rnd(seed);
    for (let i = 0; i < n; i++) line[i] = r();
    let p = 0, prev = 0;
    for (let i = 0; i < o.length; i++) { const cur = line[p]; const nx = line[(p + 1) % n]; line[p] = (cur * (0.5 + bright * 0.5) + nx * (0.5 - bright * 0.5)) * 0.996; o[i] = cur; prev = cur; p = (p + 1) % n; }
    return o;
  }
  function fmBell(f, ratio, index, sec, decay) {
    const o = buf(sec);
    for (let i = 0; i < o.length; i++) { const t = i / R, e = Math.exp(-t * decay); o[i] = Math.sin(2 * Math.PI * f * t + index * e * Math.sin(2 * Math.PI * f * ratio * t)) * e * Math.min(1, t / 0.002); }
    return o;
  }
  function mix(len, parts) { const o = buf(len); for (const [at, b, g = 1] of parts) { const s = Math.round(at * R); for (let i = 0; i < b.length && s + i < o.length; i++) o[s + i] += b[i] * g; } return o; }
  const S = {
    pop_soft: () => mix(0.14, [[0, sweep(520, 280, 0.14, 28)], [0, bandNoise(0.01, 3000, 1, (p) => 1 - p), 0.25]]),
    bubble: () => sweep(320, 1100, 0.12, 20, "sine", 0.6),
    marimba: () => partials(660, [[1, 1, 9], [3.93, 0.35, 28], [9.8, 0.12, 60]], 0.6),
    wood: () => partials(820, [[1, 1, 40], [1.62, 0.5, 55], [2.6, 0.3, 75]], 0.16),
    kalimba: () => partials(880, [[1, 1, 6], [5.4, 0.18, 30], [9.1, 0.08, 50]], 0.9),
    drop: () => mix(0.25, [[0, sweep(1400, 380, 0.09, 22)], [0.05, partials(380, [[1, 0.5, 30]], 0.2)]]),
    sparkle: () => { const r = rnd(3), parts = []; for (let i = 0; i < 7; i++) parts.push([(r() + 1) / 2 * 0.45, partials(1800 + (r() + 1) * 1300, [[1, 1, 25]], 0.2), 0.4]); return mix(0.65, parts); },
    success: () => mix(0.7, [[0, partials(784, [[1, 1, 7], [3.9, 0.2, 30]], 0.5)], [0.12, partials(1046.5, [[1, 1, 6], [3.9, 0.2, 30]], 0.55)]]),
    notify: () => mix(0.6, [523, 659, 784].map((f, i) => [i * 0.08, partials(f, [[1, 1, 9], [2, 0.15, 20]], 0.35), 0.8])),
    magic: () => mix(1, [[0, sweep(600, 1800, 0.6, 2, "sine", 1.3), 0.4], [0.3, S.sparkle(), 0.8]]),
    tick: () => partials(2200, [[1, 1, 120]], 0.04, 0.0005),
    type: () => mix(0.05, [[0, bandNoise(0.03, 4000, 1.5, (p) => Math.exp(-p * 8), 11)], [0, partials(1800, [[1, 0.5, 150]], 0.03, 0.0005)]]),
    click: () => mix(0.03, [[0, partials(1300, [[1, 1, 200]], 0.03, 0.0003)], [0, bandNoise(0.01, 2500, 1, (p) => 1 - p), 0.3]]),
    counter: () => mix(0.62, [...Array(10)].map((_, i) => [i * 0.055 + i * i * 0.0012, partials(2000 + i * 40, [[1, 1, 120]], 0.03, 0.0005), 0.7])),
    bamboo: () => mix(0.25, [[0, partials(520, [[1, 1, 25], [2.1, 0.35, 40]], 0.25, 0.0008)], [0, bandNoise(0.015, 1800, 1, (p) => 1 - p, 6), 0.25]]),
    woodblock: () => partials(1250, [[1, 1, 50], [2.3, 0.4, 70]], 0.12, 0.0004),
    rim: () => mix(0.1, [[0, bandNoise(0.06, 2600, 2, (p) => Math.exp(-p * 9), 8)], [0, partials(820, [[1, 0.6, 80]], 0.06, 0.0004)]]),
    pop_high: () => mix(0.1, [[0, sweep(900, 520, 0.1, 35)], [0, bandNoise(0.008, 4000, 1, (p) => 1 - p), 0.2]]),
    pop_double: () => mix(0.26, [[0, sweep(520, 280, 0.12, 30)], [0.11, sweep(700, 380, 0.12, 30), 0.85]]),
    bubble_down: () => sweep(1100, 320, 0.13, 18, "sine", 0.7),
    marimba_run: () => mix(0.7, [523, 587, 659, 784, 880, 1046.5].map((f, i) => [i * 0.045, partials(f, [[1, 1, 12], [3.93, 0.3, 30]], 0.35), 0.75])),
    kalimba_run: () => mix(0.9, [587, 698.5, 880, 1046.5, 1174.7].map((f, i) => [i * 0.06, partials(f, [[1, 1, 6], [5.4, 0.15, 30]], 0.5), 0.7])),
    success3: () => mix(0.8, [523, 659, 784].map((f, i) => [i * 0.1, partials(f, [[1, 1, 7], [3.93, 0.25, 30]], 0.5), 0.8])),
    ta_da: () => mix(1.2, [[0, mix(0.2, [523, 659, 784].map((f) => [0, partials(f, [[1, 1, 18]], 0.2), 0.4]))], [0.16, mix(1, [523, 659, 784, 1046.5].map((f) => [0, partials(f, [[1, 1, 3], [2, 0.2, 8]], 1), 0.35]))]]),
    fanfare_soft: () => mix(1.1, [392, 494, 587, 784].map((f, i) => [i * 0.02, partials(f, [[1, 1, 3], [2, 0.6, 4], [3, 0.3, 6]], 1, 0.008), 0.35])),
    error_soft: () => mix(0.5, [[0, partials(523, [[1, 1, 10], [3.93, 0.2, 30]], 0.3)], [0.13, partials(392, [[1, 1, 8], [3.93, 0.2, 30]], 0.35)]]),
    toggle_on: () => mix(0.16, [[0, partials(900, [[1, 1, 60]], 0.06, 0.0004)], [0.06, partials(1350, [[1, 1, 60]], 0.08, 0.0004)]]),
    toggle_off: () => mix(0.16, [[0, partials(1350, [[1, 1, 60]], 0.06, 0.0004)], [0.06, partials(900, [[1, 1, 60]], 0.08, 0.0004)]]),
    key_soft: () => mix(0.05, [[0, bandNoise(0.035, 1500, 1, (p) => Math.exp(-p * 10), 17)], [0, partials(600, [[1, 0.5, 120]], 0.03, 0.0005)]]),
    abacus: () => { const r = rnd(5); return mix(0.7, [...Array(5)].map((_, i) => [i * 0.11 + (r() + 1) * 0.02, partials(1100 + (r() + 1) * 200, [[1, 1, 55], [2.3, 0.35, 75]], 0.1, 0.0004), 0.8])); },
    odometer: () => mix(0.75, [...Array(14)].map((_, i) => [i * 0.045, partials(1500 + i * 70, [[1, 1, 140]], 0.025, 0.0004), 0.55])),
    tally: () => mix(0.5, [0, 0.12, 0.24, 0.36].map((t) => [t, S.tick(), 0.8])),
  };
  const cache = {};
  return { names: Object.keys(S), get(name) { if (!S[name]) return null; if (!cache[name]) { const d = S[name](); let pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); const k = pk ? 0.8 / pk : 1; for (let i = 0; i < d.length; i++) d[i] *= k; cache[name] = d; } return cache[name]; } };
}

function mascotDraw(g, cx, cy, size, t, talk) {
  const k = size / 512;
  g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(k, k);
  g.fillStyle = "#B5532E"; g.beginPath(); g.roundRect(0, 0, 512, 512, 112); g.fill();
  const open = talk ? 0.55 + 0.45 * Math.abs(Math.sin(t * 11)) * (0.6 + 0.4 * Math.sin(t * 3.1)) : 1;
  const blink = t % 3.2 > 3.05 ? 0.15 : 1;
  g.strokeStyle = "#FFFDF9"; g.lineWidth = 34; g.lineCap = "round";
  g.save(); g.translate(256, 250); g.scale(1, open); g.beginPath(); g.arc(0, 0, 110, 0, Math.PI); g.restore(); g.stroke();
  g.fillStyle = "#FFFDF9"; g.save(); g.translate(256, 186); g.scale(1, blink); g.beginPath(); g.arc(0, 0, 48, 0, Math.PI * 2); g.fill(); g.restore();
  g.restore();
}

function outroDraw(g, s, app, l1, l2) {
  const W = 1080, H = 1920, F = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const cl = (x) => Math.max(0, Math.min(1, x));
  const back = (x) => { x = cl(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#F8F3EB"); gr.addColorStop(1, "#EADCC8");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const p = back(s / 0.6);
  if (p > 0) mascotDraw(g, W / 2, 720, 300 * p, s, s > 0.5 && s < 2);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.globalAlpha = cl((s - 0.4) / 0.5); g.fillStyle = "#1F1B16"; g.font = `900 84px ${F}`; g.fillText(l1 || "Спросите о своём", W / 2, 1020);
  g.globalAlpha = cl((s - 0.6) / 0.5); g.fillStyle = "#B5532E"; g.fillText(l2 || `в «${app}»`, W / 2, 1130);
  g.restore();
}
export { VT_RU_NUM, vtNorm, vtNumOf, vtWhen, SFX_LIB, mascotDraw, outroDraw };
