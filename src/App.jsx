import React, {useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {Player} from '@remotion/player';
import {Montage, FPS} from './Montage.jsx';
import {askAI, GFX_DOC, b64, parseJSON, audioWav, grabFrames, PLAN_PROMPT} from './ai.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const fmt = (t) => { t = Math.max(0, t); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); };
const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е');
const LS = {get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }};
const SUBS = {karaoke: {n: 'Караоке жёлтым', e: '🟨'}, pop: {n: 'По слову с прыжком', e: '🔤'}, type: {n: 'Печать на плашке', e: '⌨️'}, neon: {n: 'Неон', e: '🌈'}, wave: {n: 'Волна', e: '〰️'}, off: {n: 'Без субтитров', e: '🚫'}};
const SUB_KEYS = Object.keys(SUBS);
let uid = 1;

// ===== измерение текста (для обхода лица) =====
const mctx = document.createElement('canvas').getContext('2d');
const FONTC = {b: '900 X InterBlack, sans-serif', m: '700 X InterBold, sans-serif', l: 'italic 400 X LoraI, serif'};
function tw(s, px, k) { mctx.font = FONTC[k].replace('X', px + 'px'); return mctx.measureText(s).width; }
function layerSize(L) {
  if (L.k == 'text') { const k = FONTC[L.font] ? L.font : 'b', px = clamp(+L.size || 80, 16, 240), maxW = clamp(+L.maxW || 960, 120, 1040); const lines = String(L.text || '').split('\n'); const pad = L.box ? clamp(+L.box.pad || 22, 0, 80) : 0; const w = Math.min(maxW, Math.max(...lines.map((l) => tw(l, px, k) * 1.08))); const extra = lines.reduce((a, l) => a + Math.ceil(tw(l, px, k) * 1.08 / maxW), 0); return {w: w + pad * 2, h: extra * px * 1.12 + pad * 1.4}; }
  if (L.k == 'emoji') { if (L.fx && L.fx != 'none') return null; const s = clamp(+L.size || 120, 20, 400); return {w: s, h: s}; }
  if (L.k == 'frame') return {w: (+L.w || 420) + 24, h: (+L.h || 420) + 24 + (L.caption ? 70 : 0)};
  if (L.k == 'shape' && L.sh != 'arrow' && L.sh != 'line') { const w = +L.w || 200; return {w, h: +L.h || w}; }
  return null;
}
function faceAt(faces, t) { let b = null, bd = 1e9; for (const f of faces || []) { const d = Math.abs(f.t - t); if (d < bd) { bd = d; b = f; } } return bd < 1.2 ? b : null; }
function faceBox(faces, n) { let u = null; for (let t = n.t; t <= n.t + n.d + 0.01; t += 0.4) { const f = faceAt(faces, t); if (!f) continue; const r = {x: f.x - 50, y: f.y - 70, x2: f.x + f.w + 50, y2: f.y + f.h + 50}; u = u ? {x: Math.min(u.x, r.x), y: Math.min(u.y, r.y), x2: Math.max(u.x2, r.x2), y2: Math.max(u.y2, r.y2)} : r; } return u; }
function insShift(n, fb) {
  if (!fb) return 0; let u = null;
  for (const L of n.layers || []) { const sz = layerSize(L); if (!sz) continue; const x = +L.x || 540, y = +L.y || 600; const r = {x: x - sz.w / 2, x2: x + sz.w / 2, y: y - sz.h / 2, y2: y + sz.h / 2}; u = u ? {x: Math.min(u.x, r.x), x2: Math.max(u.x2, r.x2), y: Math.min(u.y, r.y), y2: Math.max(u.y2, r.y2)} : r; }
  if (!u || u.x2 < fb.x || u.x > fb.x2 || u.y2 < fb.y || u.y > fb.y2) return 0;
  const H = u.y2 - u.y;
  if (fb.y2 + 20 + H < 1340) return fb.y2 + 20 - u.y;
  if (fb.y - 20 - H > 90) return fb.y - 20 - u.y2;
  return 1340 - u.y2;
}
function cleanIns(o, fallbackT, dur) {
  return {id: o.id || uid++, t: isFinite(o.t) ? clamp(+o.t, 0, Math.max(0, dur - 0.2)) : fallbackT || 0, d: clamp(isFinite(o.d) ? +o.d : 2, 0.3, 8), icon: String(o.icon || '✨').slice(0, 4), idea: String(o.idea || ''), sfx: ['pop', 'thud', 'none'].includes(o.sfx) ? o.sfx : 'pop', cam: o.cam && typeof o.cam == 'object' ? o.cam : {}, layers: Array.isArray(o.layers) ? o.layers.slice(0, 12) : []};
}
const strip = (n) => JSON.parse(JSON.stringify({d: n.d, icon: n.icon, idea: n.idea, sfx: n.sfx, cam: n.cam, layers: n.layers}));

// ===== разметка времени =====
function subtract(iv, cut) { const out = []; for (const [a, b] of iv) { let parts = [[a, b]]; for (const k of cut) { const n = []; for (const [x, y] of parts) { if (k.e <= x || k.s >= y) { n.push([x, y]); continue; } if (k.s > x) n.push([x, k.s]); if (k.e < y) n.push([k.e, y]); } parts = n; } out.push(...parts); } return out; }
function derive(S) {
  if (!S.dur) return {pieces: [], segs: [], outDur: 0, words: [], chunks: [], inserts: []};
  const thr = 0.45, pad = 0.08, w = S.words;
  let gaps = [];
  for (let i = 0; i <= w.length && w.length; i++) { const a = i == 0 ? 0 : w[i - 1].e + pad, b = i == w.length ? S.dur : w[i].s - pad; if (b - a > thr) gaps.push([a, b]); }
  gaps = subtract(gaps, S.keep).filter(([a, b]) => b - a > thr);
  const cuts = S.cuts.map((c) => [c.s, c.e]);
  const bs = new Set([0, S.dur]); for (const [a, b] of gaps.concat(cuts)) { bs.add(+a.toFixed(3)); bs.add(+b.toFixed(3)); }
  const B = [...bs].filter((x) => x >= 0 && x <= S.dur).sort((a, b) => a - b);
  const pieces = [];
  for (let i = 0; i < B.length - 1; i++) { const s = B[i], e = B[i + 1]; if (e - s < 0.01) continue; const m = (s + e) / 2; const gap = gaps.some(([a, b]) => m > a && m < b), cut = cuts.some(([a, b]) => m > a && m < b); pieces.push({s, e, gap, keep: !(gap && S.removePauses) && !cut}); }
  const segs = []; let o = 0;
  for (const p of pieces) { if (!p.keep) continue; const L = segs[segs.length - 1]; if (L && Math.abs(L.e - p.s) < 0.002) L.e = p.e; else segs.push({s: p.s, e: p.e}); }
  for (const g of segs) { g.o = o; o += g.e - g.s; }
  const mapOut = (t) => { for (const g of segs) { if (t < g.s) return g.o; if (t <= g.e) return g.o + t - g.s; } return o; };
  const inKept = (t) => segs.some((g) => t >= g.s && t < g.e);
  const words = w.filter((x) => inKept(x.s + Math.min(0.05, (x.e - x.s) / 2))).map((x) => ({...x, os: mapOut(x.s), oe: mapOut(x.e)}));
  const chunks = []; let cur = [];
  for (const x of words) { const last = cur[cur.length - 1]; if (cur.length && (cur.length >= 3 || x.s - last.e > 0.6 || /[.!?…,;:]$/.test(last.w))) { chunks.push(cur); cur = []; } cur.push(x); }
  if (cur.length) chunks.push(cur);
  chunks.forEach((c, i) => { c.s = c[0].os; c.e = i < chunks.length - 1 ? Math.min(chunks[i + 1][0].os, c[c.length - 1].oe + 0.6) : c[c.length - 1].oe + 0.6; });
  const inserts = S.inserts.map((n) => { const m = {...n, o: mapOut(n.t)}; m._dy = insShift(m, faceBox(S.faces, n)); return m; }).sort((a, b) => a.o - b.o);
  return {pieces, segs, outDur: o, words, chunks, inserts, mapOut};
}
function mapSrc(segs, T) { for (let i = 0; i < segs.length; i++) { const g = segs[i]; if (T < g.o + (g.e - g.s) || i == segs.length - 1) return g.s + clamp(T - g.o, 0, g.e - g.s); } return 0; }

export default function App() {
  const [S, setS] = useState({dur: 0, words: [], keep: [], inserts: [], cuts: [], faces: [], subStyle: 'karaoke', removePauses: false, jumpZoom: true, title: '', src: null});
  const SRef = useRef(S); SRef.current = S;
  const hist = useRef([]);
  const fileRef = useRef(null);
  const player = useRef(null);
  const [T, setT] = useState(0);
  const [mode, setMode] = useState('mont');
  const [selId, setSelId] = useState(null);
  const [toastS, setToast] = useState({t: '', on: false, ai: false});
  const [busy, setBusy] = useState(null);
  const [cmd, setCmd] = useState('');
  const [rec, setRec] = useState(false);
  const [likedSub, setLikedSub] = useState(LS.get('mnt_liked_sub', []));
  const [only, setOnly] = useState(false);
  const [q, setQ] = useState(LS.get('mnt_q', 1080));
  const R = useMemo(() => derive(S), [S]);
  const RRef = useRef(R); RRef.current = R;
  const toastT = useRef(0);
  const toast = useCallback((t, ai, ms = 2800) => { setToast({t, on: true, ai}); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast((x) => ({...x, on: false})), ms); }, []);
  const update = (fn, keepHist = true) => { if (keepHist) { hist.current.push(JSON.stringify(SRef.current)); if (hist.current.length > 40) hist.current.shift(); } setS((s) => { const n = {...s}; fn(n); return n; }); };
  const undo = () => { const h = hist.current.pop(); if (!h) return toast('Нечего отменять'); const p = JSON.parse(h); setS((s) => ({...p, src: s.src, file: s.file})); toast('↩ Вернул как было'); };

  useEffect(() => { const p = player.current; if (!p) return; const h = (e) => setT(e.detail.frame / FPS); p.addEventListener('frameupdate', h); return () => p.removeEventListener('frameupdate', h); }, [S.src, R.outDur]);
  const seek = (t) => { const p = player.current; if (p) { p.pause(); p.seekTo(Math.round(clamp(t, 0, Math.max(0, R.outDur - 0.05)) * FPS)); } setT(t); };
  const previewIns = (n) => seek(n.o + Math.min(n.d * 0.7, 1.8));

  // ===== загрузка и автомонтаж =====
  async function onFile(e) {
    const file = e.target.files[0]; if (!file) return; e.target.value = '';
    const url = URL.createObjectURL(file);
    const dur = await new Promise((res) => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => res(v.duration); v.onerror = () => res(0); v.src = url; });
    if (!dur) return toast('Видео не открылось');
    hist.current = [];
    setS({dur, words: [], keep: [], inserts: [], cuts: [], faces: [], subStyle: SRef.current.subStyle, removePauses: false, jumpZoom: true, title: '', src: url, file});
    analyze(file, url, dur);
  }
  async function analyze(file, url, dur) {
    try {
      setBusy({t: 'ИИ смотрит ролик…', s: 'Готовлю кадры', p: 0});
      const frames = await grabFrames(url, dur, (i, n) => setBusy({t: 'ИИ смотрит ролик…', s: 'Кадры: ' + i + ' из ' + n, p: i / n * 0.3}));
      setBusy({t: 'ИИ слушает ролик…', s: 'Достаю звук', p: 0.35});
      const wav = await audioWav(file);
      if (wav.size > 14e6) throw new Error('ролик слишком длинный, до 5 минут');
      const parts = [{mime: 'audio/wav', data: await b64(wav)}];
      for (const f of frames) { parts.push({text: 'кадр t=' + f.t.toFixed(1) + ' с'}); parts.push({mime: 'image/jpeg', data: f.data}); }
      setBusy({t: 'ИИ монтирует…', s: 'Понимает смысл, пишет субтитры, придумывает вставки. Обычно до минуты.', p: 0.5});
      const j = parseJSON(await askAI(PLAN_PROMPT(dur, frames), parts));
      update((s) => {
        s.words = (j.words || []).filter((w) => w && w.w && isFinite(w.s)).map((w) => ({w: String(w.w), s: +w.s, e: isFinite(w.e) && w.e > w.s ? +w.e : +w.s + 0.3})).sort((a, b) => a.s - b.s);
        s.keep = (j.keep || []).filter((k) => isFinite(k.s) && isFinite(k.e)).map((k) => ({s: +k.s, e: +k.e}));
        s.faces = (j.faces || []).filter((f) => f && [f.t, f.x, f.y, f.w, f.h].every(isFinite)).map((f) => ({t: +f.t, x: +f.x, y: +f.y, w: +f.w, h: +f.h}));
        s.inserts = (j.inserts || []).filter((n) => n && isFinite(n.t)).map((n) => cleanIns(n, 0, dur));
        s.cuts = []; s.title = j.title || '';
      }, false);
      setBusy(null); toast('✨ Смонтировано: ' + (j.inserts || []).length + ' вставок', true, 4000); seek(0);
    } catch (e) { setBusy(null); toast('Ошибка: ' + e.message, false, 6000); console.error(e); }
  }

  // ===== кадр для ИИ =====
  async function frameAt(srcT) {
    const v = document.createElement('video'); v.muted = true; v.src = S.src; v.preload = 'auto';
    await new Promise((r) => { v.onloadeddata = r; v.onerror = r; });
    await new Promise((r) => { v.onseeked = r; v.currentTime = Math.min(srcT, (v.duration || 1) - 0.05); setTimeout(r, 2500); });
    if (!v.videoWidth) return null;
    const c = document.createElement('canvas'); c.width = 270; c.height = 480; const g = c.getContext('2d'); const sc = Math.max(270 / v.videoWidth, 480 / v.videoHeight); g.drawImage(v, (270 - v.videoWidth * sc) / 2, (480 - v.videoHeight * sc) / 2, v.videoWidth * sc, v.videoHeight * sc);
    return c.toDataURL('image/jpeg', 0.7).split(',')[1];
  }
  const ctxAround = (t) => R.words.filter((w) => Math.abs(w.os - t) < 4).map((w) => w.w).join(' ');

  // ===== правки голосом и текстом: решает ИИ =====
  async function run(text) {
    text = (text || '').trim(); if (!text) return; setCmd('');
    if (!S.src) return toast('Сначала загрузи видео');
    toast('🤖 ИИ думает над правкой…', true, 40000);
    try {
      const srcNow = mapSrc(R.segs, T);
      const plan = {title: S.title, duration_out: +R.outDur.toFixed(2), playhead_out: +T.toFixed(2), selected_id: selId, removePauses: S.removePauses, jumpZoom: S.jumpZoom, subStyle: S.subStyle,
        inserts: R.inserts.map((n) => ({id: n.id, t_out: +n.o.toFixed(2), ...strip(n)})), words: R.words.map((w) => w.w + '@' + w.os.toFixed(2)).join(' ')};
      const img = await frameAt(srcNow);
      const prompt = `Ты сильный монтажёр и моушн-дизайнер вертикальных рилсов. Пользователь просит правку: "${text}".
Текущий монтаж (время в секундах готового ролика, кадр в момент playhead приложен): ${JSON.stringify(plan)}
Лицо в кадре сейчас (не закрывать, тексты ниже лица, над субтитрами): ${JSON.stringify(faceAt(S.faces, srcNow))}
${GFX_DOC}
Стили субтитров: ${SUB_KEYS.join(', ')}.
Пойми, чего человек хочет, и сделай это на уровне хорошего монтажёра, по смыслу ролика. Новые вставки придумывай уникальные, про то, что говорится и видно.
Верни ТОЛЬКО JSON {"ops":[...],"say":"коротко по-русски, что сделал"} где op:
{"op":"add","t_out":сек, ...поля вставки}
{"op":"set","id":..,"t_out":.., ...любые поля вставки}  (layers заменяются целиком)
{"op":"del","id":..}
{"op":"cut","from":сек,"to":сек}
{"op":"pauses","on":true|false}
{"op":"zoom","on":true|false}
{"op":"sub","style":..}
{"op":"undo"}`;
      const j = parseJSON(await askAI(prompt, img ? [{mime: 'image/jpeg', data: img}] : []));
      if ((j.ops || []).some((o) => o.op == 'undo')) { undo(); }
      let changed = null;
      update((s) => {
        s.inserts = s.inserts.map((n) => ({...n}));
        for (const o of j.ops || []) {
          if (o.op == 'add') { const n = cleanIns({...o, t: mapSrc(R.segs, isFinite(o.t_out) ? o.t_out : T)}, 0, s.dur); n.id = uid++; s.inserts.push(n); changed = n.id; }
          if (o.op == 'del') s.inserts = s.inserts.filter((x) => x.id != o.id);
          if (o.op == 'set') { const i = s.inserts.findIndex((x) => x.id == o.id); if (i >= 0) { const n = s.inserts[i]; const c = cleanIns({...strip(n), ...o, t: isFinite(o.t_out) ? mapSrc(R.segs, o.t_out) : n.t}, n.t, s.dur); s.inserts[i] = {...c, id: n.id}; changed = n.id; } }
          if (o.op == 'cut' && isFinite(o.from) && isFinite(o.to) && o.to > o.from) s.cuts = [...s.cuts, {s: mapSrc(R.segs, o.from), e: mapSrc(R.segs, o.to)}];
          if (o.op == 'pauses') s.removePauses = !!o.on;
          if (o.op == 'zoom') s.jumpZoom = !!o.on;
          if (o.op == 'sub' && SUBS[o.style]) s.subStyle = o.style;
        }
      });
      if (changed) { setSelId(changed); setMode('ins'); }
      toast('🤖 ' + (j.say || 'Готово'), true, 4500);
    } catch (e) { toast('ИИ не ответил: ' + e.message, false, 5000); }
  }

  // ===== варианты вставки =====
  const [vars, setVars] = useState({});
  async function moreIdeas(n) {
    setVars((v) => ({...v, [n.id]: {...(v[n.id] || {list: [strip(n)], i: 0}), loading: true}}));
    try {
      const img = await frameAt(n.t);
      const prompt = `Ты сильный моушн-дизайнер вертикальных рилсов. В этот момент ролика (${n.o.toFixed(1)} с) звучит: "${ctxAround(n.o)}". Кадр приложен. Лицо в кадре (не закрывать): ${JSON.stringify(faceAt(S.faces, n.t))}. Название ролика: "${S.title}".
Сейчас здесь вставка: ${JSON.stringify(strip(n))}.
Придумай 3 СОВСЕМ РАЗНЫХ новых варианта вставки на этот же момент: другая идея, другой смысл, другая композиция и анимация. Каждая по смыслу именно про то, что здесь говорят и видно, с юмором или пользой, не общие слова. Тексты по-русски, коротко. Тексты ниже лица, над субтитрами.
${GFX_DOC}
Верни ТОЛЬКО JSON {"variants":[вставка,вставка,вставка]} (t не нужен).`;
      const j = parseJSON(await askAI(prompt, img ? [{mime: 'image/jpeg', data: img}] : []));
      setVars((v) => { const cur = v[n.id] || {list: [strip(n)], i: 0}; const list = [...cur.list, ...(j.variants || []).map((x) => strip(cleanIns(x, n.t, S.dur)))]; return {...v, [n.id]: {list, i: cur.i, loading: false}}; });
      toast('✨ Новые идеи: листай', true);
    } catch (e) { setVars((v) => ({...v, [n.id]: {...v[n.id], loading: false}})); toast('ИИ не ответил: ' + e.message, false, 5000); }
  }
  function applyVar(n, i) {
    const V = vars[n.id]; if (!V) return; const spec = V.list[i];
    setVars((v) => ({...v, [n.id]: {...V, i}}));
    update((s) => { s.inserts = s.inserts.map((x) => x.id == n.id ? {...x, ...JSON.parse(JSON.stringify(spec))} : x); });
    setTimeout(() => previewIns(n), 50);
  }

  // ===== экспорт =====
  async function exportMp4() {
    try {
      const {renderMediaOnWeb} = await import('@remotion/web-renderer');
      setBusy({t: 'Собираю MP4…', s: 'Не выключайте экран', p: 0});
      const scale = q == 1080 ? 1 : 720 / 1080;
      const res = await renderMediaOnWeb({
        composition: {id: 'montage', component: Montage, durationInFrames: Math.max(1, Math.round(R.outDur * FPS)), fps: FPS, width: 1080, height: 1920},
        inputProps: {src: S.src, segs: R.segs, inserts: R.inserts, chunks: R.chunks, subStyle: S.subStyle, jumpZoom: S.jumpZoom, outDur: R.outDur},
        container: 'mp4', videoCodec: 'h264', scale, videoBitrate: 'high',
        onProgress: (p) => setBusy({t: 'Собираю MP4…', s: Math.round(p.progress * 100) + '% · не выключайте экран', p: p.progress}),
      });
      const blob = await res.getBlob();
      setBusy(null);
      const name = 'montazh_' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '.mp4';
      window.__lastExport = {size: blob.size, name}; window.__lastBlob = blob;
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      toast('⬇ Готово: ' + name + ' (' + (blob.size / 1e6).toFixed(1) + ' МБ)', true, 5000);
    } catch (e) { setBusy(null); toast('Сборка не удалась: ' + e.message, false, 6000); console.error(e); }
  }

  // ===== микрофон =====
  const recRef = useRef(null);
  function mic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('Голос не поддерживается в этом браузере, напишите текстом');
    if (recRef.current) { recRef.current.stop(); return; }
    const r = new SR(); r.lang = 'ru-RU'; r.interimResults = true; recRef.current = r; setRec(true);
    r.onresult = (e) => { let t = ''; for (const x of e.results) t += x[0].transcript; setCmd(t); if (e.results[e.results.length - 1].isFinal) { r.stop(); run(t); } };
    r.onerror = (e) => toast('Микрофон: ' + e.error);
    r.onend = () => { recRef.current = null; setRec(false); };
    try { r.start(); } catch (e) { recRef.current = null; setRec(false); }
  }

  // ===== линия видео =====
  const lineRef = useRef(null);
  const lineSeek = (e) => { const r = lineRef.current.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; seek(clamp(x / r.width) * R.outDur); };
  const onLineDown = (e) => { lineSeek(e); const mv = (ev) => lineSeek(ev); window.addEventListener('pointermove', mv); window.addEventListener('pointerup', () => window.removeEventListener('pointermove', mv), {once: true}); };
  const sel = R.inserts.find((x) => x.id == selId) || null;
  const nearest = () => { let b = null, bd = 1e9; for (const n of R.inserts) { const d = Math.abs(n.o - T); if (d < bd) { bd = d; b = n; } } return b; };
  const selectIns = (id) => { setSelId(id); setMode('ins'); const n = R.inserts.find((x) => x.id == id); if (n) previewIns(n); };

  // ===== панель =====
  function Panel() {
    if (!S.src) return <div className="hint" style={{fontSize: 14}}>Нажми «＋ Своё видео» вверху. ИИ посмотрит ролик и смонтирует его со своими вставками.</div>;
    if (mode == 'mont') return <>
      <div className="row"><Tog on={S.removePauses} label="Вырезать паузы" onClick={() => update((s) => { s.removePauses = !s.removePauses; })}/><Tog on={S.jumpZoom} label="Зум-скачки" onClick={() => update((s) => { s.jumpZoom = !s.jumpZoom; })}/></div>
      <div className="row" style={{marginTop: 8}}><button className="btn" style={{flex: 1}} onClick={() => S.file && analyze(S.file, S.src, S.dur)}>✨ Смонтировать заново</button><button className="btn" onClick={undo}>↩ Отменить</button></div>
      <div className="hint">{S.title ? '«' + S.title + '» · ' : ''}вставок {R.inserts.length}{S.dur - R.outDur > 0.05 ? ' · вырезано ' + (S.dur - R.outDur).toFixed(1) + ' с' : ''}</div>
    </>;
    if (mode == 'sub') {
      const list = only && likedSub.length ? SUB_KEYS.filter((k) => likedSub.includes(k)) : SUB_KEYS;
      const i = Math.max(0, list.indexOf(S.subStyle)), k = list[i], t = SUBS[k];
      const go = (d) => update((s) => { s.subStyle = list[(i + d + list.length) % list.length]; }, false);
      return <>
        <div className="vhead"><span>ВАРИАНТ {i + 1} ИЗ {list.length}</span><button className="btn" style={{padding: '5px 10px', fontSize: 11}} onClick={() => setOnly(!only)}>{only ? 'Все' : 'Мои: ' + likedSub.length}</button></div>
        <Swipe go={go}><div className="nm" key={k}><span className="e">{t.e}</span>{t.n}</div></Swipe>
        <div className="row" style={{marginTop: 8, justifyContent: 'center'}}><button className={'btn like' + (likedSub.includes(k) ? ' on' : '')} onClick={() => { const a = likedSub.includes(k) ? likedSub.filter((x) => x != k) : [...likedSub, k]; setLikedSub(a); LS.set('mnt_liked_sub', a); }}>♥ Нравится</button></div>
        <div className="dots">{list.map((x, j) => <i key={x} className={(j == i ? 'on ' : '') + (likedSub.includes(x) ? 'lk' : '')}></i>)}</div>
      </>;
    }
    if (mode == 'ins') {
      const n = sel || nearest();
      if (!n) return <><div className="hint">Вставок пока нет.</div><button className="btn lime" style={{marginTop: 8}} onClick={() => run('придумай и добавь здесь вставку по смыслу этого момента')}>✨ ИИ, придумай вставку здесь</button></>;
      const V = vars[n.id] || {list: [strip(n)], i: 0};
      const go = (d) => { if (V.list.length < 2) { if (d > 0) moreIdeas(n); return; } applyVar(n, (V.i + d + V.list.length) % V.list.length); };
      const k = R.inserts.indexOf(n);
      const texts = (n.layers || []).map((L, j) => L.k == 'text' ? j : -1).filter((j) => j >= 0).slice(0, 2);
      return <>
        <div className="vhead"><span>ВСТАВКА {k + 1}/{R.inserts.length} · ВАРИАНТ {V.i + 1} ИЗ {V.list.length}{V.loading ? ' · ИИ придумывает…' : ''}</span></div>
        <Swipe go={go}><div className="nm" key={n.id + ':' + V.i} style={{fontSize: 16, padding: '0 44px', textAlign: 'center'}}><span className="e">{n.icon}</span>{n.idea || 'вставка'}</div></Swipe>
        <div className="row" style={{marginTop: 8}}>{texts.map((j) => <input key={n.id + ':' + j} className="fld" style={{flex: 1}} defaultValue={String(n.layers[j].text || '').replace(/\n/g, ' / ')} onChange={(e) => { const val = e.target.value.replace(/\s*\/\s*/g, '\n'); update((s) => { s.inserts = s.inserts.map((x) => x.id == n.id ? {...x, layers: x.layers.map((L, li) => li == j ? {...L, text: val} : L)} : x); }, false); }}/>)}</div>
        <div className="row" style={{marginTop: 8}}>
          <button className="btn" onClick={() => selectIns(R.inserts[(k - 1 + R.inserts.length) % R.inserts.length].id)}>◀</button>
          <button className="btn" onClick={() => moreIdeas(n)}>✨ Ещё идеи</button>
          <button className="btn" onClick={() => { update((s) => { s.inserts = s.inserts.filter((x) => x.id != n.id); }); setSelId(null); toast('🗑 Вставка убрана'); }}>🗑</button>
          <button className="btn" onClick={() => selectIns(R.inserts[(k + 1) % R.inserts.length].id)}>▶</button>
        </div>
        <div className="dots">{V.list.map((x, j) => <i key={j} className={j == V.i ? 'on' : ''}></i>)}</div>
      </>;
    }
    if (mode == 'exp') return <>
      <div className="row"><Tog on={q == 1080} label="Качество 1080p (выкл = 720p, быстрее)" onClick={() => { const v = q == 1080 ? 720 : 1080; setQ(v); LS.set('mnt_q', v); }}/></div>
      <div className="row" style={{marginTop: 8}}><button className="btn lime" style={{flex: 1, padding: 13}} onClick={exportMp4}>⬇ Собрать и скачать MP4 ({fmt(R.outDur)})</button></div>
    </>;
    return null;
  }

  useEffect(() => { window.__app = {S, R, run, seek, exportMp4}; });
  const durF = Math.max(1, Math.round(R.outDur * FPS));
  return <div id="app">
    <header><h1>VIDEO<b>.</b></h1><button className="btn lime" onClick={() => fileRef.current.click()}>＋ Своё видео</button><input ref={fileRef} type="file" accept="video/*" style={{position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none'}} onChange={onFile}/></header>
    <div id="stage">
      <div id="playerBox">
        {S.src ? <Player ref={player} component={Montage} inputProps={{src: S.src, segs: R.segs, inserts: R.inserts, chunks: R.chunks, subStyle: S.subStyle, jumpZoom: S.jumpZoom, outDur: R.outDur}}
          durationInFrames={durF} fps={FPS} compositionWidth={1080} compositionHeight={1920} style={{width: '100%', height: '100%'}} clickToPlay controls={false} acknowledgeRemotionLicense/>
          : <div className="empty"><b>Загрузи видео</b>кнопкой «＋ Своё видео» вверху</div>}
        {S.src ? <div style={{position: 'absolute', inset: 0}} onClick={() => { const p = player.current; if (p) p.toggle(); }}/> : null}
      </div>
      {busy ? <div id="busy" className="on"><div className="t">{busy.t}</div><div className="scan det"><i style={{width: (busy.p || 0) * 100 + '%'}}></i></div><div className="s">{busy.s}</div></div> : null}
    </div>
    <div id="lineWrap">
      <div id="line" ref={lineRef} onPointerDown={onLineDown}>{R.pieces.map((p, i) => <div key={i + ':' + p.s} className={'pc ' + (p.keep ? 'k' : 'x') + (p.gap ? ' g' : '')} style={{flexGrow: p.keep ? p.e - p.s : 0.0001}}></div>)}</div>
      <div id="chips">{R.inserts.map((n) => <div key={n.id} className={'ch' + (n.id == selId ? ' sel' : '')} style={{left: (100 * n.o / (R.outDur || 1)) + '%'}} onClick={(e) => { e.stopPropagation(); selectIns(n.id); }}>{n.icon}</div>)}</div>
      <div id="ph" style={{left: 14 + (lineRef.current ? lineRef.current.clientWidth : 0) * clamp(T / (R.outDur || 1)) + 'px'}}></div>
      <div id="tinfo"><span>{fmt(T)}</span><span>{fmt(R.outDur)}{R.outDur < S.dur - 0.05 ? '  (было ' + fmt(S.dur) + ')' : ''}</span></div>
    </div>
    <div id="modes">{[['mont', '✂ Монтаж'], ['ins', '✨ Вставки'], ['sub', '💬 Субтитры'], ['exp', '⬇ Скачать MP4']].map(([m, l]) => <button key={m} className={'md' + (mode == m ? ' on' : '')} onClick={() => setMode(m)}>{l}</button>)}</div>
    <div id="panel">{Panel()}</div>
    <div id="voice">
      <input id="cmd" placeholder="Скажи или напиши правку…" enterKeyHint="send" autoComplete="off" value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={(e) => { if (e.key == 'Enter') run(cmd); }}/>
      <button id="mic" className={rec ? 'on' : ''} onClick={mic}>🎤</button>
      <button id="send" onClick={() => run(cmd)}>➜</button>
    </div>
    <div id="toast" className={(toastS.on ? 'on' : '') + (toastS.ai ? ' ai' : '')}>{toastS.t}</div>
  </div>;
}
function Tog({on, label, onClick}) { return <div className={'tog' + (on ? ' on' : '')} onClick={onClick}><i></i>{label}</div>; }
function Swipe({go, children}) {
  const x0 = useRef(null);
  return <div className="car" onTouchStart={(e) => { x0.current = e.touches[0].clientX; }} onTouchEnd={(e) => { if (x0.current == null) return; const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); x0.current = null; }}>
    <button className="ar l" onClick={() => go(-1)}>‹</button>{children}<button className="ar r" onClick={() => go(1)}>›</button>
  </div>;
}
