import React, {useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {Montage, FPS} from './Montage.jsx';
import DemoApp from './ui/DemoApp.jsx';
import {askAI, b64, parseJSON, audioWav, grabFrames, ANALYZE_PROMPT, OVERLAY_PROMPT, styleRules, STYLE_PICK, askClaudeChat, extractCode} from './ai.js';
import {makeK, compile, selfCheck, makeSoundWav} from './overlay.js';

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
  if (L.k == 'svg') { const w = +L.w || 300; return {w, h: +L.h || w}; }
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
  const [S, setS] = useState({dur: 0, words: [], keep: [], inserts: [], cuts: [], faces: [], subStyle: 'karaoke', removePauses: false, jumpZoom: true, title: '', src: null, theme: {}, an: null, overlay: null, soundUrl: null, styleId: ''});
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
  const [pickStyle, setPickStyle] = useState('');
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
    setS({dur, words: [], keep: [], inserts: [], cuts: [], faces: [], subStyle: SRef.current.subStyle, removePauses: false, jumpZoom: true, title: '', src: url, file, theme: {}, an: null, overlay: null, soundUrl: null, styleId: ''});
    analyze(file, url, dur);
  }
  // ===== стили «Помощника» =====
  const [styles, setStyles] = useState([]);
  useEffect(() => { const base = [{id: 'std', name: 'Стандартный', desc: 'Основной стиль «Помощника»: светлые плашки, рисунки линией, терракотовый акцент'}]; fetch('styles/index.json').then((r) => r.json()).then((a) => setStyles(base.concat(a.filter((x) => x && x.id)))).catch(() => setStyles(base)); }, []);
  const stylesRef = useRef(styles); stylesRef.current = styles;
  async function loadStyle(id) {
    if (id == 'std') return {id, lib: '', konst: '', sys: OVERLAY_PROMPT, example: ''};
    const getF = async (f) => { const r = await fetch(`styles/${encodeURIComponent(id)}/${f}`); if (!r.ok) throw new Error(f + ': ' + r.status); return r.text(); };
    const [lib, doc, ex] = await Promise.all([getF('lib.js'), getF('doc.md'), getF('example.js').catch(() => '')]);
    const m = lib.match(/(?:^|\n)\s*(?:const|var|let)\s+([A-Za-z_$][\w$]*)\s*=/); const konst = m ? m[1] : 'стиля';
    return {id, lib, konst, sys: OVERLAY_PROMPT + '\n\n' + styleRules(konst) + doc, example: ex};
  }
  function makeBrief(st) {
    const words = st.words.map((w) => ({w: w.w, t0: w.s, t1: w.e}));
    const subs = []; let cur = null;
    for (const w of st.words) { if (!cur || w.s - cur.t1 > 0.7) { cur = {t0: w.s, t1: w.e, text: w.w}; subs.push(cur); } else { cur.t1 = w.e; cur.text += ' ' + w.w; } if (/[.!?…]$/.test(w.w)) cur = null; }
    return {duration: st.dur, words, subs, faces: st.faces, title: st.title};
  }
  function briefText(st, an) {
    const fc = (st.faces || []).map((f) => `${f.t.toFixed(1)}:${Math.round(f.x)},${Math.round(f.y)},${Math.round(f.w)}x${Math.round(f.h)}`).join(' ');
    const subs = makeBrief(st).subs.map((p) => `[${p.t0.toFixed(2)}–${p.t1.toFixed(2)}] ${p.text}`).join('\n');
    return `ВИДЕО: ${st.dur.toFixed(1)} с, тема «${st.title}». ${an && an.summary ? an.summary : ''}
РЕЧЬ (фразы со временем, секунды):
${subs}
СЦЕНЫ И ПРЕДМЕТЫ В КАДРЕ (координаты 1080x1920): ${JSON.stringify((an && an.scenes) || [])}
КЛЮЧЕВЫЕ МОМЕНТЫ: ${JSON.stringify((an && an.moments) || [])}
ЛИЦО (t:x,y,ш x в), это же отдаёт k.face(t): ${fc}
Сделай графику монтажа поверх этого видео.`;
  }
  // Claude пишет код графики; программа проверяет его бесплатно и просит исправить только при ошибках
  async function buildOverlay(st, an, styleId, note) {
    const style = await loadStyle(styleId);
    const FENCE = '```';
    const intro = style.example ? 'ПРИМЕР ЭТОГО СТИЛЯ (полноэкранный ролик на другую тему; изучи язык стиля, но фон и рамку кадра не рисуй):\n' + FENCE + 'js\n' + style.example + '\n' + FENCE + '\n\n' : '';
    const msgs = [{role: 'user', content: intro + briefText(st, an)}];
    const brief = makeBrief(st);
    let code = null, model = 'claude-opus-5-5';
    for (let round = 0; round < 3; round++) {
      note(round == 0 ? 'Claude рисует графику в стиле «' + (stylesRef.current.find((x) => x.id == styleId)?.name || styleId) + '»…' : 'DeepSeek исправляет замечания проверки…', round);
      const txt = await askClaudeChat({system: style.sys, messages: msgs, model, max_tokens: 20000}, (i) => note(null, round, i));
      const c = extractCode(txt);
      msgs.push({role: 'assistant', content: txt});
      if (!c) { msgs.push({role: 'user', content: 'Ответ без кода. Пришли код целиком одним блоком ```js.'}); model = 'deepseek'; continue; }
      code = c;
      let fns, chk;
      try { fns = compile(style.lib, code); chk = selfCheck(makeK(brief), fns, st.dur); } catch (e) { chk = {error: String(e.message || e), issues: []}; }
      const problems = [chk.error, ...(chk.issues || [])].filter(Boolean);
      if (!problems.length || round == 2) break;
      msgs.push({role: 'user', content: 'Проверка кадров нашла замечания:\n- ' + problems.join('\n- ') + '\nИсправь и пришли код целиком.'});
      model = 'deepseek';
    }
    if (!code) throw new Error('Claude не прислал код графики');
    let soundUrl = null; try { soundUrl = makeSoundWav(compile(style.lib, code), makeK(brief), st.dur); } catch (e) {}
    return {overlay: {lib: style.lib, code, brief, styleId, sys: style.sys, msgs: msgs.slice(-2)}, soundUrl};
  }
  async function analyze(file, url, dur, forceStyle) {
    try {
      let st = SRef.current, an = st.an;
      if (!an) {
        setBusy({t: 'Gemini смотрит ролик…', s: 'Готовлю кадры', p: 0});
        const frames = await grabFrames(url, dur, (i, n) => setBusy({t: 'Gemini смотрит ролик…', s: 'Кадры: ' + i + ' из ' + n, p: i / n * 0.15}));
        setBusy({t: 'Gemini слушает ролик…', s: 'Достаю звук', p: 0.18});
        const wav = await audioWav(file);
        if (wav.size > 14e6) throw new Error('ролик слишком длинный, до 5 минут');
        const parts = [{mime: 'audio/wav', data: await b64(wav)}];
        for (const f of frames) { parts.push({text: 'кадр t=' + f.t.toFixed(1) + ' с'}); parts.push({mime: 'image/jpeg', data: f.data}); }
        setBusy({t: 'Gemini разбирает речь и сцены…', s: 'Субтитры, лицо, предметы, стиль', p: 0.22});
        an = parseJSON(await askAI(ANALYZE_PROMPT(dur, frames) + STYLE_PICK(stylesRef.current), parts, 0.2));
        const words = (an.words || []).filter((w) => w && w.w && isFinite(w.s)).map((w) => ({w: String(w.w), s: +w.s, e: isFinite(w.e) && w.e > w.s ? +w.e : +w.s + 0.3})).sort((a, b) => a.s - b.s);
        const faces = (an.faces || []).filter((f) => f && [f.t, f.x, f.y, f.w, f.h].every(isFinite)).map((f) => ({t: +f.t, x: +f.x, y: +f.y, w: +f.w, h: +f.h}));
        st = {...st, words, faces, keep: (an.keep || []).filter((k) => isFinite(k.s) && isFinite(k.e)).map((k) => ({s: +k.s, e: +k.e})), title: an.title || '', an, inserts: [], cuts: []};
        update((s) => Object.assign(s, {words: st.words, faces: st.faces, keep: st.keep, title: st.title, an, inserts: [], cuts: []}), false);
      }
      const styleId = forceStyle || (stylesRef.current.some((x) => x.id == an.style) ? an.style : (stylesRef.current[0] || {}).id);
      const res = await buildOverlay({...st, dur}, an, styleId, (t, round, i) => setBusy((b) => ({t: t || (b && b.t) || 'Claude рисует…', s: round ? 'Правка по замечаниям проверки' : 'Один вызов на весь ролик, обычно 1-2 минуты' + (i != null ? ' · ' + i * 3 + ' с' : ''), p: Math.min(0.95, 0.3 + (round || 0) * 0.2 + (i || 0) * 0.004)})));
      update((s) => { s.overlay = res.overlay; s.soundUrl = res.soundUrl; s.styleId = styleId; }, false);
      setBusy(null); toast('✨ Готово: стиль «' + (stylesRef.current.find((x) => x.id == styleId)?.name || styleId) + '»', true, 4000); seek(0);
    } catch (e) { setBusy(null); toast('Ошибка: ' + e.message, false, 7000); console.error(e); }
  }
  async function checkDesign() {
    const st = SRef.current, ov = st.overlay; if (!ov) return toast('Сначала смонтируй ролик');
    let chk; try { chk = selfCheck(makeK(ov.brief), compile(ov.lib, ov.code), st.dur); } catch (e) { chk = {error: String(e.message || e), issues: []}; }
    const problems = [chk.error, ...(chk.issues || [])].filter(Boolean);
    if (!problems.length) return toast('✅ Проверка: лицо не закрыто, ничего не вылезает', true, 4000);
    await editCode('Проверка кадров нашла замечания:\n- ' + problems.join('\n- ') + '\nИсправь.', 'fix');
  }
  // правка кода графики (Sonnet), с проверкой
  async function editCode(ask, kind) {
    const st = SRef.current, ov = st.overlay;
    // творческое — Opus, техническое (исправить, сдвинуть, поменять текст) — DeepSeek
    const a = norm(ask);
    const creative = kind != 'fix' && (/(придума|креатив|идею|иде[ия]|смешн|ярче|интересн|красив|стильн|эффектн|добавь|ещё|еще|переделай|по-другому|другой вариант)/.test(a) || !/(поменяй|замени|исправ|убери|удали|сдвин|подвин|выше|ниже|левее|правее|раньше|позже|больше|меньше|крупнее|мельче|цвет|текст|опечат|перенеси|короче|длиннее|быстрее|медленнее)/.test(a));
    const model = creative ? 'claude-opus-5-5' : 'deepseek', who = creative ? 'Claude' : 'DeepSeek';
    setBusy({t: who + ' правит графику…', s: ask.slice(0, 80), p: 0.3});
    try {
      const msgs = [{role: 'user', content: briefText(st, st.an)}, {role: 'assistant', content: '```js\n' + ov.code + '\n```'}, {role: 'user', content: 'Правка: ' + ask + '\nПришли исправленный код целиком одним блоком ```js.'}];
      let code = null;
      for (let round = 0; round < 2; round++) {
        const txt = await askClaudeChat({system: ov.sys, messages: msgs, model: round == 0 ? model : 'deepseek', max_tokens: 20000}, (i) => setBusy({t: (round == 0 ? who : 'DeepSeek') + ' правит графику…', s: ask.slice(0, 80) + ' · ' + i * 3 + ' с', p: Math.min(0.9, 0.3 + i * 0.01)}));
        const c = extractCode(txt); if (!c) break; code = c; msgs.push({role: 'assistant', content: txt});
        let chk; try { chk = selfCheck(makeK(ov.brief), compile(ov.lib, code), st.dur); } catch (e) { chk = {error: String(e.message || e), issues: []}; }
        const problems = [chk.error, ...(chk.issues || [])].filter(Boolean);
        if (!problems.length) break;
        msgs.push({role: 'user', content: 'Проверка кадров нашла замечания:\n- ' + problems.join('\n- ') + '\nИсправь и пришли код целиком.'});
      }
      if (!code) throw new Error('Claude не прислал код');
      let soundUrl = null; try { soundUrl = makeSoundWav(compile(ov.lib, code), makeK(ov.brief), st.dur); } catch (e) {}
      update((s) => { s.overlay = {...ov, code}; s.soundUrl = soundUrl; });
      setBusy(null); toast('✅ Готово', true);
    } catch (e) { setBusy(null); toast('Не вышло: ' + e.message, false, 6000); }
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
    const t = norm(text);
    if (/пауз/.test(t) && !/графи|плашк|текст/.test(t)) { const on = !/(верн|не выреза)/.test(t); update((s) => { s.removePauses = on; }); return toast(on ? '✂ Паузы вырезаны' : '↔ Паузы вернул', true); }
    if (/(отмен|как было)/.test(t)) return undo();
    if (!S.overlay) return toast('Сначала дождись монтажа');
    await editCode(text + ` (сейчас на экране момент ${mapSrc(R.segs, T).toFixed(1)} с исходного видео)`);
  }
  // ===== экспорт =====
  async function exportMp4() {
    try {
      const {renderMediaOnWeb} = await import('@remotion/web-renderer');
      setBusy({t: 'Собираю MP4…', s: 'Не выключайте экран', p: 0});
      const scale = q == 1080 ? 1 : 720 / 1080;
      const res = await renderMediaOnWeb({
        composition: {id: 'montage', component: Montage, durationInFrames: Math.max(1, Math.round(R.outDur * FPS)), fps: FPS, width: 1080, height: 1920},
        inputProps: {src: S.src, segs: R.segs, inserts: R.inserts, chunks: R.chunks, subStyle: S.subStyle, jumpZoom: S.jumpZoom, outDur: R.outDur, theme: S.theme, overlay: S.overlay, soundUrl: S.soundUrl},
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

  useEffect(() => { window.__app = {S, R, run, seek, exportMp4, inject: (o) => update((s) => Object.assign(s, o), false)}; });
  // фразы речи для расшифровки: новая фраза после паузы больше 0,6 с или после . ! ? …; вырезанные слова помечены
  const phrases = useMemo(() => {
    const out = []; let cur = null;
    S.words.forEach((w, i) => {
      const prev = S.words[i - 1];
      if (!cur || w.s - prev.e > 0.6 || /[.!?…]$/.test(prev.w)) { cur = []; out.push(cur); }
      const m = w.s + Math.min(0.05, (w.e - w.s) / 2);
      const kept = R.segs.some((g) => m >= g.s && m < g.e);
      cur.push({...w, os: R.mapOut ? R.mapOut(w.s) : w.s, oe: R.mapOut ? R.mapOut(w.e) : w.e, cut: !kept});
    });
    out.forEach((p) => { p.s = p[0].os; p.e = p[p.length - 1].oe; p.cut = p.every((w) => w.cut); });
    return out;
  }, [S.words, R]);
  const durF = Math.max(1, Math.round(R.outDur * FPS));
  const inputProps = {src: S.src, segs: R.segs, inserts: R.inserts, chunks: R.chunks, subStyle: S.subStyle, jumpZoom: S.jumpZoom, outDur: R.outDur, theme: S.theme, overlay: S.overlay, soundUrl: S.soundUrl};
  const ctx = {S, R, T, mode, setMode, busy, toastS, cmd, setCmd, rec, likedSub, setLikedSub, only, setOnly, q, setQ, styles, pickStyle, setPickStyle, selId, player, fileRef, lineRef, onFile, analyze, checkDesign, undo, update, seek, exportMp4, mic, run, onLineDown, selectIns, inputProps, phrases, durF, FPS, SUBS, SUB_KEYS, fmt, LS};
  return <DemoApp ctx={ctx}/>;
}
