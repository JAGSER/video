// 10 экранов функций в разметке демо «Просмотр: 10 функций». Анимации, классы и кривые те же,
// данные настоящие: фразы, куски линии, сцены, ролики. play = событие: анимация играет один раз (класс .once),
// иначе экран показывает текущее состояние ролика без движения (.still).
import {COLORS} from '../edit.js';

const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);
const W = 342, GAP = 4;
const root = (d, body) => `<div class="enter ${d.play ? 'once' : 'still'}" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${d.edir}">${body}</div>`;
const video = (d, extra = '', inner = null) => `<div class="pv">${inner == null ? d.pv : inner}${extra}<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${esc(d.badge)}</div></div>`;
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const P = (S) => new Map((S.phr || []).map((p) => [p.id, p]));
const orderOf = (S) => (S.order && S.order.length ? S.order : (S.phr || []).map((p) => p.id));
const colorOf = (id) => COLORS[id % 6];
// раскладка кусков линии для списка фраз: ширина пропорциональна длительности, зазор 4 px
function layout(S, ids, gap = GAP) {
  const M = P(S), it = ids.map((id) => ({id, d: Math.max(0.2, (M.get(id) || {e: 1, s: 0}).e - (M.get(id) || {s: 0}).s)}));
  const sum = it.reduce((a, x) => a + x.d, 0) || 1, avail = W - gap * Math.max(0, it.length - 1);
  let x = 0; const out = new Map();
  it.forEach((o) => { const w = Math.max(6, avail * o.d / sum); out.set(o.id, {left: Math.round(x), width: Math.max(6, Math.round(w))}); x += w + gap; });
  return out;
}
const kept = (S) => { const dr = new Set(S.drop || []); return orderOf(S).filter((id) => !dr.has(id)); };
const plainLine = (S) => { const ids = kept(S), L = layout(S, ids); return ids.map((id) => { const g = L.get(id); return `<div class="seg" style="left: ${g.left}px; width: ${g.width}px; background: ${colorOf(id)}"></div>`; }).join(''); };
const fmtS = (d, t) => (d.fmt ? d.fmt(t) : Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'));

// 0. Перестановка фраз: перенесённая фраза перелетает по дуге (hop), остальные сдвигаются (sh); на линии так же
export function screen0(d) {
  const S = d.S, M = P(S), a = d.anim, play = d.play && a;
  const before = play ? (a.before.order || orderOf(S)) : orderOf(S), after = play ? (a.after.order || orderOf(S)) : orderOf(S);
  const dr = new Set(S.drop || []);
  const vis = before.filter((id) => !dr.has(id)), aft = after.filter((id) => !dr.has(id));
  const N = Math.min(4, vis.length), step = 46;
  // показываем строки, которые участвуют в перестановке: первые по новому порядку и их старые места
  const show = play ? [...new Set([...aft.slice(0, N), ...vis.slice(0, N)])].slice(0, N).sort((x, y) => vis.indexOf(x) - vis.indexOf(y)) : vis.slice(0, N);
  const tIdx = new Map(aft.filter((id) => show.includes(id)).map((id, i) => [id, i]));
  const rows = show.map((id, i) => {
    const ti = tIdx.has(id) ? tIdx.get(id) : i, dy = (ti - i) * step, up = ti < i;
    const cls = play ? (up ? 'hop' : 'sh') : '';
    const vars = play ? (up ? `--ax: -24px; --ay: ${Math.round(dy / 2)}px; --x: 0px; --y: ${dy}px; z-index: 2` : `--y: ${dy}px; animation-delay: ${(i * 0.04).toFixed(2)}s`) : '';
    return `<div class="row ${cls}" style="top: ${244 + i * step}px; height: 38px; ${vars}"><span class="tk" style="background: ${colorOf(id)}"></span>${esc(cut((M.get(id) || {}).text || '', 34))}</div>`;
  }).join('');
  const LB = layout(S, vis), LA = layout(S, aft);
  const segs = vis.map((id, i) => {
    const g = LB.get(id), t = LA.get(id) || g, dx = t.left - g.left, up = aft.indexOf(id) < i;
    const cls = play ? (up && dx < 0 ? 'hop' : 'sh') : '';
    const vars = play ? (cls == 'hop' ? `--ax: ${Math.round(dx / 2)}px; --ay: -34px; --x: ${dx}px; --y: 0px; z-index: 2` : `--x: ${dx}px; animation-delay: ${(i * 0.02).toFixed(2)}s`) : '';
    return `<div class="seg ${cls}" style="left: ${g.left}px; width: ${g.width}px; background: ${colorOf(id)}; ${vars}"></div>`;
  }).join('');
  return root(d, video(d) + `<div class="card" style="top: 206px; height: 236px"></div><span class="lbl" style="left: 14px; top: 220px">РАСШИФРОВКА</span>` + rows + segs);
}

// 1. Лучшие дубли: худшие дубли улетают (out), лучшие поднимаются (hop) с ярлыком «ЛУЧШИЙ»; на линии col / lit
export function screen1(d) {
  const S = d.S, M = P(S), a = d.anim, play = d.play && a;
  const groups = (a && a.before && a.before.groups) || [];
  const dr = new Set(S.drop || []);
  let ids = groups.flatMap((g) => g.ids || []).filter((id) => M.has(id));
  if (!ids.length) ids = orderOf(S);
  ids = ids.slice(0, 5);
  const best = new Set(groups.map((g) => g.best)), score = {};
  groups.forEach((g) => Object.entries(g.scores || {}).forEach(([k, v]) => { score[k] = v; }));
  let bi = 0;
  const rows = ids.map((id, i) => {
    const isBest = best.has(id), isOut = dr.has(id) && !isBest;
    if (!play && isOut) return '';
    const sc = score[id] != null ? Math.round(score[id]) + '%' : '';
    let cls = '', vars = '';
    if (play && isOut) { cls = 'out'; vars = `animation-delay: ${(i * 0.05).toFixed(2)}s`; }
    if (play && isBest) { const ty = 240 + bi * 40, dy = ty - (240 + i * 40); cls = dy ? 'hop' : ''; vars = `--ay: ${Math.round(dy / 2)}px; --y: ${dy}px; z-index: 2`; }
    const top = play ? 240 + i * 40 : 240 + (ids.filter((x, k) => k < i && !(dr.has(x) && !best.has(x)))).length * 40;
    if (isBest) bi++;
    const tag = isBest ? `<span class="pop" style="padding: 3px 8px; border-radius: 999px; background: #C6FF3D; color: #0B0B0F; font-size: 10px; font-weight: 800; flex: none">ЛУЧШИЙ</span>` : `<b>${sc}</b>`;
    return `<div class="row ${cls}" style="top: ${top}px; height: 34px; justify-content: space-between; ${vars}"><span style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis">${esc((M.get(id) || {}).text || '')}</span>${tag}</div>`;
  }).join('');
  const all = orderOf(S), L = layout(S, all);
  const line = all.map((id, i) => {
    const g = L.get(id), out = dr.has(id), b = best.has(id);
    if (!play && out) return '';
    const cls = play ? (out ? 'col' : (b ? 'lit' : '')) : '';
    return `<div class="${cls}" style="--w: ${g.width}px; width: ${g.width}px; flex: none; border-radius: 8px; background: ${colorOf(id)}; animation-delay: ${(i * 0.03).toFixed(2)}s"></div>`;
  }).join('');
  return root(d, video(d) + `<div class="card" style="top: 206px; height: 244px"></div><span class="lbl" style="left: 14px; top: 218px">ДУБЛИ · ИИ ОЦЕНИВАЕТ</span>` + rows + `<div style="position: absolute; left: 0; top: 504px; height: 52px; display: flex; gap: 4px">${line}</div>`);
}

// 2. Сократи до N с: вырезанные строки зачёркиваются и схлопываются (cut), куски схлопываются (col), счётчик длины прокручивается (roll)
export function screen2(d) {
  const S = d.S, M = P(S), a = d.anim, play = d.play && a;
  const dropNow = new Set(play ? (a.after.dropIds || []) : []), drPrev = new Set(play ? (S.drop || []).filter((x) => !dropNow.has(x)) : (S.drop || []));
  const ids = orderOf(S).filter((id) => !drPrev.has(id));
  const d0 = play ? (a.before.dur || 0) : (d.R ? d.R.outDur : 0), d1 = play ? (a.after.dur || d0) : d0;
  const vals = play ? [d0, d0 + (d1 - d0) * 0.3, d0 + (d1 - d0) * 0.55, d0 + (d1 - d0) * 0.8, d1] : [d1];
  const roll = `<div style="position: absolute; right: 18px; top: 60px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px"><span style="font-size: 11px; font-weight: 700; color: #A1A1AA">ДЛИНА</span><div style="height: 48px; overflow: hidden"><div class="roll" style="display: flex; flex-direction: column; font-family: Unbounded, sans-serif; font-weight: 800; font-size: 34px; line-height: 48px; text-align: right">${vals.map((v, i) => `<span${i == vals.length - 1 ? ' class="hit"' : ''}>${fmtS(d, v)}</span>`).join('')}</div></div></div>`;
  const shown = (play ? ids : ids.filter((id) => !dropNow.has(id))).slice(0, 6);
  const rows = shown.map((id, i) => `<div${play && dropNow.has(id) ? ` class="cut" style="animation-delay: ${(i * 0.06 % 0.2).toFixed(2)}s;` : ' style="'} padding: 7px 10px; border-radius: 8px; background: #23232C; font-size: 13px; line-height: 16px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc((M.get(id) || {}).text || '')}</div>`).join('');
  const L = layout(S, ids);
  const line = ids.map((id, i) => { const g = L.get(id), x = dropNow.has(id); if (!play && x) return ''; return `<div${play && x ? ` class="col" style="--w: ${g.width}px; animation-delay: ${(i * 0.04 % 0.2).toFixed(2)}s;` : ' style="'} width: ${g.width}px; flex: none; border-radius: 8px; background: ${play && x ? '#5A5A6A' : colorOf(id)}"></div>`; }).join('');
  return root(d, video(d, roll) + `<div style="position: absolute; left: 0; right: 0; top: 206px; padding: 14px; border-radius: 16px; background: #17171D; display: flex; flex-direction: column"><span style="font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #A1A1AA; margin-bottom: 10px">РАСШИФРОВКА</span>${rows}</div><div style="position: absolute; left: 0; top: 504px; height: 52px; display: flex; gap: 4px">${line}</div>`);
}

// 3. Разбей на 3 ролика: строки окрашиваются в цвет своего ролика (tint), блоки летят на линию (fly), три ролика на линии
const GC = ['#FF7A1A', '#8B6CFF', '#FF4FA3'];
export function screen3(d) {
  const S = d.S, M = P(S), a = d.anim, play = d.play && a;
  const groups = (play ? a.after.groups : S.reels) || null;
  const grp = new Map(); (groups || []).forEach((g, gi) => g.forEach((id) => grp.set(id, gi)));
  const dr = new Set(S.drop || []);
  const ids = (groups ? groups.flat() : orderOf(S)).filter((id) => M.has(id));
  const shown = groups ? groups.flatMap((g) => g.filter((id) => M.has(id)).slice(0, 2)) : ids.slice(0, 6);
  const rows = shown.slice(0, 6).map((id, i) => {
    const gi = grp.has(id) ? grp.get(id) : null, c = gi == null ? null : rgba(GC[gi], gi == 1 ? 0.32 : 0.3);
    const st = play ? `--c: ${c}; animation-delay: ${(0.05 * (gi || 0)).toFixed(2)}s` : (c ? `background: ${c}` : '');
    return `<div class="row ${play ? 'tint' : ''}" style="top: ${240 + i * 28}px; height: 24px; font-size: 12px; ${st}"><span style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis">${esc((M.get(id) || {}).text || '')}</span></div>`;
  }).join('');
  const dur = (g) => g.reduce((s, id) => { const p = M.get(id); return s + (p && !dr.has(id) ? p.e - p.s + 0.16 : 0); }, 0);
  const ws = groups ? groups.map((g) => Math.max(1, dur(g))) : [];
  const sum = ws.reduce((x, y) => x + y, 0) || 1, avail = W - 8;
  let x = 0; const blocks = ws.map((w) => { const bw = Math.round(avail * w / sum); const r = {left: Math.round(x), width: bw}; x += bw + 4; return r; });
  const flies = play && groups ? groups.map((g, gi) => { const fi = shown.findIndex((id) => grp.get(id) == gi); const top = 240 + Math.max(0, fi) * 28, b = blocks[gi]; const sx = 0.33, dx = (b.left + b.width / 2) - 171, dy = 504 + 26 - (top + 26); return `<div class="fly" style="position: absolute; left: 14px; right: 14px; top: ${top}px; height: 52px; border-radius: 8px; background: ${GC[gi]}; --x: ${Math.round(dx)}px; --y: ${Math.round(dy)}px; --s: ${sx}; z-index: 3; animation-delay: ${(gi * 0.05).toFixed(2)}s"></div>`; }).join('') : '';
  const line = groups ? blocks.map((b, gi) => `<div class="${play ? 'sh' : ''}" style="position: absolute; left: ${b.left}px; top: 504px; width: ${b.width}px; height: 52px; --x: ${gi == 0 ? -2 : gi == 2 ? 2 : 0}px"><div class="${play ? 'tint' : ''}" style="width: 100%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center; ${play ? `--b: #3D8BFF; --c: ${GC[gi]}; animation-delay: ${(0.8 + gi * 0.05).toFixed(2)}s` : `background: ${GC[gi]}`}"><span class="${play ? 'pop' : ''}" style="font-size: 11px; font-weight: 800; color: #0B0B0F; white-space: nowrap; animation-delay: ${(0.3 + gi * 0.05).toFixed(2)}s">REELS ${gi + 1} · ${fmtS(d, ws[gi])}</span></div></div>`).join('') : plainLine(S);
  const ready = groups ? `<span class="${play ? 'pop ' : ''}lbl" style="left: 0; top: 440px; color: #C6FF3D; animation-delay: 0.3s">3 ГОТОВЫХ REELS</span><button data-act="dl-reels" style="position: absolute; right: 0; top: 432px; height: 30px; padding: 0 12px; border-radius: 999px; border: 0; background: #C6FF3D; color: #0B0B0F; font: 800 11px Inter, sans-serif">${d.progress != null && d.progress < 1 ? Math.round(d.progress * 100) + '%' : 'СКАЧАТЬ 3 MP4'}</button>` : '';
  return root(d, video(d) + `<div class="card" style="top: 206px; height: 214px"></div><span class="lbl" style="left: 14px; top: 218px">РАСШИФРОВКА · ${fmtS(d, d.R ? d.R.outDur : 0)}</span>` + rows + flies + ready + line);
}

// сцены: раскладка 3×2, куски линии по длительности сцен
const scenesOf = (S, a, play) => ((play && a.after.scenes) || S.scenes || []).slice(0, 6);
const sceneLine = (S, sc) => { const tot = (S.dur || 1), avail = W; let x = 0; return sc.map((c) => { const w = Math.max(10, Math.round(avail * (c.e - c.s) / tot)); const r = {left: Math.round(x), width: w}; x += w; return r; }); };
const SC = ['#FF7A1A', '#3D8BFF', '#8B6CFF', '#FF4FA3', '#C6FF3D', '#FFB23D'];
const cardPos = (i) => ({left: [0, 119, 238][i % 3], top: i < 3 ? 232 : 308});

// 4. Нарезка на сцены: сканер бежит по линии, метки склеек, куски окрашиваются, карточки сцен вылетают с линии
export function screen4(d) {
  const S = d.S, a = d.anim, play = d.play && a, sc = scenesOf(S, a, play);
  if (!sc.length) return root(d, video(d) + `<span class="lbl" style="left: 0; top: 210px">СЦЕНЫ</span><span style="position: absolute; left: 0; top: 240px; padding: 8px 12px; border-radius: 12px; background: #23232C; font-size: 13px">Скажи «нарежь на сцены»</span>` + plainLine(S));
  const L = sceneLine(S, sc);
  const cards = sc.map((c, i) => { const p = cardPos(i), g = L[i], fx = Math.round(g.left + g.width / 2 - (p.left + 52)), fy = Math.round(530 - (p.top + 31)); return `<div class="scard ${play ? 'from' : ''}" style="left: ${p.left}px; top: ${p.top}px; background: ${SC[i]}; --fx: ${fx}px; --fy: ${fy}px; animation-delay: ${(i * 0.06).toFixed(2)}s"><b>Сцена ${i + 1}</b><span>${fmtS(d, c.s)} - ${fmtS(d, c.e)}</span></div>`; }).join('');
  const segs = sc.map((c, i) => `<div class="seg ${play ? 'tint' : ''}" style="left: ${L[i].left}px; width: ${L[i].width}px; ${play ? `--b: #4A4A58; --c: ${SC[i]}; animation-delay: ${(L[i].left / W * 0.8).toFixed(2)}s` : `background: ${SC[i]}`}"></div>`).join('');
  const marks = play ? L.slice(1).map((g) => `<div class="mark" style="position: absolute; left: ${g.left - 1}px; top: 498px; width: 3px; height: 64px; animation-delay: ${(g.left / W * 0.8).toFixed(2)}s"></div>`).join('') + `<div class="scan" style="position: absolute; left: 0; top: 494px; width: 3px; height: 72px; background: #C6FF3D; box-shadow: 0 0 18px 5px rgba(198,255,61,0.55)"></div>` : '';
  return root(d, video(d) + `<span class="lbl" style="left: 0; top: 210px">СЦЕНЫ</span>` + cards + `<span class="${play ? 'pop' : ''}" style="position: absolute; left: 0; top: 392px; padding: 8px 12px; border-radius: 12px; background: #23232C; font-size: 13px; animation-delay: 0.5s">Найдено ${sc.length} сцен по смене кадра и звука</span>` + segs + marks);
}

// 5. Скачать сцены: отмеченные карточки светятся (glowc, tick), улетают на линию (fly), кнопка заполняется по реальному прогрессу
const TICK = (dl) => `<span class="tick" style="position: absolute; right: 8px; top: 8px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #0B0B0F; box-sizing: border-box; display: flex; align-items: center; justify-content: center; animation-delay: ${dl}s"><svg class="on" style="animation-delay: ${dl}s" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B0B0F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg></span>`;
export function screen5(d) {
  const S = d.S, a = d.anim, play = d.play && a, sc = (S.scenes || []).slice(0, 6), pk = new Set(S.pick || []);
  if (!sc.length) return root(d, video(d) + `<span class="lbl" style="left: 0; top: 210px">ОТМЕТЬТЕ СЦЕНЫ</span><span style="position: absolute; left: 0; top: 240px; padding: 8px 12px; border-radius: 12px; background: #23232C; font-size: 13px">Сначала «Нарежь на сцены»</span>` + plainLine(S));
  const L = sceneLine(S, sc); let k = 0;
  const cards = sc.map((c, i) => { const p = cardPos(i), on = pk.has(i), dl = (k * 0.15).toFixed(2); if (on) k++; return `<div data-act="scene" data-arg="${i}" class="scard ${on && play ? 'glowc' : ''}" style="left: ${p.left}px; top: ${p.top}px; background: ${SC[i]}; ${on && !play ? 'box-shadow: 0 0 0 3px #C6FF3D;' : ''} animation-delay: ${dl}s; cursor: pointer"><b>Сцена ${i + 1}</b><span>${fmtS(d, c.e - c.s)}</span>${on ? (play ? TICK(dl) : TICK(0).replace('class="tick"', 'class=""').replace('class="on"', 'class=""')) : ''}</div>`; }).join('');
  let m = 0;
  const flies = play ? sc.map((c, i) => { if (!pk.has(i)) return ''; const p = cardPos(i), g = L[i]; const fx = Math.round(g.left + g.width / 2 - (p.left + 52)), fy = Math.round(530 - (p.top + 31)); return `<div class="fly" style="position: absolute; left: ${p.left}px; top: ${p.top}px; width: 104px; height: 62px; border-radius: 10px; background: ${SC[i]}; --x: ${fx}px; --y: ${fy}px; --s: 0.2; z-index: 3; animation-delay: ${(0.7 + 0.06 * m++).toFixed(2)}s"></div>`; }).join('') : '';
  const n = [...pk].filter((i) => sc[i]).length, pr = d.progress;
  const btn = pr != null ? `<div style="position: absolute; inset: 0; background: #C6FF3D; transform-origin: left; transform: scaleX(${Math.min(1, pr).toFixed(3)})"></div><span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: ${pr > 0.5 ? '#0B0B0F' : '#F4F4F6'}">${pr >= 1 ? 'Готово · ' + n + ' файла MP4' : 'Собираю ' + Math.round(pr * 100) + '%'}</span>`
    : `<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 15px; font-weight: 700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4F4F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path></svg>Скачать ${n} ${n == 1 ? 'сцену' : n < 5 ? 'сцены' : 'сцен'}</span>`;
  const segs = sc.map((c, i) => `<div class="seg ${pk.has(i) && play ? 'lit' : ''}" style="left: ${L[i].left}px; width: ${Math.max(6, L[i].width - 2)}px; background: ${SC[i]}; ${pk.has(i) && !play ? 'box-shadow: inset 0 0 0 3px #C6FF3D;' : ''}"></div>`).join('');
  return root(d, video(d) + `<span class="lbl" style="left: 0; top: 210px">ОТМЕТЬТЕ СЦЕНЫ</span>` + cards + flies + `<div data-act="dl-scenes" style="position: absolute; left: 0; right: 0; top: 396px; height: 52px; border-radius: 14px; background: #23232C; overflow: hidden; cursor: pointer">${btn}</div>` + segs);
}

// 6. Сцены-анимации: интро и текст-плашка по смыслу ролика; шаблоны летят на линию, ИНТРО и ТЕКСТ на линии
export function screen6(d) {
  const S = d.S, a = d.anim, play = d.play && a, intro = (play && a.after.intro) || S.intro;
  const pvExtra = intro ? `<div class="${play ? 'pop' : ''}" style="position: absolute; inset: 0; background: #0E1E12; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 0 18px; text-align: center; animation-delay: 0.1s"><b style="font-family: Unbounded, sans-serif; font-weight: 800; font-size: 20px; line-height: 1.15; color: #C6FF3D">${esc(intro.title || '')}</b><span style="font-size: 13px; color: #F4F4F6">${esc(intro.sub || '')}</span></div>` : '';
  const tiles = `<div class="tile ${play ? 'glowc' : ''}" style="left: 0; top: 228px; width: 165px; height: 100px; ${intro && !play ? 'box-shadow: inset 0 0 0 2px #C6FF3D;' : ''}"><div style="position: absolute; left: 62px; top: 16px; width: 40px; height: 40px"><div class="spin" style="position: absolute; inset: 0; border-radius: 50%; border: 4px solid #C6FF3D; border-top-color: transparent"></div><div style="position: absolute; inset: 13px; border-radius: 3px; background: #C6FF3D"></div></div><span class="tname">Интро с логотипом</span></div>
<div class="tile ${play ? 'glowc' : ''}" style="left: 177px; top: 228px; width: 165px; height: 100px; animation-delay: 0.06s; ${intro && !play ? 'box-shadow: inset 0 0 0 2px #C6FF3D;' : ''}"><div style="position: absolute; left: 50px; top: 18px; display: flex; gap: 6px; align-items: flex-end; height: 36px"><span class="bob" style="width: 14px; height: 36px; border-radius: 3px; background: #FF7A1A"></span><span class="bob" style="width: 14px; height: 36px; border-radius: 3px; background: #FF4FA3; animation-delay: 0.1s"></span><span class="bob" style="width: 14px; height: 36px; border-radius: 3px; background: #3D8BFF; animation-delay: 0.2s"></span><span class="bob" style="width: 14px; height: 36px; border-radius: 3px; background: #C6FF3D; animation-delay: 0.3s"></span></div><span class="tname">Кинетический текст</span></div>
<div class="tile" style="left: 0; top: 336px; width: 165px; height: 100px"><div style="position: absolute; left: 14px; right: 14px; top: 14px; height: 44px; border-radius: 8px; background: #3D8BFF; overflow: hidden"><div class="wipe" style="position: absolute; inset: 0; background: #FF7A1A"></div></div><span class="tname">Шторка-переход</span></div>
<div class="tile" style="left: 177px; top: 336px; width: 165px; height: 100px"><span class="twinkle" style="position: absolute; left: 40px; top: 20px; width: 12px; height: 12px; background: #FFB23D; transform: rotate(45deg)"></span><span class="twinkle" style="position: absolute; left: 80px; top: 34px; width: 16px; height: 16px; background: #C6FF3D; animation-delay: 0.3s"></span><span class="twinkle" style="position: absolute; left: 118px; top: 16px; width: 10px; height: 10px; background: #FF4FA3; animation-delay: 0.6s"></span><span class="tname">Финальная плашка</span></div>`;
  const flies = play ? `<div class="fly" style="position: absolute; left: 0; top: 228px; width: 165px; height: 100px; border-radius: 14px; background: #C6FF3D; --x: -51px; --y: 252px; --s: 0.38; z-index: 3"></div><div class="fly" style="position: absolute; left: 177px; top: 228px; width: 165px; height: 100px; border-radius: 14px; background: #FF4FA3; --x: -96px; --y: 222px; --s: 0.3; z-index: 3; animation-delay: 0.06s"></div>` : '';
  const ids = kept(S), L = layout(S, ids, 4), sh = intro ? 66 : 0;
  const segs = ids.map((id, i) => { const g = L.get(id), w = Math.max(6, Math.round(g.width * (W - sh) / W)), l = Math.round(g.left * (W - sh) / W); return `<div class="seg ${play ? 'sh' : ''}" style="left: ${play ? l : l + sh}px; width: ${w}px; background: ${colorOf(id)}; --x: ${sh}px; animation-delay: ${(i * 0.03).toFixed(2)}s"></div>`; }).join('');
  const marks = intro ? `<div class="seg ${play ? 'pop' : ''}" style="left: 0; width: 62px; background: repeating-linear-gradient(135deg, #C6FF3D 0 8px, #A8E02A 8px 16px); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #0B0B0F">ИНТРО</div><div class="${play ? 'pop' : ''}" style="position: absolute; left: 136px; top: 492px; height: 22px; padding: 0 8px; border-radius: 999px; background: #0B0B0F; border: 2px solid #FF4FA3; font-size: 9px; font-weight: 800; color: #FF4FA3; display: flex; align-items: center; z-index: 4; animation-delay: 0.1s">ТЕКСТ</div>` : '';
  return root(d, video(d, pvExtra) + `<span class="lbl" style="left: 0; top: 210px">ШАБЛОНЫ АНИМАЦИЙ</span>` + tiles + flies + segs + marks);
}

// 7. Субтитры: стили строками, рамка выбора переезжает к выбранному, на видео живой пример стиля на фразе ролика
const SUBS = [['karaoke', 'Караоке', 'заливка по слову', '#C6FF3D'], ['pop', 'Поп', 'слова выпрыгивают', '#FFB23D'], ['type', 'Печать', 'как на машинке_', '#F4F4F6'], ['neon', 'Неон', 'мерцает', '#FFD1EA'], ['wave', 'Волна', 'бежит по словам', '#C6FF3D'], ['off', 'Без субтитров', 'выключены', '#6A6A75']];
export function screen7(d) {
  const S = d.S, a = d.anim, play = d.play && a, cur = S.subStyle || 'karaoke';
  const idx = Math.max(0, SUBS.findIndex((x) => x[0] == cur)), from = play ? Math.max(0, SUBS.findIndex((x) => x[0] == a.before.style)) : idx;
  const ph = ((S.phr || [])[0] || {text: 'это меняет всё'}).text.split(/\s+/).slice(0, 3).join(' ').replace(/[.,!?…:;]+$/, '');
  const up = esc(ph.toUpperCase()), ws = up.split(' ');
  const ex = {
    karaoke: `<span style="position: relative"><span class="cap">${up}</span><span class="cap kara" style="position: absolute; left: 0; top: 0; color: #C6FF3D; white-space: nowrap">${up}</span></span>`,
    pop: ws.map((w, i) => `<span class="cap bnc" style="${i == 1 ? 'color: #FFB23D; ' : ''}animation-delay: ${(i * 0.1).toFixed(1)}s; margin: 0 4px">${w}</span>`).join(''),
    type: `<span class="typw" style="padding: 2px 8px; background: #0B0B0F; font-family: Inter, sans-serif; font-weight: 800; font-size: 18px; color: #FFFFFF; white-space: nowrap">${esc(ph.toLowerCase())}_</span>`,
    neon: `<span class="cap neon" style="color: #FFD1EA; text-shadow: 0 0 8px #FF4FA3, 0 0 18px #FF4FA3">${up}</span>`,
    wave: ws.map((w, i) => `<span class="cap wv2" style="color: #C6FF3D; animation-delay: ${(i * 0.1).toFixed(1)}s; margin: 0 4px">${w}</span>`).join(''),
    off: '',
  }[cur] || '';
  const cap = `<div class="live" style="position: absolute; left: 0; right: 0; bottom: 18px; height: 30px; display: flex; justify-content: center">${ex}</div>`;
  const rows = SUBS.map(([k, n, t, c], i) => `<div data-act="sub" data-arg="${k}" class="row" style="left: 0; right: 0; top: ${228 + i * 46}px; height: 40px; justify-content: space-between; background: #17171D; cursor: pointer"><b>${n}</b><span style="color: ${c}; font-weight: 700;${k == 'neon' ? ' text-shadow: 0 0 8px #FF4FA3;' : ''}">${t}</span></div>`).join('');
  const sel = `<div class="${play ? 'selmv' : ''}" style="position: absolute; left: 0; right: 0; top: ${228 + idx * 46}px; height: 40px; border-radius: 8px; border: 2px solid #C6FF3D; box-sizing: border-box; box-shadow: 0 0 20px rgba(198,255,61,0.35); --from: ${(from - idx) * 46}px; pointer-events: none"></div>`;
  return root(d, video(d, cap) + `<span class="lbl" style="left: 0; top: 210px">СТИЛЬ СУБТИТРОВ</span>` + rows + sel + plainLine(S));
}

// склейки готового ролика в пикселях линии
const cutXs = (S) => { const ids = kept(S), L = layout(S, ids); return ids.slice(1).map((id) => L.get(id).left - 2); };

// 8. Переходы: плитки, выбранный переход летит к склейкам (fly), на склейках выпрыгивают ромбы (pop), на видео пример
const TR = [['zoom', 'Зум-удар'], ['wipe', 'Шторка'], ['glitch', 'Глитч'], ['mix', 'Жидкость']];
export function screen8(d) {
  const S = d.S, a = d.anim, play = d.play && a, cur = S.trans;
  const icon = {zoom: `<div style="position: absolute; left: 14px; top: 14px; width: 26px; height: 26px; border-radius: 6px; border: 3px solid #C6FF3D; box-sizing: border-box" class="zp"></div>`,
    wipe: `<div style="position: absolute; left: 14px; top: 14px; width: 40px; height: 26px; border-radius: 6px; background: #3D8BFF; overflow: hidden"><div class="wipe" style="position: absolute; inset: 0; background: #FF7A1A"></div></div>`,
    glitch: `<div style="position: absolute; left: 14px; top: 14px; width: 40px; height: 6px; background: #FF4FA3"></div><div style="position: absolute; left: 20px; top: 24px; width: 40px; height: 6px; background: #3D8BFF"></div>`,
    mix: `<div style="position: absolute; left: 14px; top: 12px; width: 26px; height: 26px; border-radius: 50%; background: #8B6CFF"></div><div style="position: absolute; left: 32px; top: 16px; width: 22px; height: 22px; border-radius: 50%; background: #FF7A1A"></div>`};
  const tiles = TR.map(([k, n], i) => { const p = {left: i % 2 ? 177 : 0, top: i < 2 ? 230 : 310}; return `<div data-act="trans" data-arg="${k}" class="tile ${play && k == cur ? 'glowc' : ''}" style="left: ${p.left}px; top: ${p.top}px; width: 165px; height: 70px; cursor: pointer; ${!play && k == cur ? 'box-shadow: inset 0 0 0 2px #C6FF3D;' : ''}">${icon[k]}<span class="tname">${n}</span></div>`; }).join('');
  const xs = cutXs(S);
  const ti = TR.findIndex((x) => x[0] == cur), tp = {left: ti % 2 ? 177 : 0, top: ti < 2 ? 230 : 310};
  const flies = play && ti >= 0 ? xs.slice(0, 4).map((x, i) => `<div class="fly" style="position: absolute; left: ${tp.left}px; top: ${tp.top}px; width: 165px; height: 70px; border-radius: 14px; background: #C6FF3D; --x: ${Math.round(x - tp.left - 82)}px; --y: ${Math.round(530 - tp.top - 35)}px; --s: 0.2; z-index: 3; animation-delay: ${(i * 0.05).toFixed(2)}s"></div>`).join('') : '';
  const dia = cur ? xs.map((x, i) => `<div class="${play ? 'pop' : ''}" style="position: absolute; left: ${Math.round(x - 9)}px; top: 519px; width: 22px; height: 22px; z-index: 4; animation-delay: ${(i * 0.05).toFixed(2)}s"><div style="width: 22px; height: 22px; transform: rotate(45deg); background: #C6FF3D; border: 3px solid #0B0B0F; box-sizing: border-box"></div></div>`).join('') : '';
  const pvx = cur ? `<div class="live" style="position: absolute; inset: 0">${cur == 'zoom' || cur == 'mix' ? `<div class="zp" style="position: absolute; inset: 0; border: 4px solid #C6FF3D; border-radius: 20px"></div>` : ''}${cur == 'wipe' || cur == 'mix' ? `<div class="wipeIn" style="position: absolute; inset: 0; background: rgba(198,255,61,0.85)"></div>` : ''}${cur == 'glitch' || cur == 'mix' ? `<div class="gl" style="position: absolute; left: 0; right: 0; top: 50px; height: 16px; background: #3D8BFF; mix-blend-mode: screen"></div><div class="gl" style="position: absolute; left: 0; right: 0; top: 96px; height: 10px; background: #FF4FA3; mix-blend-mode: screen; animation-delay: 0.04s"></div><div class="gl" style="position: absolute; left: 0; right: 0; top: 130px; height: 20px; background: #C6FF3D; mix-blend-mode: screen; animation-delay: 0.08s"></div>` : ''}</div>` : '';
  const info = cur ? `<span class="${play ? 'pop' : ''}" style="position: absolute; left: 0; top: 400px; padding: 8px 12px; border-radius: 12px; background: #23232C; font-size: 13px; animation-delay: 0.4s">${TR[ti][1]} на ${xs.length} склейках</span>` : '';
  return root(d, video(d, pvx) + `<span class="lbl" style="left: 0; top: 210px">ПЕРЕХОДЫ</span>` + tiles + flies + info + plainLine(S) + dia);
}

// 9. Тип монтажа: рамка прыгает к выбранному типу (jump), старая линия гаснет (fade), новая нарезка выпадает (chop), на видео удар и вспышка
const ET = [['adhd', 'СДВГ монтаж', 'склейка каждые 0.4 с'], ['cinema', 'Кино', 'длинные планы, плавно'], ['vlog', 'Влог', 'живой ритм, джамп-каты'], ['podcast', 'Подкаст', 'камера на говорящего'], ['ad', 'Реклама', 'удар в бит, крупно'], ['calm', 'Спокойный', 'медитативно, без спешки']];
export function screen9(d) {
  const S = d.S, a = d.anim, play = d.play && a, cur = S.etype;
  const tiles = ET.map(([k, n, t], i) => `<div data-act="etype" data-arg="${k}" class="tile" style="left: ${i % 2 ? 177 : 0}px; top: ${228 + Math.floor(i / 2) * 62}px; width: 165px; height: 54px; cursor: pointer"><b style="position: absolute; left: 12px; top: 10px; font-size: 13px;${k == cur ? ' color: #C6FF3D;' : ''}">${n}</b><span style="position: absolute; left: 12px; top: 30px; font-size: 10px; color: #A1A1AA">${t}</span></div>`).join('');
  const i = ET.findIndex((x) => x[0] == cur), fi = play ? ET.findIndex((x) => x[0] == a.before.etype) : i;
  const pos = (k) => ({left: k % 2 ? 177 : 0, top: 228 + Math.floor(k / 2) * 62});
  const frame = i >= 0 ? `<div class="${play ? 'jmp' : ''}" style="position: absolute; left: ${pos(i).left}px; top: ${pos(i).top}px; width: 165px; height: 54px; border-radius: 14px; border: 2px solid #C6FF3D; box-sizing: border-box; --fx: ${fi >= 0 ? pos(fi).left - pos(i).left : 0}px; --fy: ${fi >= 0 ? pos(fi).top - pos(i).top : -30}px; pointer-events: none"></div>` : '';
  const ids = kept(S), L = layout(S, ids), n = cur ? (play ? (a.after.cuts || []).length + 1 : ids.length) : 0;
  const old = play ? ids.map((id) => { const g = L.get(id); return `<div class="seg fade" style="left: ${g.left}px; width: ${g.width}px; background: ${colorOf(id)}"></div>`; }).join('') : '';
  const chops = ids.map((id, k) => { const g = L.get(id); return `<div class="seg ${play ? 'chop' : ''}" style="left: ${g.left}px; width: ${g.width}px; background: ${colorOf(id)}; animation-delay: ${(k * 0.03).toFixed(2)}s"></div>`; }).join('');
  const tempo = cur ? (ids.length / Math.max(1, d.R ? d.R.outDur : 1)).toFixed(1) : null;
  const pvx = cur ? `${play ? '<div class="flash" style="position: absolute; inset: 0; background: #FFFFFF; opacity: 0; animation-delay: 1.6s"></div>' : ''}<span class="${play ? 'pop' : ''}" style="position: absolute; left: 12px; bottom: 12px; padding: 6px 10px; border-radius: 999px; background: #0B0B0F; border: 2px solid #C6FF3D; font-size: 11px; font-weight: 800; color: #C6FF3D; animation-delay: 0.4s">ТЕМП ${tempo} склейки/с</span>` : '';
  const pvInner = play ? `<div class="punch" style="position: absolute; inset: 0; animation-delay: 1.6s">${d.pv}</div>` : d.pv;
  const info = cur ? `<span class="${play ? 'pop' : ''}" style="position: absolute; left: 0; top: 420px; padding: 8px 12px; border-radius: 12px; background: #23232C; font-size: 13px; animation-delay: 0.5s">${fmtS(d, d.R ? d.R.outDur : 0)} в ${ids.length} склеек · ${ET[i][1]}</span>` : '';
  return root(d, video(d, pvx, pvInner) + `<span class="lbl" style="left: 0; top: 210px">ТИП МОНТАЖА</span>` + tiles + frame + info + old + chops);
}

export const SCREENS_REAL = [screen0, screen1, screen2, screen3, screen4, screen5, screen6, screen7, screen8, screen9];
