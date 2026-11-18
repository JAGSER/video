import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));

export function Intro({intro}) {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!intro) return null;
  const total = Math.round(fps * 1.2);
  const inS = spring({frame: f, fps, config: {damping: 13, stiffness: 170}});
  const out = clamp((f - total + 12) / 12);
  const e = out * out;
  const opacity = clamp(inS) * (1 - e);
  const y = interpolate(inS, [0, 1], [90, 0]) - 180 * e;
  const scale = interpolate(inS, [0, 1], [.82, 1]) * (1 - e * .12);
  return <AbsoluteFill style={{zIndex: 20, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity, transform: `translateY(${y}px) scale(${scale})`, textAlign: 'center', padding: 28, fontFamily: 'InterBlack, Inter, system-ui, sans-serif'}}>
    <div style={{color: '#C6FF3D', fontSize: 92, lineHeight: .94, letterSpacing: -3, textShadow: '0 8px 28px rgba(0,0,0,.5)'}}>{intro.title}</div>
    <div style={{marginTop: 28, color: '#fff', fontSize: 38, lineHeight: 1.08, maxWidth: 900, textShadow: '0 5px 18px rgba(0,0,0,.6)'}}>{intro.sub}</div>
  </AbsoluteFill>;
}

function Glitch({q, index}) {
  const strips = Array.from({length: 7});
  return <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', opacity: clamp(1 - q * 1.2)}}>
    {strips.map((_, i) => {
      const y = i * 15 + 4;
      const x = Math.sin(index * 8 + i * 3.7) * 34 * (1 - q);
      const c = i % 3 === 0 ? '#FF4FA3' : i % 3 === 1 ? '#3D8BFF' : '#C6FF3D';
      return <div key={i} style={{position: 'absolute', left: 0, right: 0, top: `${y}%`, height: `${4 + (i % 3) * 2}%`, background: c, opacity: .72, transform: `translateX(${x}px) skewX(${(i % 2 ? -1 : 1) * 8}deg)`}} />;
    })}
  </AbsoluteFill>;
}

function Edge({q, kind, index, flash}) {
  const p = clamp(q / .25);
  if (kind === 'wipe') return <AbsoluteFill style={{pointerEvents: 'none', background: '#C6FF3D', clipPath: `inset(0 ${100 - p * 100}% 0 0)`, opacity: 1}} />;
  if (kind === 'glitch') return <Glitch q={p} index={index}/>;
  const hit = 1 - p;
  return <AbsoluteFill style={{pointerEvents: 'none', opacity: hit * (kind === 'zoom' ? .9 : .7), background: '#fff', transform: `scale(${1 + hit * .18})`}} />;
}

export function Transitions({segs = [], trans, etype}) {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const T = f / fps;
  return <AbsoluteFill style={{pointerEvents: 'none', zIndex: 12}}>
    {segs.slice(1).map((g, i) => {
      const q = T - g.o;
      if (q < 0 || q >= .25) return null;
      const kind = trans === 'mix' ? ['zoom', 'wipe', 'glitch'][i % 3] : (trans || 'zoom');
      return <React.Fragment key={`${g.o}:${i}`}>
        <Edge q={q} kind={kind} index={i} flash={etype === 'adhd' || etype === 'ad'}/>
        {(etype === 'adhd' || etype === 'ad') && <AbsoluteFill style={{background: '#fff', opacity: clamp(1 - q / .2) * .72, pointerEvents: 'none'}} />}
      </React.Fragment>;
    })}
  </AbsoluteFill>;
}

export function camBoost(T, segs = [], etype) {
  if (!segs.length) return 1;
  let i = 0;
  for (let n = 0; n < segs.length; n++) if (T >= segs[n].o) i = n;
  let base = etype === 'adhd' ? (i % 2 ? 1.12 : 1) : 1;
  if (etype === 'adhd' || etype === 'ad') {
    const g = segs[i];
    const q = T - g.o;
    if (i > 0 && q >= 0 && q < .2) base *= interpolate(clamp(q / .2), [0, 1], [1.15, 1]);
  }
  return base;
}
