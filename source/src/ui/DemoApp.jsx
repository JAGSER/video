// Интерфейс Video = демо «Просмотр: 10 функций» один в один (разметка и анимации из demoMarkup.js и demo.css).
// Здесь только данные (фразы, кадр из ролика) и обработчики. Экран перерисовывается только при смене данных,
// а не на каждом кадре видео: поэтому ничего не дёргается.
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Player} from '@remotion/player';
import {Montage} from '../Montage.jsx';
import {LAYOUT, CHIP, SCREENS} from './demoMarkup.js';
import './demo.css';

const M = [
  {label: 'Перестановка', title: 'Перестановка фраз', badge: '0.4 с · 4 переноса', cmd: '«Последнюю фразу в начало»'},
  {label: 'Лучшие дубли', title: 'Лучшие дубли', badge: '0.5 с · 5 дублей', cmd: '«Оставь лучшие дубли»'},
  {label: 'Сократить', title: 'Сократи до 15 с', badge: '0.5 с · −27 с', cmd: '«Сократи до 15 секунд»'},
  {label: 'На 3 ролика', title: 'Разбей на 3 ролика', badge: '0.6 с · 3 ролика', cmd: '«Разбей на три ролика»'},
  {label: 'Нарезка на сцены', title: 'Нарезка на сцены', badge: '0.3 с · 6 сцен', cmd: '«Нарежь на сцены»'},
  {label: 'Скачать сцены', title: 'Скачать сцены', badge: '0.8 с · 3 файла', cmd: '«Скачай сцены 2, 3 и 5»'},
  {label: 'Сцены-анимации', title: 'Сцены-анимации', badge: '0.4 с · 2 анимации', cmd: '«Добавь интро и текст»'},
  {label: 'Субтитры', title: 'Анимации субтитров', badge: '5 стилей · live', cmd: '«Покажи стили субтитров»'},
  {label: 'Переходы', title: 'Переходы', badge: '0.3 с · 3 перехода', cmd: '«Поставь переходы»'},
  {label: 'Тип монтажа', title: 'Тип монтажа: СДВГ', badge: '0.4 с · 16 склеек', cmd: '«Сделай СДВГ монтаж»'},
];
// тексты демо, пока не загружено своё видео
const DEMO_P = {
  0: ['Привет, я Юрий.', 'Сегодня про монтаж.', 'Это займёт минуту.', 'Подпишись, чтобы не пропустить!'],
  2: ['Привет, это обзор новой камеры.', 'Я долго её ждал, наверное месяц.', 'Главное: она снимает 4K в темноте.', 'Кстати, коробка тоже красивая.', 'Ну и цвет мне нравится, синий.', 'Ссылка в описании.'],
  3: ['Три ошибки новичка в съёмке.', 'Первая: снимать против света.', 'Вторая: дрожащие руки.', 'Решение: упор локтями в корпус.', 'Третья: забыть про звук.', 'Петличка за 500 рублей спасает.'],
};
const MOCK = '<div class="hd"></div><div class="bd"></div>';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);
const LSget = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };

// кадр из ролика для карточки видео: 684×380, по центру лица
async function grabThumb(src, faces) {
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = src;
  await new Promise((r) => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 4000); });
  if (!v.videoWidth) return null;
  await new Promise((r) => { v.onseeked = r; v.currentTime = Math.min(1, (v.duration || 2) / 2); setTimeout(r, 2500); });
  const W = 684, H = 380, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const sc = Math.max(W / v.videoWidth, H / v.videoHeight) * 1.0;
  const f = (faces || [])[0];
  // лицо в координатах 1080×1920 → кадр видео
  const fy = f ? (f.y + f.h * 0.45) / 1920 * v.videoHeight : v.videoHeight * 0.35;
  const dw = v.videoWidth * sc, dh = v.videoHeight * sc;
  const oy = Math.max(H - dh, Math.min(0, H * 0.42 - fy * sc));
  g.drawImage(v, (W - dw) / 2, oy, dw, dh);
  v.removeAttribute('src'); v.load();
  return c.toDataURL('image/jpeg', 0.8);
}

export default function DemoApp({ctx}) {
  const {S} = ctx;
  const [mode, setMode] = useState(0);
  const [dir, setDir] = useState('40px');
  const [liked, setLiked] = useState(() => LSget('ai_montage_liked', {}) || {});
  const [only, setOnly] = useState(false);
  const [thumb, setThumb] = useState(null);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [scale, setScale] = useState(1);
  const rootRef = useRef(null), sx = useRef(null), inputRef = useRef(null);

  useEffect(() => { const f = () => setScale(Math.min(window.innerWidth / 390, window.innerHeight / 844)); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  useEffect(() => { setThumb(null); if (!S.src) return; let ok = true; grabThumb(S.src, S.faces).then((u) => { if (ok && u) setThumb(u); }); return () => { ok = false; }; }, [S.src, S.faces && S.faces.length]);

  const list = useMemo(() => { const all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; if (only) { const l = all.filter((i) => liked[i]); if (l.length) return l; } return all; }, [only, liked]);
  const cur = list.indexOf(mode) < 0 ? list[0] : mode;
  const go = (step) => { let p = list.indexOf(cur); p = (p + step + list.length) % list.length; setDir(step > 0 ? '40px' : '-40px'); setMode(list[p]); };

  // фразы ролика (тексты строк); для экрана «Перестановка» последняя фраза идёт четвёртой (её и переносит анимация)
  const texts = useMemo(() => (ctx.phrases || []).map((p) => p.map((w) => w.w).join(' ')).filter(Boolean), [ctx.phrases]);
  const pFor = (i) => {
    const d = DEMO_P[i]; if (!d) return [];
    if (!texts.length) return d.map(esc);
    const n = d.length, src = i == 0 && texts.length > 3 ? [texts[0], texts[1], texts[2], texts[texts.length - 1]] : texts;
    return Array.from({length: n}, (_, k) => esc(cut(src[k % src.length], i == 0 ? 34 : 38)));
  };

  const html = useMemo(() => {
    const only2 = only && list.length < 10, nLiked = Object.keys(liked).filter((k) => liked[k]).length, isLiked = !!liked[cur];
    const pv = (thumb ? `<img src="${thumb}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block">` : MOCK) +
      (S.src ? '' : '<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:9px 14px;border-radius:999px;background:#C6FF3D;color:#0B0B0F;font-size:13px;font-weight:800;white-space:nowrap;z-index:2">＋ Своё видео</span>');
    const chips = (only2 ? list : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).map((i) => CHIP({i, label: M[i].label, liked: !!liked[i], bg: i === cur ? '#C6FF3D' : '#17171D', fg: i === cur ? '#0B0B0F' : (liked[i] ? '#C6FF3D' : '#F4F4F6')}, {})).join('');
    const cmd = (ctx.rec || ctx.cmd) ? `<span style="font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${esc(ctx.cmd || '…')}</span>` : `<span class="cmd" style="font-size: 15px; font-weight: 500; white-space: nowrap">${M[cur].cmd}</span>`;
    const v = {
      say: ctx.busy ? esc(ctx.busy.t) : 'Вы говорите', sayColor: ctx.busy ? '#C6FF3D' : '#A1A1AA', pos: list.indexOf(cur) + 1, total: list.length, title: M[cur].title, chips, cmd,
      onlyLabel: only2 ? 'Все варианты' : 'Мои: ' + nLiked, onlyBg: only2 ? '#C6FF3D' : 'transparent', onlyFg: only2 ? '#0B0B0F' : '#F4F4F6', onlyBorder: only2 ? '#C6FF3D' : '#3A3A46',
      likeLabel: isLiked ? 'В отмеченных' : 'Отметить', likeBg: isLiked ? '#C6FF3D' : 'transparent', likeFg: isLiked ? '#0B0B0F' : '#C6FF3D', likeFill: isLiked ? '#0B0B0F' : 'none',
    };
    v.screen = SCREENS[cur]({edir: dir, pv, badge: M[cur].badge, p: pFor(cur)});
    return LAYOUT(v);
  }, [cur, dir, only, liked, list, thumb, texts, S.src, ctx.rec, ctx.cmd, ctx.busy && ctx.busy.t]);

  // прокрутка ленты чипов к выбранному, как в демо
  useEffect(() => {
    const r = rootRef.current && rootRef.current.querySelector('#rowRef'); if (!r) return;
    const idx = only && list.length < 10 ? list.indexOf(cur) : cur, b = r.children[idx];
    if (b && r.scrollTo) r.scrollTo({left: Math.max(0, b.offsetLeft - 24), behavior: 'smooth'});
  }, [cur]);

  const onClick = (e) => {
    const t = e.target.closest('[data-pick],[data-click],.pv');
    if (!t) return;
    if (t.dataset.pick != null) { const i = +t.dataset.pick; setDir(i > cur ? '40px' : '-40px'); setMode(i); return; }
    const a = t.dataset.click;
    if (a == 'prev') return go(-1);
    if (a == 'next') return go(1);
    if (a == 'toggleLike') { const nl = {...liked}; if (nl[cur]) delete nl[cur]; else nl[cur] = true; try { localStorage.setItem('ai_montage_liked', JSON.stringify(nl)); } catch (er) {} setLiked(nl); setMode(cur); return; }
    if (a == 'toggleOnly') { if (Object.keys(liked).length || only) setOnly(!only); return; }
    if (a == 'mic') { e.stopPropagation(); return ctx.mic(); }
    if (a == 'voice') { setTyping(true); setTimeout(() => inputRef.current && inputRef.current.focus(), 50); return; }
    if (t.classList.contains('pv')) { if (!S.src) ctx.fileRef.current && ctx.fileRef.current.click(); else setOpen(true); }
  };
  const swStart = (e) => { if (!e.target.closest('[data-touchstart],[data-mousedown]')) return; const p = e.touches ? e.touches[0] : e; sx.current = p.clientX; };
  const swEnd = (e) => { if (sx.current == null) return; const p = e.changedTouches ? e.changedTouches[0] : e; const d = p.clientX - sx.current; sx.current = null; if (Math.abs(d) > 40) go(d < 0 ? 1 : -1); };

  return <div style={{position: 'fixed', inset: 0, background: '#0B0B0F', overflow: 'hidden'}}>
    <div ref={rootRef} style={{position: 'absolute', left: '50%', top: 0, width: 390, height: 844, marginLeft: -195, transform: `scale(${scale})`, transformOrigin: 'top center'}}
      onClick={onClick} onTouchStart={swStart} onTouchEnd={swEnd} onMouseDown={swStart} onMouseUp={swEnd}
      dangerouslySetInnerHTML={{__html: html}}/>
    <input ref={ctx.fileRef} type="file" accept="video/*" style={{position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none'}} onChange={ctx.onFile}/>
    {ctx.toastS && ctx.toastS.on ? <div className="enter" style={{position: 'fixed', left: '50%', bottom: 96, transform: 'translateX(-50%)', zIndex: 30, padding: '10px 16px', borderRadius: 16, background: ctx.toastS.ai ? '#C6FF3D' : '#fff', color: '#0B0B0F', font: '800 13px Inter,system-ui,sans-serif', maxWidth: '90%', textAlign: 'center'}}>{ctx.toastS.t}</div> : null}
    {typing ? <div style={{position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 25, padding: 12, background: '#17171D', display: 'flex', gap: 8}}>
      <input ref={inputRef} value={ctx.cmd} onChange={(e) => ctx.setCmd(e.target.value)} onKeyDown={(e) => { if (e.key == 'Enter') { ctx.run(ctx.cmd); setTyping(false); } if (e.key == 'Escape') setTyping(false); }} onBlur={() => setTimeout(() => setTyping(false), 150)} placeholder="Скажи или напиши правку…" style={{flex: 1, height: 44, borderRadius: 22, border: '1px solid #3A3A46', background: '#0B0B0F', color: '#fff', padding: '0 16px', font: '600 15px Inter,system-ui,sans-serif', outline: 'none'}}/>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => { ctx.run(ctx.cmd); setTyping(false); }} style={{width: 44, height: 44, borderRadius: 22, border: 0, background: '#C6FF3D', color: '#0B0B0F', fontSize: 18, fontWeight: 900}}>➜</button>
    </div> : null}
    {open && S.src ? <div style={{position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12}}>
      <div style={{height: 'calc(100% - 70px)', aspectRatio: '9/16', maxWidth: '100%', borderRadius: 18, overflow: 'hidden', background: '#000'}}>
        <Player ref={ctx.player} component={Montage} inputProps={ctx.inputProps} durationInFrames={ctx.durF} fps={ctx.FPS} compositionWidth={1080} compositionHeight={1920} style={{width: '100%', height: '100%'}} controls acknowledgeRemotionLicense/>
      </div>
      <div style={{display: 'flex', gap: 10}}>
        <button onClick={() => setOpen(false)} style={{height: 44, padding: '0 18px', borderRadius: 14, border: 0, background: '#23232C', color: '#fff', font: '800 14px Inter,system-ui,sans-serif'}}>Закрыть</button>
        <button onClick={() => ctx.exportMp4()} style={{height: 44, padding: '0 18px', borderRadius: 14, border: 0, background: '#C6FF3D', color: '#0B0B0F', font: '800 14px Inter,system-ui,sans-serif'}}>Скачать MP4</button>
      </div>
    </div> : null}
  </div>;
}
