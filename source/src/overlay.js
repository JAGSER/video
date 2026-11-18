// Движок графики поверх видео: те же кисти, что в творческих роликах «Помощника» (k.text, k.path, k.card…),
// плюс библиотеки стилей. Код от Claude рисует прозрачный слой над видео функцией draw(t, k).
import {vtWhen, SFX_LIB, mascotDraw} from './runtime_helpers.js';

const W = 1080, H = 1920, FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const SAFE = {x0: 60, x1: 1020, y0: 110, y1: 1360};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = {
  out: (x) => 1 - Math.pow(1 - clamp(x), 3),
  inOut: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  back: (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  elastic: (x) => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1; },
};
function rand(seed) { let s = (Math.abs(Math.floor(seed * 9973)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// длина и рамка SVG-путей (для прорисовки штрихом)
const pathInfo = new Map();
let _svg = null, _p = null;
function measure(d) {
  if (pathInfo.has(d)) return pathInfo.get(d);
  let v = {len: 3000, box: null};
  try {
    if (!_svg) { _svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); _svg.setAttribute('width', '0'); _svg.setAttribute('height', '0'); _svg.style.cssText = 'position:absolute;left:-9px;top:-9px'; _p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); _svg.appendChild(_p); document.body.appendChild(_svg); }
    _p.setAttribute('d', d); const b = _p.getBBox(); v = {len: Math.max(1, _p.getTotalLength()), box: {x: b.x, y: b.y, w: b.width, h: b.height}};
  } catch (e) {}
  pathInfo.set(d, v); return v;
}

// brief: {duration, words:[{w,t0,t1}], subs:[{t0,t1,text}], faces:[{t,x,y,w,h}], title, palette}
export function makeK(brief) {
  let g = null, boxes = [], curT = 0;
  function record(kind, x, y, w, h, label, size) {
    if (!g || g.globalAlpha < 0.35) return;
    const m = g.getTransform();
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    boxes.push({kind, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), label, size: size ? size * (Math.hypot(m.a, m.b) || 1) : 0});
  }
  function wrap(str, maxW) {
    const out = [];
    String(str).split('\n').forEach((para) => { let cur = ''; para.split(/\s+/).filter(Boolean).forEach((w) => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }); out.push(cur); });
    return out;
  }
  function text(str, x, y, o = {}) {
    // ИИ иногда пишет перенос строки как текст «\n» (или «\п»): превращаем в настоящий перенос
    str = String(str == null ? '' : str).replace(/\\[nп]/g, '\n'); if (!str.trim()) return {w: 0, h: 0, size: 0};
    const weight = o.weight || 700, align = o.align || 'center', lh = o.lineHeight || 1.2, maxLines = o.maxLines || 3, minSize = o.minSize || 26;
    const m = g.getTransform(), sx = Math.hypot(m.a, m.b) || 1;
    let maxW = o.maxWidth;
    if (!maxW) { const gx = m.a * x + m.c * y + m.e; const room = align === 'center' ? 2 * Math.min(gx - SAFE.x0, SAFE.x1 - gx) : align === 'left' ? SAFE.x1 - gx : gx - SAFE.x0; maxW = room / sx; }
    maxW = Math.max(40, maxW);
    let f = o.size || 64, lines;
    for (;;) { g.font = `${weight} ${f}px ${o.font || FONT}`; lines = wrap(str, maxW); const wide = Math.max(...lines.map((l) => g.measureText(l).width)); if ((lines.length <= maxLines && wide <= maxW) || f <= minSize) break; f = Math.max(minSize, Math.floor(f * 0.92)); }
    lines = lines.slice(0, maxLines);
    g.save(); g.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    g.fillStyle = o.color || '#1F1B16'; g.textAlign = align; g.textBaseline = 'middle';
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.strokeWidth || 8; g.lineJoin = 'round'; }
    const step = f * lh, top = y - (lines.length * step) / 2 + step / 2;
    lines.forEach((l, i) => { if (o.stroke) g.strokeText(l, x, top + i * step); g.fillText(l, x, top + i * step); });
    const w = Math.max(...lines.map((l) => g.measureText(l).width));
    const bx = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w;
    record('text', bx, y - (lines.length * step) / 2, w, lines.length * step, str.replace(/\n/g, ' ').slice(0, 40), f);
    g.restore();
    return {w, h: lines.length * step, size: f};
  }
  function path(d, k, x, y, o = {}) {
    if (!d) return;
    const meta = measure(d), s = o.scale || 1;
    g.save(); g.translate(x, y); g.scale(s, s);
    const p = new Path2D(d);
    if (o.fill && k > 0) { g.save(); g.globalAlpha *= clamp(k); g.fillStyle = o.fill; g.fill(p); g.restore(); }
    if (k > 0 && o.color !== null) { g.strokeStyle = o.color || '#1F1B16'; g.lineWidth = (o.width || 8) / s; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([meta.len, meta.len]); g.lineDashOffset = meta.len * (1 - clamp(k)); g.stroke(p); }
    if (meta.box && k > 0.2) record('icon', meta.box.x, meta.box.y, meta.box.w, meta.box.h, 'рисунок');
    g.restore();
  }
  function card(x, y, w, h, o = {}) {
    g.save();
    if (o.shadow) { g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 30; g.shadowOffsetY = 10; }
    g.fillStyle = o.color || '#FFFDF9'; g.beginPath(); g.roundRect(x, y, w, h, o.r == null ? 36 : o.r); g.fill();
    record('card', x, y, w, h, 'плашка');
    g.restore();
  }
  function emoji(ch, x, y, size) {
    g.save(); g.fillStyle = '#000'; g.font = `${size || 160}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x, y);
    record('icon', x - size / 2, y - size / 2, size, size, 'эмодзи'); g.restore();
  }
  function sub(t) {
    const subs = brief.subs || []; let i = 0;
    while (i < subs.length - 1 && t >= subs[i].t1) i++;
    const s = subs[i] || {t0: 0, t1: brief.duration, text: ''};
    return {i, text: s.text, t0: s.t0, t1: s.t1, p: clamp((t - s.t0) / Math.max(0.01, s.t1 - s.t0))};
  }
  function rawFace(t) {
    let b = null, bd = 1e9; for (const f of brief.faces || []) { const d = Math.abs(f.t - t); if (d < bd) { bd = d; b = f; } }
    return b && bd < 1.5 ? {x: b.x, y: b.y, w: b.w, h: b.h} : null;
  }
  // раскладка «панель сверху, человек снизу»: layout(t) из кода стиля → 0…1
  let layoutFn = null;
  const TY = splitShift(brief.faces);
  function split(t) { if (!layoutFn) return 0; try { return clamp(+layoutFn(t, K) || 0); } catch (e) { return 0; } }
  function face(t) {
    const f = rawFace(t); if (!f) return null;
    const s = split(t); if (!s) return f;
    return {x: f.x, y: f.y + TY * s, w: f.w, h: f.h};
  }
  const K = {
    W, H, SAFE, text, path, card, emoji, sub, face, ease, clamp, rand,
    photo: () => {}, photos: 0, photoSize: () => null,
    prog: (t, a, b) => clamp((t - a) / (b - a)),
    lerp: (a, b, x) => a + (b - a) * x,
    mascot: (cx, cy, size, talk) => { mascotDraw(g, cx, cy, size, curT, talk); record('icon', cx - size / 2, cy - size / 2, size, size, 'талисман'); },
    palette: brief.palette || {bg: '#F6F1E9', ink: '#1F1B16', accent: '#B5532E', soft: '#F3E1D6', white: '#FFFDF9', muted: '#6E655A'},
    get g() { return g; }, amp: 0.3,
    title: brief.title || '', emojiMain: '', duration: brief.duration, subs: brief.subs || [], words: brief.words || [],
    when: (q, n, d) => vtWhen(brief.words || [], q, n, d),
  };
  K.split = split; K.splitY = 960;
  return {
    K,
    setLayout(fn) { layoutFn = typeof fn === 'function' ? fn : null; },
    split, ty: TY,
    bind(ctx) { g = ctx; },
    begin(t) { boxes = []; curT = t; },
    boxes: () => boxes,
  };
}

// сдвиг видео вниз в режиме панели: лицо встаёт примерно в y≈1330 (нижняя половина кадра)
export function splitShift(faces) {
  const ys = (faces || []).map((f) => f.y + f.h / 2).filter(isFinite).sort((a, b) => a - b);
  const cy = ys.length ? ys[ys.length >> 1] : 760;
  return clamp(1330 - cy, 0, 960);
}

// компиляция: библиотека стиля + код Claude → {draw, sound, layout}
export function compile(lib, code) {
  const src = (lib || '') + '\n\n' + code + "\n;return { draw: typeof draw === 'function' ? draw : null, sound: typeof sound === 'function' ? sound : null, layout: typeof layout === 'function' ? layout : null };";
  const fns = new Function(src)();
  if (!fns.draw) throw new Error('в коде нет функции draw(t, k)');
  return fns;
}

// рисует кадр в t на прозрачном холсте
export function drawFrame(ctx, rt, fns, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.setLineDash([]);
  ctx.clearRect(0, 0, W, H);
  rt.bind(ctx); rt.begin(t);
  ctx.save();
  let err = null;
  try { fns.draw(Math.min(t, rt.K.duration - 0.001), rt.K); } catch (e) { err = (e && e.message) || String(e); }
  ctx.restore();
  return err;
}

// самопроверка без затрат: вылезает ли за край, налезает ли, закрывает ли лицо, ошибки кода
export function selfCheck(rt, fns, duration) {
  rt.setLayout(fns.layout);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
  const issues = new Set(); let err = null; let ms = 0;
  const N = Math.max(8, Math.min(40, Math.round(duration * 1.5)));
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) * duration / N, tt = t.toFixed(1);
    const t0 = performance.now(); const e = drawFrame(ctx, rt, fns, t); ms = Math.max(ms, performance.now() - t0);
    if (e && !err) err = `на ${tt} с ошибка: ${e}`;
    const bx = rt.boxes(), txt = bx.filter((b) => b.kind == 'text'), solid = bx.filter((b) => b.kind != 'text' || true);
    txt.forEach((b) => { if (b.size && b.size < 40) issues.add(`на ${tt} с текст «${b.label}» мелкий (${Math.round(b.size)} px): на телефоне не читается, минимум 44 px`); });
    txt.forEach((b) => { if (b.x0 < SAFE.x0 - 6 || b.x1 > SAFE.x1 + 6 || b.y0 < SAFE.y0 - 6 || b.y1 > SAFE.y1 + 6) issues.add(`на ${tt} с текст «${b.label}» выходит за безопасную зону (x 60…1020, y 110…1360)`); });
    const ov = (a, b) => { const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); return w > 0 && h > 0 ? w * h : 0; };
    for (let a = 0; a < txt.length; a++) for (let b = a + 1; b < txt.length; b++) { const m = Math.min((txt[a].x1 - txt[a].x0) * (txt[a].y1 - txt[a].y0), (txt[b].x1 - txt[b].x0) * (txt[b].y1 - txt[b].y0)); if (m > 0 && ov(txt[a], txt[b]) / m > 0.08) issues.add(`на ${tt} с тексты «${txt[a].label}» и «${txt[b].label}» налезают друг на друга`); }
    const f = rt.K.face(t);
    if (f) { const fb = {x0: f.x - 50, y0: f.y - 40, x1: f.x + f.w + 50, y1: f.y + f.h + 30}; solid.forEach((b) => { const o = ov(b, fb); if (o / Math.max(1, (fb.x1 - fb.x0) * (fb.y1 - fb.y0)) > 0.06) issues.add(`на ${tt} с ${b.kind == 'text' ? 'текст «' + b.label + '»' : b.label} закрывает лицо (лицо x ${Math.round(f.x)}…${Math.round(f.x + f.w)}, y ${Math.round(f.y)}…${Math.round(f.y + f.h)})`); }); }
  }
  return {error: err, issues: [...issues].slice(0, 14), ms};
}

// звуки ролика: sound(s) из кода Claude → WAV
export function makeSoundWav(fns, rt, duration) {
  if (!fns.sound) return null;
  const R = 44100, len = Math.ceil(duration * R), out = new Float32Array(len), lib = SFX_LIB(R); let count = 0;
  const s = {
    names: lib.names, duration, subs: rt.K.subs, when: (q, n, d) => rt.K.when(q, n, d),
    rand: (seed) => { let x = (seed | 0) || 1; return () => ((x = (x * 16807) % 2147483647) / 2147483647); },
    play(t, name, gain = 0.15, o = {}) {
      const b = lib.get(name); if (!b || !(t >= 0) || count >= 120) return;
      gain = Math.max(0, Math.min(0.4, +gain || 0)); const k = Math.max(0.5, Math.min(2, +(o.pitch || 1)));
      const o0 = Math.round(t * R), n = Math.floor(b.length / k); count++;
      for (let i = 0; i < n && o0 + i < len; i++) { const x = i * k, j = x | 0, f = x - j; out[o0 + i] += ((b[j] || 0) * (1 - f) + (b[j + 1] || 0) * f) * gain; }
    },
  };
  try { fns.sound(s); } catch (e) { return null; }
  if (!count) return null;
  const dv = new DataView(new ArrayBuffer(44 + len * 2)); const Wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  Wr(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); Wr(8, 'WAVE'); Wr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, R, true); dv.setUint32(28, R * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); Wr(36, 'data'); dv.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, out[i])) * 32767, true);
  return URL.createObjectURL(new Blob([dv], {type: 'audio/wav'}));
}
