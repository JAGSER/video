import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import {Video, Audio} from '@remotion/media';
import {makeK, compile, drawFrame} from './overlay.js';

export const FPS = 30;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const FONTS = {b: "InterBlack, Inter, system-ui, sans-serif", m: "InterBold, Inter, system-ui, sans-serif", l: "LoraI, Georgia, serif"};
const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[.,!?«»"…]/g, '');

// ===== анимации на пружинах =====
function inAnim(kind, f, fps) {
  const sp = (c) => spring({frame: f, fps, config: c});
  const r = {dx: 0, dy: 0, sc: 1, rot: 0, al: 1};
  switch (kind) {
    case 'pop': { const s = sp({damping: 11, stiffness: 170}); r.sc = s; r.al = clamp(f / 4); break; }
    case 'slam': { const s = sp({damping: 15, stiffness: 260}); r.sc = interpolate(s, [0, 1], [1.4, 1]); r.al = clamp(f / 3); break; }
    case 'stamp': { const s = sp({damping: 14, stiffness: 240}); r.sc = interpolate(s, [0, 1], [1.45, 1]); r.rot = interpolate(s, [0, 1], [-9, 0]); r.al = clamp(f / 3); break; }
    case 'drop': { const s = sp({damping: 12, stiffness: 150}); r.dy = interpolate(s, [0, 1], [-150, 0]); r.al = clamp(f / 5); break; }
    case 'rise': { const s = sp({damping: 18, stiffness: 140}); r.dy = interpolate(s, [0, 1], [70, 0]); r.al = clamp(f / 7); break; }
    case 'left': case 'right': { const s = sp({damping: 18, stiffness: 150}); r.dx = interpolate(s, [0, 1], [kind == 'left' ? -200 : 200, 0]); r.al = clamp(f / 6); break; }
    case 'spin': { const s = sp({damping: 13, stiffness: 120}); r.rot = interpolate(s, [0, 1], [-160, 0]); r.sc = s; break; }
    case 'fade': r.al = clamp(f / 8); break;
    case 'none': break;
    default: { const s = sp({damping: 11, stiffness: 170}); r.sc = s; r.al = clamp(f / 4); }
  }
  return r;
}
function outAnim(kind, f, total) {
  const q = clamp((f - (total - 8)) / 8);
  const r = {dx: 0, dy: 0, sc: 1, al: 1};
  if (q <= 0 || kind == 'none') return r;
  const e = q * q;
  if (kind == 'pop') r.sc = 1 - e;
  else if (kind == 'up') { r.dy = -90 * e; r.al = 1 - q; }
  else if (kind == 'left') { r.dx = -200 * e; r.al = 1 - q; }
  else if (kind == 'right') { r.dx = 200 * e; r.al = 1 - q; }
  else r.al = 1 - q;
  return r;
}
function loopAnim(kind, t) {
  const r = {dx: 0, dy: 0, sc: 1, rot: 0};
  if (kind == 'bob') r.dy = Math.sin(t * 4) * 10;
  if (kind == 'pulse') r.sc = 1 + Math.sin(t * 6) * 0.04;
  if (kind == 'wiggle') r.rot = Math.sin(t * 8) * 3;
  if (kind == 'spin') r.rot = t * 90;
  return r;
}
function outline(color, w) {
  if (!color) return '0 6px 18px rgba(0,0,0,.55)';
  const out = [];
  for (let a = 0; a < 16; a++) { const x = Math.cos(a / 16 * Math.PI * 2) * w, y = Math.sin(a / 16 * Math.PI * 2) * w; out.push(`${x.toFixed(1)}px ${y.toFixed(1)}px 0 ${color}`); }
  return out.join(',');
}

// ===== слои =====
function TextLayer({L, f, fps}) {
  const font = FONTS[L.font] ? L.font : 'b';
  const size = clamp(+L.size || 80, 16, 240);
  const hl = (L.hl || []).map(norm);
  const st = L.stagger || 'none', step = clamp(+L.step || 0.1, 0.02, 0.5) * fps;
  const box = L.box ? {background: L.box.color || 'rgba(0,0,0,.75)', borderRadius: clamp(+L.box.r || 20, 0, 80), padding: `${clamp(+L.box.pad || 22, 0, 80) * 0.7}px ${clamp(+L.box.pad || 22, 0, 80)}px`, border: L.box.border || undefined, boxShadow: L.box.shadow || undefined} : {};
  const base = {fontFamily: FONTS[font], fontWeight: font == 'm' ? 700 : 900, fontStyle: font == 'l' ? 'italic' : 'normal', fontSize: size, lineHeight: 1.12, color: L.color || '#fff',
    textShadow: L.stroke ? outline(L.stroke, Math.max(3, size * 0.06)) : '0 6px 18px rgba(0,0,0,.55)', textAlign: 'center', letterSpacing: isFinite(L.ls) ? +L.ls : undefined, textTransform: L.upper ? 'uppercase' : undefined, width: 'max-content', maxWidth: clamp(+L.maxW || 960, 120, 1040), whiteSpace: 'pre-wrap', ...box};
  const lines = String(L.text || '').split('\n');
  let wi = 0, ci = 0;
  return <div style={base}>{lines.map((ln, li) => <div key={li}>{ln.split(/\s+/).filter(Boolean).map((w, k) => {
    const color = hl.includes(norm(w)) ? (L.hlColor || '#FFD43B') : undefined;
    const myW = wi++;
    let style = {display: 'inline-block', color, marginRight: '0.26em'};
    if (st == 'word') { const lf = f - myW * step; const s = spring({frame: lf, fps, config: {damping: 12, stiffness: 200}}); style = {...style, opacity: lf < 0 ? 0 : clamp(lf / 3), transform: `translateY(${(1 - s) * 30}px) scale(${0.6 + 0.4 * s})`}; }
    if (st == 'letter' || st == 'type') {
      return <span key={k} style={style}>{[...w].map((ch, j) => { const lf = f - (ci++) * step; const s = st == 'type' ? (lf >= 0 ? 1 : 0) : spring({frame: lf, fps, config: {damping: 10, stiffness: 220}}); return <span key={j} style={{display: 'inline-block', opacity: lf < 0 ? 0 : 1, transform: `translateY(${(1 - s) * 40}px)`}}>{ch}</span>; })}</span>;
    }
    return <span key={k} style={style}>{w}</span>;
  })}</div>)}</div>;
}
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function EmojiLayer({L, f, fps, total}) {
  const size = clamp(+L.size || 120, 20, 400), n = clamp(+L.n || 1, 1, 24) | 0, fx = L.fx || 'none';
  const st = {fontSize: size, lineHeight: 1, fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"};
  if (fx == 'none') return <div style={st}>{L.ch || '✨'}</div>;
  const k = clamp(f / Math.max(10, total));
  return <div style={{position: 'relative', width: 0, height: 0}}>{Array.from({length: n}, (_, i) => {
    let x = 0, y = 0, op = 1, rot = 0;
    if (fx == 'float') { const o = i * 4, q = clamp((f - o) / Math.max(10, total - o)); x = (hash(i) - 0.5) * 360; y = -520 * (1 - (1 - q) * (1 - q)); op = f < o ? 0 : 1 - q; rot = (hash(i + 9) - 0.5) * 30; }
    if (fx == 'burst') { const a = i / n * Math.PI * 2 + hash(i) * 0.3, s = spring({frame: f, fps, config: {damping: 20, stiffness: 60}}); x = Math.cos(a) * 400 * s; y = Math.sin(a) * 400 * s; op = 1 - clamp((k - 0.55) * 2.2); }
    return <div key={i} style={{...st, position: 'absolute', left: x, top: y, opacity: op, transform: `translate(-50%,-50%) rotate(${rot}deg)`}}>{L.ch || '✨'}</div>;
  })}</div>;
}
function RainLayer({L, f, total}) {
  const size = clamp(+L.size || 90, 20, 300), n = clamp(+L.n || 12, 1, 24) | 0, k = clamp(f / Math.max(10, total));
  return <AbsoluteFill style={{pointerEvents: 'none'}}>{Array.from({length: n}, (_, i) => {
    const sp = 0.7 + hash(i + 3) * 0.6, y = -150 + 2200 * ((k * sp + hash(i + 5)) % 1);
    return <div key={i} style={{position: 'absolute', left: hash(i) * 1080, top: y, fontSize: size, lineHeight: 1, transform: `translate(-50%,-50%) rotate(${(hash(i + 7) - 0.5) * 45}deg)`}}>{L.ch || '✨'}</div>;
  })}</AbsoluteFill>;
}
function shapePath(L) {
  const w = +L.w || 200, h = +L.h || w;
  switch (L.sh) {
    case 'circle': case 'ring': return {d: `M ${w / 2} 0 A ${w / 2} ${h / 2} 0 1 1 ${-w / 2} 0 A ${w / 2} ${h / 2} 0 1 1 ${w / 2} 0`};
    case 'heart': { const s = w / 120; return {d: `M0 ${40 * s} C ${-50 * s} ${5 * s} ${-60 * s} ${-20 * s} ${-45 * s} ${-38 * s} C ${-30 * s} ${-56 * s} ${-8 * s} ${-50 * s} 0 ${-30 * s} C ${8 * s} ${-50 * s} ${30 * s} ${-56 * s} ${45 * s} ${-38 * s} C ${60 * s} ${-20 * s} ${50 * s} ${5 * s} 0 ${40 * s} Z`}; }
    case 'star': case 'burst': { const n = L.sh == 'star' ? 5 : 12, r1 = w / 2, r2 = L.sh == 'star' ? w / 4.4 : w / 3.2; let d = ''; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = -Math.PI / 2 + i * Math.PI / n; d += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1) + ' '; } return {d: d + 'Z'}; }
    case 'underline': return {d: `M ${-w / 2} 0 Q 0 ${h * 0.25} ${w / 2} ${-h * 0.1}`};
    case 'line': case 'arrow': { const x2 = (+L.x2 || (+L.x + w)) - (+L.x || 0), y2 = (+L.y2 || +L.y || 0) - (+L.y || 0); let d = `M0 0 L ${x2} ${y2}`; if (L.sh == 'arrow') { const a = Math.atan2(y2, x2), hs = clamp(+L.sw || 10, 2, 30) * 3.2; d += ` M ${x2} ${y2} L ${x2 - hs * Math.cos(a - 0.5)} ${y2 - hs * Math.sin(a - 0.5)} M ${x2} ${y2} L ${x2 - hs * Math.cos(a + 0.5)} ${y2 - hs * Math.sin(a + 0.5)}`; } return {d}; }
    default: { const r = clamp(+L.r || 18, 0, Math.min(w, h) / 2); return {d: `M ${-w / 2 + r} ${-h / 2} H ${w / 2 - r} Q ${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + r} V ${h / 2 - r} Q ${w / 2} ${h / 2} ${w / 2 - r} ${h / 2} H ${-w / 2 + r} Q ${-w / 2} ${h / 2} ${-w / 2} ${h / 2 - r} V ${-h / 2 + r} Q ${-w / 2} ${-h / 2} ${-w / 2 + r} ${-h / 2} Z`}; }
  }
}
let _svgP = null;
function pathLen(d) { try { if (!_svgP) { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); _svgP = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svg.appendChild(_svgP); svg.style.cssText = 'position:absolute;width:0;height:0'; document.body.appendChild(svg); } _svgP.setAttribute('d', d); return _svgP.getTotalLength(); } catch (e) { return 2000; } }
function ShapeLayer({L, f, fps}) {
  const {d} = shapePath(L);
  const draw = !!L.draw || L.sh == 'ring' || L.sh == 'arrow' || L.sh == 'line' || L.sh == 'underline';
  const p = draw ? spring({frame: f, fps, config: {damping: 20, stiffness: 70}}) : 1;
  const sw = clamp(+L.sw || 10, 1, 40);
  const w = +L.w || 200, h = +L.h || w;
  const E = Math.ceil(Math.max(w, h, Math.abs((+L.x2 || 0) - (+L.x || 0)) * 2, Math.abs((+L.y2 || 0) - (+L.y || 0)) * 2) / 2 + sw * 4 + 10);
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const c = ref.current; if (!c) return; const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
    g.save(); g.translate(E, E); const P = new Path2D(d);
    g.lineWidth = sw; g.lineCap = 'round'; g.lineJoin = 'round';
    if (L.fill && (!draw || p > 0.98)) { g.fillStyle = L.fill; g.fill(P); }
    const stroke = L.stroke || (L.fill ? null : '#fff');
    if (stroke) { g.strokeStyle = stroke; if (draw) { const len = pathLen(d); g.setLineDash([len, len]); g.lineDashOffset = len * (1 - p); } g.stroke(P); }
    g.restore();
  });
  return <canvas ref={ref} width={E * 2} height={E * 2} style={{display: 'block', width: E * 2, height: E * 2}}/>;
}
function SvgLayer({L}) {
  const w = clamp(+L.w || 300, 10, 1080), h = clamp(+L.h || w, 10, 1920);
  let svg = String(L.svg || '');
  if (!/^\s*<svg/i.test(svg)) return null;
  if (!/xmlns=/.test(svg)) svg = svg.replace(/<svg/i, "<svg xmlns='http://www.w3.org/2000/svg'");
  return <img src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)} width={w} height={h} style={{display: 'block', width: w, height: h}}/>;
}
function FrameLayer({L, src, srcT}) {
  const w = +L.w || 420, h = +L.h || 420, s = clamp(+L.s || 2, 1, 5), b = clamp(+L.b || 12, 0, 40);
  const cx = +L.cx || 540, cy = +L.cy || 800;
  return <div style={{background: L.bcolor || '#fff', padding: b, paddingBottom: L.caption ? 70 : b, borderRadius: 14, boxShadow: '0 18px 40px rgba(0,0,0,.5)'}}>
    <div style={{width: w, height: h, overflow: 'hidden', position: 'relative', borderRadius: 8}}>
      {src ? <div style={{position: 'absolute', width: 1080 * s, height: 1920 * s, left: -(cx * s - w / 2), top: -(cy * s - h / 2)}}><Video src={src} trimBefore={Math.round(srcT * FPS)} muted objectFit="cover" style={{width: '100%', height: '100%'}}/></div> : null}
    </div>
    {L.caption ? <div style={{fontFamily: FONTS.l, fontStyle: 'italic', fontSize: 46, color: '#222', textAlign: 'center', marginTop: 10}}>{L.caption}</div> : null}
  </div>;
}
function Insert({n, src}) {
  const f = useCurrentFrame(), {fps} = useVideoConfig();
  const D = Math.round(n.d * fps);
  const c = n.cam || {};
  return <AbsoluteFill style={{pointerEvents: 'none'}}>
    {c.dim ? <AbsoluteFill style={{background: '#000', opacity: clamp(+c.dim, 0, 0.8) * clamp(f / 6) * clamp((D - f) / 6)}}/> : null}
    {(n.layers || []).map((L, i) => {
      const at = Math.round((+L.at || 0) * fps), lf = f - at;
      const ld = Math.max(6, Math.min(isFinite(L.dur) ? Math.round(+L.dur * fps) : D - at, D - at));
      if (lf < 0 || lf > ld) return null;
      if (L.k == 'emoji' && L.fx == 'rain') return <RainLayer key={i} L={L} f={lf} total={ld}/>;
      const a = inAnim(L.in || 'pop', lf, fps), o = outAnim(L.out || 'fade', lf, ld), l = loopAnim(L.loop || 'none', lf / fps);
      const x = +L.x || 540, y = (+L.y || 600) + (n._dy || 0);
      const tr = `translate(-50%,-50%) translate(${a.dx + o.dx + l.dx}px,${a.dy + o.dy + l.dy}px) rotate(${(+L.rot || 0) + a.rot + l.rot}deg) scale(${a.sc * o.sc * l.sc})`;
      const inner = L.k == 'text' ? <TextLayer L={L} f={lf} fps={fps}/> : L.k == 'emoji' ? <EmojiLayer L={L} f={lf} fps={fps} total={ld}/> : L.k == 'shape' ? <ShapeLayer L={L} f={lf} fps={fps}/> : L.k == 'svg' ? <SvgLayer L={L}/> : L.k == 'frame' ? <FrameLayer L={L} src={src} srcT={n.t + (+L.at || 0)}/> : null;
      return <div key={i} style={{position: 'absolute', left: x, top: y, transform: tr, opacity: clamp(a.al * o.al), transformOrigin: 'center'}}>{inner}</div>;
    })}
    {c.flash ? <AbsoluteFill style={{background: '#fff', opacity: 0.45 * (f < 2 ? f / 2 : clamp(1 - (f - 2) / 6))}}/> : null}
  </AbsoluteFill>;
}

// ===== графика от Claude поверх видео (время исходника) =====
const compiled = new Map();
function getOverlay(ov) {
  if (!ov || !ov.code) return null;
  const key = ov.code.length + ':' + ov.code.slice(-200) + ':' + (ov.lib || '').length;
  let c = compiled.get(key);
  if (!c) { try { c = {fns: compile(ov.lib, ov.code), rt: makeK(ov.brief)}; c.rt.setLayout(c.fns.layout); } catch (e) { c = {err: String(e && e.message || e)}; } compiled.set(key, c); }
  return c;
}
function Overlay({ov, srcT}) {
  const ref = React.useRef(null);
  const c = getOverlay(ov);
  React.useLayoutEffect(() => { const cv = ref.current; if (!cv || !c || !c.fns) return; drawFrame(cv.getContext('2d'), c.rt, c.fns, srcT); });
  if (!c || !c.fns) return null;
  return <canvas ref={ref} width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920}}/>;
}

// ===== субтитры =====
const SUB_FONT = {fontFamily: FONTS.b, fontWeight: 900};
function Subs({chunks, style, theme = {}, split = 0}) {
  const AC = theme.accent || '#FFD43B', TX = theme.subText || '#fff', ST = theme.subStroke || '#000';
  const f = useCurrentFrame(), {fps} = useVideoConfig(), T = f / fps;
  if (style == 'off') return null;
  const c = chunks.find((c) => T >= c.s && T < c.e); if (!c) return null;
  let idx = -1; c.forEach((w, i) => { if (T >= w.os) idx = i; });
  // отступы между словами полями, а не gap: при сборке MP4 gap теряется и слова слипаются
  const sp = (ch, m) => Array.isArray(ch) ? ch.map((c, i) => <span key={i} style={{display: 'inline-block', margin: `0 ${m}px`}}>{c}</span>) : ch;
  const wrap = (children, extra = {}) => <div style={{position: 'absolute', left: 40, right: 40, top: 1380, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', ...extra}}>{sp(children, 11)}</div>;
  if (style == 'steps') {
    // как в пошаговых рилсах: белые слова без обводки; в режиме панели внизу панели, иначе по центру груди
    const y = interpolate(split, [0, 1], [1170, 815]);
    const vis = c.filter((w) => T >= w.os - 0.02);
    const k = clamp((T - c.s) / 0.12);
    return <div style={{position: 'absolute', left: 60, right: 60, top: y, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', opacity: k, transform: `translateY(${(1 - k) * 10}px)`}}>
      {c.map((w, i) => <span key={i} style={{display: 'inline-block', margin: '0 8px', fontFamily: FONTS.m, fontWeight: 700, fontSize: 58, letterSpacing: -0.5, color: '#fff', opacity: vis.includes(w) ? 1 : 0.55, textShadow: split > 0.5 ? 'none' : '0 3px 14px rgba(0,0,0,.65), 0 1px 3px rgba(0,0,0,.6)'}}>{w.w}</span>)}
    </div>;
  }
  if (style == 'pop') { const w = c[Math.max(0, idx)]; const s = spring({frame: Math.round((T - w.os) * fps), fps, config: {damping: 10, stiffness: 220}}); return wrap(<div style={{...SUB_FONT, fontSize: 110, color: idx % 2 ? TX : AC, textShadow: outline(ST, 7), transform: `scale(${0.5 + 0.5 * s}) rotate(${idx % 2 ? 3 : -3}deg)`}}>{w.w.toUpperCase()}</div>); }
  if (style == 'type') { const vis = c.filter((w) => T >= w.os); return wrap(<div style={{fontFamily: FONTS.m, fontWeight: 700, fontSize: 58, color: '#fff', background: 'rgba(0,0,0,.82)', padding: '10px 26px', borderRadius: 18}}>{vis.map((w) => w.w).join(' ')}</div>); }
  return wrap(c.map((w, i) => {
    const on = i == idx;
    if (style == 'neon') return <span key={i} style={{...SUB_FONT, fontSize: 70, color: on ? '#fff' : '#FF4FA3', opacity: T >= w.os ? 1 : 0.45, textShadow: `0 0 ${on ? 30 : 14}px #FF4FA3`}}>{w.w}</span>;
    if (style == 'wave') { const y = on ? -22 * Math.sin(clamp((T - w.os) / 0.3) * Math.PI) : 0; return <span key={i} style={{...SUB_FONT, fontSize: 66, color: on ? '#C6FF3D' : '#fff', textShadow: outline('#000', 5), transform: `translateY(${y}px)`, display: 'inline-block'}}>{w.w}</span>; }
    const s = on ? 1 + 0.12 * clamp((T - w.os) / 0.1) : 1;
    return <span key={i} style={{...SUB_FONT, fontSize: 66, color: on ? AC : TX, textShadow: outline(ST, 5), transform: `scale(${s})`, display: 'inline-block'}}>{w.w}</span>;
  }));
}

// ===== камера =====
function camAt(T, segIdx, inserts, jumpZoom) {
  let z = jumpZoom && segIdx % 2 ? 1.1 : 1, x = 0, y = 0;
  for (const n of inserts) {
    if (T < n.o || T >= n.o + n.d) continue;
    const c = n.cam || {}, p = T - n.o, d = n.d;
    if (c.zoom && c.zoom != 1) { const za = +c.zoomAt || 0; const k = clamp((p - za) / 0.3), e = 1 - Math.pow(1 - k, 3), back = clamp((p - (d - 0.35)) / 0.35); z *= 1 + (clamp(+c.zoom, 1, 1.25) - 1) * e * (1 - back * back * (3 - 2 * back)); }
    if (c.shake) { const sa = +c.shakeAt || 0; if (p > sa && p < sa + 0.24) { const k = Math.floor((p - sa) / 0.04); const s = clamp(+c.shake, 0, 14); x += (k % 2 ? -1 : 1) * s; y += ((k % 3) - 1) * s * 0.5; } }
  }
  return {z, x, y};
}

export const Montage = ({src, segs = [], inserts = [], chunks = [], subStyle = 'karaoke', jumpZoom = true, outDur = 1, theme = {}, overlay = null, soundUrl = null}) => {
  const f = useCurrentFrame(), {fps} = useVideoConfig(), T = f / fps;
  let segIdx = 0; segs.forEach((g, i) => { if (T >= g.o) segIdx = i; });
  const cam = camAt(T, segIdx, inserts, jumpZoom);
  const g0 = segs[segIdx]; const srcT = g0 ? g0.s + Math.max(0, Math.min(T - g0.o, g0.e - g0.s)) : T;
  const oc = getOverlay(overlay);
  const split = oc && oc.rt ? oc.rt.split(srcT) : 0, ty = oc && oc.rt ? oc.rt.ty * split : 0;
  return <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
    <AbsoluteFill style={{clipPath: split > 0.001 ? `inset(${(960 * split).toFixed(1)}px 0 0 0)` : undefined}}>
      <AbsoluteFill style={{transform: `translate(${cam.x}px,${cam.y + ty}px) scale(${cam.z})`, transformOrigin: `540px ${800 - ty * 0}px`}}>
        {src ? segs.map((g, i) => <Sequence key={i + ':' + g.s} from={Math.round(g.o * fps)} durationInFrames={Math.max(1, Math.round((g.e - g.s) * fps))} premountFor={15}>
          <Video src={src} trimBefore={Math.round(g.s * fps)} objectFit="cover" style={{width: '100%', height: '100%'}}/>
        </Sequence>) : null}
      </AbsoluteFill>
    </AbsoluteFill>
    <Overlay ov={overlay} srcT={srcT}/>
    <Subs chunks={chunks} style={subStyle} theme={theme} split={split}/>
    {inserts.map((n) => <Sequence key={n.id} from={Math.round(n.o * fps)} durationInFrames={Math.max(1, Math.round(n.d * fps))} layout="none">
      <Insert n={n} src={src}/>
      {n.sfx == 'pop' || n.sfx == 'thud' ? <Audio src={n.sfx == 'pop' ? 'a/pop.wav' : 'a/thud.wav'} volume={n.sfx == 'thud' ? 0.35 : 0.22}/> : null}
    </Sequence>)}
    {soundUrl ? segs.map((g, i) => <Sequence key={'sfx' + i + ':' + g.s} from={Math.round(g.o * fps)} durationInFrames={Math.max(1, Math.round((g.e - g.s) * fps))}><Audio src={soundUrl} trimBefore={Math.round(g.s * fps)}/></Sequence>) : null}
    <div style={{position: 'absolute', left: 0, top: 0, height: 10, width: `${clamp(T / outDur) * 100}%`, background: theme.accent || '#FFD43B'}}/>
  </AbsoluteFill>;
};
