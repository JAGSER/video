// Модель монтажа по фразам: порядок, выброшенные фразы, ролики-нарезки. Время исходника в секундах.
export const COLORS = ['#FF7A1A', '#3D8BFF', '#8B6CFF', '#FF4FA3', '#C6FF3D', '#FFB23D'];
const PAD = 0.08, GAP = 0.6;

// фразы из слов: новая после паузы больше 0,6 с или после . ! ? …
export function buildPhrases(words) {
  const out = []; let cur = null;
  (words || []).forEach((w, i) => {
    const prev = words[i - 1];
    if (!cur || w.s - prev.e > GAP || /[.!?…]$/.test(prev.w)) { cur = {id: out.length, s: w.s, e: w.e, ws: []}; out.push(cur); }
    cur.e = Math.max(cur.e, w.e); cur.ws.push(w);
  });
  return out.map((p) => ({id: p.id, s: p.s, e: p.e, text: p.ws.map((w) => w.w).join(' ')}));
}

const orderOf = (S) => (S.order && S.order.length ? S.order : (S.phr || []).map((p) => p.id));
const cutBy = (S, a, b) => (S.cuts || []).some((c) => c.s < b && c.e > a);

// куски исходника для списка фраз (в их порядке); паузы между соседними в исходнике фразами остаются, если их не вырезают
function build(S, ids) {
  const P = new Map((S.phr || []).map((p) => [p.id, p]));
  const segs = []; let o = 0;
  const list = ids.map((id) => P.get(id)).filter(Boolean);
  list.forEach((p, k) => {
    let s = Math.max(0, p.s - PAD), e = Math.min(S.dur, p.e + PAD);
    const nx = list[k + 1];
    if (!S.removePauses && nx && nx.id == p.id + 1) e = Math.max(e, nx.s - PAD);
    if (k == 0 && !S.removePauses && p.id == 0) s = 0;
    if (k == list.length - 1 && !S.removePauses && p.id == (S.phr || []).length - 1) e = S.dur;
    if (e - s < 0.05 || cutBy(S, p.s, p.e)) return;
    const L = segs[segs.length - 1];
    if (L && Math.abs(L.e - s) < 0.002) { L.e = e; L.ids.push(p.id); } else segs.push({s, e, ids: [p.id]});
  });
  segs.forEach((g) => { g.o = o; o += g.e - g.s; });
  const mapOut = (t) => { for (const g of segs) if (t >= g.s - 0.001 && t <= g.e + 0.001) return g.o + Math.max(0, t - g.s); return null; };
  const words = [];
  segs.forEach((g) => (S.words || []).forEach((w) => { const m = w.s + Math.min(0.05, (w.e - w.s) / 2); if (m >= g.s && m < g.e) words.push({...w, os: g.o + w.s - g.s, oe: g.o + Math.min(w.e, g.e) - g.s}); }));
  const chunks = []; let cur = [];
  for (const x of words) { const last = cur[cur.length - 1]; if (cur.length && (cur.length >= 3 || x.os - last.oe > 0.6 || /[.,!?…;:]$/.test(last.w))) { chunks.push(cur); cur = []; } cur.push(x); }
  if (cur.length) chunks.push(cur);
  chunks.forEach((c, i) => { c.s = c[0].os; c.e = i < chunks.length - 1 ? Math.min(chunks[i + 1][0].os, c[c.length - 1].oe + 0.6) : c[c.length - 1].oe + 0.6; });
  return {segs, outDur: o, words, chunks, mapOut};
}

// весь ролик: порядок S.order без S.drop
export function derive(S) {
  if (!S.dur) return {pieces: [], segs: [], outDur: 0, words: [], chunks: [], inserts: [], phrSegs: [], mapOut: () => 0};
  if (!(S.phr && S.phr.length)) {
    const segs = [{s: 0, e: S.dur, o: 0, ids: []}];
    return {pieces: [{s: 0, e: S.dur, keep: true}], segs, outDur: S.dur, words: [], chunks: [], inserts: [], phrSegs: [], mapOut: (t) => t};
  }
  const drop = new Set(S.drop || []);
  const ids = orderOf(S).filter((id) => !drop.has(id));
  const r = build(S, ids);
  const P = new Map(S.phr.map((p) => [p.id, p]));
  const phrSegs = [];
  ids.forEach((id) => { const p = P.get(id), o = r.mapOut(p.s); if (o != null) phrSegs.push({id, o, d: p.e - p.s}); });
  const mapOut = (t) => { const v = r.mapOut(t); if (v != null) return v; const nx = r.segs.find((g) => g.s > t); return nx ? nx.o : r.outDur; };
  const pieces = r.segs.map((g) => ({s: g.s, e: g.e, keep: true}));
  return {...r, pieces, inserts: [], phrSegs, mapOut};
}

// отдельный ролик из этих фраз (для «На 3 ролика» и сцен)
export function segsFor(S, ids) { return build(S, ids); }
// куски для отрезка исходника (сцена)
export function segsForRange(S, a, b) { return build(S, (S.phr || []).filter((p) => p.e > a && p.s < b).map((p) => p.id)); }

// строки и куски линии для экранов: 342 px на весь исходник
export function lineModel(S) {
  const phr = S.phr || [], total = S.dur || 1, drop = new Set(S.drop || []);
  const group = new Map(); (S.reels || []).forEach((g, gi) => g.forEach((id) => group.set(id, gi)));
  const GC = ['#FF7A1A', '#8B6CFF', '#FF4FA3'];
  const color = (id) => (group.has(id) ? GC[group.get(id) % 3] : COLORS[id % 6]);
  const order = orderOf(S);
  const rows = order.map((id) => phr[id]).filter(Boolean).map((p) => ({id: p.id, text: p.text, color: color(p.id), dropped: drop.has(p.id), group: group.has(p.id) ? group.get(p.id) : null}));
  // куски линии в порядке ролика, ширина пропорциональна длительности
  const items = rows.map((r) => { const p = phr[r.id]; return {id: r.id, d: Math.max(0.2, p.e - p.s), color: r.color, dropped: r.dropped}; });
  const sum = items.reduce((a, x) => a + x.d, 0) || 1, gap = 4, avail = 342 - gap * Math.max(0, items.length - 1);
  let x = 0;
  const segs = items.map((it) => { const w = Math.max(6, avail * it.d / sum); const s = {id: it.id, left: Math.round(x), width: Math.round(w), color: it.color, dropped: it.dropped}; x += w + gap; return s; });
  return {rows, segs, total};
}
