// Разметка перенесена из демо «Просмотр: 10 функций» дословно (скриптом). Меняются только данные v.*
export const LAYOUT = (v) => `<div style="width: 390px; height: 844px; box-sizing: border-box; background: #0B0B0F; color: #F4F4F6; font-family: Inter, system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden">
<div style="padding: 22px 24px 10px; display: flex; flex-direction: column; gap: 4px; flex: none">
<div style="display: flex; justify-content: space-between; align-items: center">
<span style="font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: #C6FF3D">ВАРИАНТ ${v.pos} ИЗ ${v.total}</span>
<button data-click="toggleOnly" style="height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid ${v.onlyBorder}; background: ${v.onlyBg}; color: ${v.onlyFg}; font-family: Inter, sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"></path></svg>${v.onlyLabel}</button>
</div>
<h1 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 800; font-size: 22px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${v.title}</h1>
</div>
<div class="chips" id="rowRef" style="display: flex; gap: 8px; overflow-x: auto; padding: 0 24px; height: 40px; margin-bottom: 12px; flex: none; align-items: center">
${v.chips}
</div>
<div data-touchstart="swStart" data-touchend="swEnd" data-mousedown="swStart" data-mouseup="swEnd" style="position: relative; flex: none; height: 562px; margin: 0 24px; touch-action: pan-y; user-select: none">
<span class="lbl" style="left: 0; top: 484px">ОДНА ЛИНИЯ ВИДЕО</span>
<span class="lbl" style="right: 0; top: 484px">0:00 / 0:48</span>
<div style="position: absolute; left: 0; right: 0; top: 504px; height: 52px; border-radius: 10px; background: #141419"></div>

${v.screen}<div class="ph" style="position: absolute; left: 0; top: 496px; width: 2px; height: 68px; background: #FFFFFF; z-index: 6"></div>
</div>
<div style="display: flex; gap: 10px; margin: 8px 24px 10px; height: 48px; flex: none">
<button aria-label="Предыдущий вариант" data-click="prev" style="width: 56px; height: 48px; border-radius: 14px; border: 0; background: #17171D; display: flex; align-items: center; justify-content: center; cursor: pointer"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F4F4F6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg></button>
<button data-click="toggleLike" style="flex: 1; height: 48px; border-radius: 14px; border: 2px solid #C6FF3D; background: ${v.likeBg}; color: ${v.likeFg}; font-family: Inter, sans-serif; font-size: 15px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer"><svg width="20" height="20" viewBox="0 0 24 24" fill="${v.likeFill}" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"></path></svg>${v.likeLabel}</button>
<button aria-label="Следующий вариант" data-click="next" style="width: 56px; height: 48px; border-radius: 14px; border: 0; background: #17171D; display: flex; align-items: center; justify-content: center; cursor: pointer"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F4F4F6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg></button>
</div>
<div data-click="voice" style="margin: 0 20px; height: 68px; border-radius: 34px; background: #17171D; display: flex; align-items: center; gap: 14px; padding: 0 10px 0 22px; flex: none">
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
<span style="font-size: 11px; color: ${v.sayColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${v.say}</span>
${v.cmd}</div>
<div aria-hidden="true" style="display: flex; gap: 3px; align-items: center; height: 28px">
<span class="wv" style="width: 3px; height: 28px; border-radius: 2px; background: #C6FF3D; animation-delay: 0s"></span>
<span class="wv" style="width: 3px; height: 28px; border-radius: 2px; background: #C6FF3D; animation-delay: 0.12s"></span>
<span class="wv" style="width: 3px; height: 28px; border-radius: 2px; background: #C6FF3D; animation-delay: 0.24s"></span>
<span class="wv" style="width: 3px; height: 28px; border-radius: 2px; background: #C6FF3D; animation-delay: 0.08s"></span>
<span class="wv" style="width: 3px; height: 28px; border-radius: 2px; background: #C6FF3D; animation-delay: 0.2s"></span>
</div>
<button aria-label="Микрофон" data-click="mic" style="position: relative; width: 48px; height: 48px; border-radius: 50%; border: 0; padding: 0; background: #C6FF3D; display: flex; align-items: center; justify-content: center; cursor: pointer">
<span class="ring" style="position: absolute; inset: 0; border-radius: 50%; border: 2px solid #C6FF3D"></span>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B0B0F" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path></svg>
</button>
</div>
</div>
`;
export const CHIP = (c, v) => `
<button data-pick="${c.i}" style="flex: none; height: 36px; padding: 0 14px; border-radius: 999px; border: 0; font-family: Inter, sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 6px; background: ${c.bg}; color: ${c.fg}">${c.liked ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"></path></svg>` : ''}${c.label}</button>
`;
export const SCREENS = [
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">${v.pv}<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<div class="card" style="top: 206px; height: 236px"></div>
<span class="lbl" style="left: 14px; top: 220px">РАСШИФРОВКА</span>
<div class="row sh" style="top: 244px; height: 38px; --y: 46px"><span class="tk" style="background: #FF7A1A"></span>${v.p[0]}</div>
<div class="row sh" style="top: 290px; height: 38px; --y: 46px; animation-delay: 0.04s"><span class="tk" style="background: #3D8BFF"></span>${v.p[1]}</div>
<div class="row sh" style="top: 336px; height: 38px; --y: 46px; animation-delay: 0.08s"><span class="tk" style="background: #8B6CFF"></span>${v.p[2]}</div>
<div class="row hop" style="top: 382px; height: 38px; --ax: -24px; --ay: -69px; --x: 0px; --y: -138px; z-index: 2"><span class="tk" style="background: #FF4FA3"></span>${v.p[3]}</div>
<div class="seg sh" style="left: 0; width: 82px; background: #FF7A1A; --x: 86px"></div>
<div class="seg sh" style="left: 86px; width: 82px; background: #3D8BFF; --x: 86px; animation-delay: 0.04s"></div>
<div class="seg sh" style="left: 172px; width: 82px; background: #8B6CFF; --x: 86px; animation-delay: 0.08s"></div>
<div class="seg hop" style="left: 258px; width: 82px; background: #FF4FA3; --ax: -129px; --ay: -34px; --x: -258px; --y: 0px; z-index: 2"></div>
</div>
`,
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">${v.pv}<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<div class="card" style="top: 206px; height: 244px"></div>
<span class="lbl" style="left: 14px; top: 218px">ДУБЛИ · ИИ ОЦЕНИВАЕТ</span>
<div class="row out" style="top: 240px; height: 34px; justify-content: space-between"><span>Фраза 1 · дубль 1</span><b>62%</b></div>
<div class="row hop" style="top: 280px; height: 34px; justify-content: space-between; --ay: -20px; --y: -40px; z-index: 2"><span>Фраза 1 · дубль 2</span><span class="pop" style="padding: 3px 8px; border-radius: 999px; background: #C6FF3D; color: #0B0B0F; font-size: 10px; font-weight: 800">ЛУЧШИЙ 94%</span></div>
<div class="row out" style="top: 320px; height: 34px; justify-content: space-between; animation-delay: 0.05s"><span>Фраза 1 · дубль 3</span><b>71%</b></div>
<div class="row hop" style="top: 360px; height: 34px; justify-content: space-between; --ay: -40px; --y: -80px; z-index: 2"><span>Фраза 2 · дубль 1</span><span class="pop" style="padding: 3px 8px; border-radius: 999px; background: #C6FF3D; color: #0B0B0F; font-size: 10px; font-weight: 800; animation-delay: 0.06s">ЛУЧШИЙ 88%</span></div>
<div class="row out" style="top: 400px; height: 34px; justify-content: space-between; animation-delay: 0.1s"><span>Фраза 2 · дубль 2</span><b>55%</b></div>
<div style="position: absolute; left: 0; top: 504px; height: 52px; display: flex; gap: 4px">
<div class="col" style="--w: 60px; width: 60px; border-radius: 8px; background: #3D8BFF"></div>
<div class="lit" style="width: 70px; border-radius: 8px; background: #3D8BFF"></div>
<div class="col" style="--w: 56px; width: 56px; border-radius: 8px; background: #3D8BFF; animation-delay: 0.05s"></div>
<div class="lit" style="width: 74px; border-radius: 8px; background: #3D8BFF"></div>
<div class="col" style="--w: 60px; width: 60px; border-radius: 8px; background: #3D8BFF; animation-delay: 0.1s"></div>
</div>
</div>
`,
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">${v.pv}
<div style="position: absolute; right: 18px; top: 60px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px"><span style="font-size: 11px; font-weight: 700; color: #A1A1AA">ДЛИНА</span><div style="height: 48px; overflow: hidden"><div class="roll" style="display: flex; flex-direction: column; font-family: Unbounded, sans-serif; font-weight: 800; font-size: 34px; line-height: 48px; text-align: right"><span>0:42</span><span>0:35</span><span>0:28</span><span>0:21</span><span class="hit">0:15</span></div></div></div>
<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<div style="position: absolute; left: 0; right: 0; top: 206px; padding: 14px; border-radius: 16px; background: #17171D; display: flex; flex-direction: column">
<span style="font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #A1A1AA; margin-bottom: 10px">РАСШИФРОВКА</span>
<div style="padding: 7px 10px; border-radius: 8px; background: #23232C; font-size: 13px; line-height: 16px; margin-bottom: 6px">${v.p[0]}</div>
<div class="cut" style="padding: 7px 10px; border-radius: 8px; background: #23232C; font-size: 13px; line-height: 16px; margin-bottom: 6px">${v.p[1]}</div>
<div style="padding: 7px 10px; border-radius: 8px; background: #23232C; font-size: 13px; line-height: 16px; margin-bottom: 6px">${v.p[2]}</div>
<div class="cut" style="padding: 7px 10px; border-radius: 8px; background: #23232C; font-size: 13px; line-height: 16px; margin-bottom: 6px; animation-delay: 0.06s">${v.p[3]}</div>
<div class="cut" style="padding: 7px 10px; border-radius: 8px; background: #23232C; font-size: 13px; line-height: 16px; margin-bottom: 6px; animation-delay: 0.12s">${v.p[4]}</div>
<div style="padding: 7px 10px; border-radius: 8px; background: #23232C; font-size: 13px; line-height: 16px">${v.p[5]}</div>
</div>
<div style="position: absolute; left: 0; top: 504px; height: 52px; display: flex; gap: 4px">
<div style="width: 50px; flex: none; border-radius: 8px; background: #3D8BFF"></div>
<div class="col" style="--w: 64px; width: 64px; border-radius: 8px; background: #5A5A6A"></div>
<div style="width: 60px; flex: none; border-radius: 8px; background: #3D8BFF"></div>
<div class="col" style="--w: 56px; width: 56px; border-radius: 8px; background: #5A5A6A; animation-delay: 0.06s"></div>
<div class="col" style="--w: 58px; width: 58px; border-radius: 8px; background: #5A5A6A; animation-delay: 0.12s"></div>
<div style="width: 34px; flex: none; border-radius: 8px; background: #3D8BFF"></div>
</div>
</div>
`,
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">${v.pv}<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<div class="card" style="top: 206px; height: 214px"></div>
<span class="lbl" style="left: 14px; top: 218px">РАСШИФРОВКА · 0:48</span>
<div class="row tint" style="top: 240px; height: 24px; font-size: 12px; --c: rgba(255,122,26,0.3)">${v.p[0]}</div>
<div class="row tint" style="top: 268px; height: 24px; font-size: 12px; --c: rgba(255,122,26,0.3)">${v.p[1]}</div>
<div class="row tint" style="top: 296px; height: 24px; font-size: 12px; --c: rgba(139,108,255,0.32); animation-delay: 0.05s">${v.p[2]}</div>
<div class="row tint" style="top: 324px; height: 24px; font-size: 12px; --c: rgba(139,108,255,0.32); animation-delay: 0.05s">${v.p[3]}</div>
<div class="row tint" style="top: 352px; height: 24px; font-size: 12px; --c: rgba(255,79,163,0.3); animation-delay: 0.1s">${v.p[4]}</div>
<div class="row tint" style="top: 380px; height: 24px; font-size: 12px; --c: rgba(255,79,163,0.3); animation-delay: 0.1s">${v.p[5]}</div>
<div class="fly" style="position: absolute; left: 14px; right: 14px; top: 240px; height: 52px; border-radius: 8px; background: #FF7A1A; --x: -115px; --y: 264px; --s: 0.33; z-index: 3"></div>
<div class="fly" style="position: absolute; left: 14px; right: 14px; top: 296px; height: 52px; border-radius: 8px; background: #8B6CFF; --x: 1px; --y: 208px; --s: 0.33; z-index: 3; animation-delay: 0.05s"></div>
<div class="fly" style="position: absolute; left: 14px; right: 14px; top: 352px; height: 52px; border-radius: 8px; background: #FF4FA3; --x: 116px; --y: 152px; --s: 0.33; z-index: 3; animation-delay: 0.1s"></div>
<span class="pop lbl" style="left: 0; top: 440px; color: #C6FF3D; animation-delay: 0.3s">3 ГОТОВЫХ REELS</span>
<div class="sh" style="position: absolute; left: 0; top: 504px; width: 112px; height: 52px; --x: -2px"><div class="tint" style="width: 100%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center; --b: #3D8BFF; --c: #FF7A1A; animation-delay: 0.8s"><span class="pop" style="font-size: 11px; font-weight: 800; color: #0B0B0F; animation-delay: 0.3s">REELS 1 · 0:16</span></div></div>
<div style="position: absolute; left: 116px; top: 504px; width: 112px; height: 52px"><div class="tint" style="width: 100%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center; --b: #3D8BFF; --c: #8B6CFF; animation-delay: 0.85s"><span class="pop" style="font-size: 11px; font-weight: 800; color: #0B0B0F; animation-delay: 0.35s">REELS 2 · 0:15</span></div></div>
<div class="sh" style="position: absolute; left: 232px; top: 504px; width: 110px; height: 52px; --x: 2px"><div class="tint" style="width: 100%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center; --b: #3D8BFF; --c: #FF4FA3; animation-delay: 0.9s"><span class="pop" style="font-size: 11px; font-weight: 800; color: #0B0B0F; animation-delay: 0.4s">REELS 3 · 0:17</span></div></div>
</div>
`,
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">${v.pv}<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<span class="lbl" style="left: 0; top: 210px">СЦЕНЫ</span>
<div class="scard from" style="left: 0; top: 232px; background: #FF7A1A; --fx: -22px; --fy: 267px"><b>Сцена 1</b><span>0:00 - 0:07</span></div>
<div class="scard from" style="left: 119px; top: 232px; background: #3D8BFF; --fx: -87px; --fy: 267px; animation-delay: 0.06s"><b>Сцена 2</b><span>0:07 - 0:12</span></div>
<div class="scard from" style="left: 238px; top: 232px; background: #8B6CFF; --fx: -149px; --fy: 267px; animation-delay: 0.12s"><b>Сцена 3</b><span>0:12 - 0:20</span></div>
<div class="scard from" style="left: 0; top: 308px; background: #FF4FA3; --fx: 148px; --fy: 191px; animation-delay: 0.18s"><b>Сцена 4</b><span>0:20 - 0:26</span></div>
<div class="scard from" style="left: 119px; top: 308px; background: #C6FF3D; --fx: 86px; --fy: 191px; animation-delay: 0.24s"><b>Сцена 5</b><span>0:26 - 0:33</span></div>
<div class="scard from" style="left: 238px; top: 308px; background: #FFB23D; --fx: 25px; --fy: 191px; animation-delay: 0.3s"><b>Сцена 6</b><span>0:33 - 0:48</span></div>
<span class="pop" style="position: absolute; left: 0; top: 392px; padding: 8px 12px; border-radius: 12px; background: #23232C; font-size: 13px; animation-delay: 0.5s">Найдено 6 сцен по смене кадра и звука</span>
<div class="seg tint" style="left: 0; width: 60px; --b: #4A4A58; --c: #FF7A1A"></div>
<div class="seg tint" style="left: 60px; width: 48px; --b: #4A4A58; --c: #3D8BFF; animation-delay: 0.12s"></div>
<div class="seg tint" style="left: 108px; width: 66px; --b: #4A4A58; --c: #8B6CFF; animation-delay: 0.29s"></div>
<div class="seg tint" style="left: 174px; width: 52px; --b: #4A4A58; --c: #FF4FA3; animation-delay: 0.42s"></div>
<div class="seg tint" style="left: 226px; width: 62px; --b: #4A4A58; --c: #C6FF3D; animation-delay: 0.58s"></div>
<div class="seg tint" style="left: 288px; width: 54px; --b: #4A4A58; --c: #FFB23D; animation-delay: 0.7s"></div>
<div class="mark" style="position: absolute; left: 59px; top: 498px; width: 3px; height: 64px"></div>
<div class="mark" style="position: absolute; left: 107px; top: 498px; width: 3px; height: 64px; animation-delay: 0.12s"></div>
<div class="mark" style="position: absolute; left: 173px; top: 498px; width: 3px; height: 64px; animation-delay: 0.29s"></div>
<div class="mark" style="position: absolute; left: 225px; top: 498px; width: 3px; height: 64px; animation-delay: 0.42s"></div>
<div class="mark" style="position: absolute; left: 287px; top: 498px; width: 3px; height: 64px; animation-delay: 0.58s"></div>
<div class="scan" style="position: absolute; left: 0; top: 494px; width: 3px; height: 72px; background: #C6FF3D; box-shadow: 0 0 18px 5px rgba(198,255,61,0.55)"></div>
</div>
`,
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">${v.pv}<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<span class="lbl" style="left: 0; top: 210px">ОТМЕТЬТЕ СЦЕНЫ</span>
<div class="scard" style="left: 0; top: 232px; background: #FF7A1A"><b>Сцена 1</b><span>0:07</span></div>
<div class="scard glowc" style="left: 119px; top: 232px; background: #3D8BFF"><b>Сцена 2</b><span>0:05</span><span class="tick" style="position: absolute; right: 8px; top: 8px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #0B0B0F; box-sizing: border-box; display: flex; align-items: center; justify-content: center"><svg class="on" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B0B0F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg></span></div>
<div class="scard glowc" style="left: 238px; top: 232px; background: #8B6CFF; animation-delay: 0.15s"><b>Сцена 3</b><span>0:08</span><span class="tick" style="position: absolute; right: 8px; top: 8px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #0B0B0F; box-sizing: border-box; display: flex; align-items: center; justify-content: center; animation-delay: 0.15s"><svg class="on" style="animation-delay: 0.15s" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B0B0F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg></span></div>
<div class="scard" style="left: 0; top: 308px; background: #FF4FA3"><b>Сцена 4</b><span>0:06</span></div>
<div class="scard glowc" style="left: 119px; top: 308px; background: #C6FF3D; animation-delay: 0.3s"><b>Сцена 5</b><span>0:07</span><span class="tick" style="position: absolute; right: 8px; top: 8px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #0B0B0F; box-sizing: border-box; display: flex; align-items: center; justify-content: center; animation-delay: 0.3s"><svg class="on" style="animation-delay: 0.3s" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B0B0F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg></span></div>
<div class="scard" style="left: 238px; top: 308px; background: #FFB23D"><b>Сцена 6</b><span>0:15</span></div>
<div class="fly" style="position: absolute; left: 119px; top: 232px; width: 104px; height: 62px; border-radius: 10px; background: #3D8BFF; --x: 0px; --y: 158px; --s: 0.2; z-index: 3; animation-delay: 0.7s"></div>
<div class="fly" style="position: absolute; left: 238px; top: 232px; width: 104px; height: 62px; border-radius: 10px; background: #8B6CFF; --x: -119px; --y: 158px; --s: 0.2; z-index: 3; animation-delay: 0.76s"></div>
<div class="fly" style="position: absolute; left: 119px; top: 308px; width: 104px; height: 62px; border-radius: 10px; background: #C6FF3D; --x: 0px; --y: 82px; --s: 0.2; z-index: 3; animation-delay: 0.82s"></div>
<div style="position: absolute; left: 0; right: 0; top: 396px; height: 52px; border-radius: 14px; background: #23232C; overflow: hidden">
<div class="fill" style="position: absolute; inset: 0; background: #C6FF3D"></div>
<span class="swapA" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 15px; font-weight: 700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4F4F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path></svg>Скачать 3 сцены</span>
<span class="swapB" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: #0B0B0F">Готово · 3 файла MP4</span>
</div>
<div class="seg" style="left: 0; width: 60px; background: #FF7A1A"></div>
<div class="seg lit" style="left: 62px; width: 46px; background: #3D8BFF"></div>
<div class="seg lit" style="left: 110px; width: 64px; background: #8B6CFF; animation-delay: 0.15s"></div>
<div class="seg" style="left: 176px; width: 50px; background: #FF4FA3"></div>
<div class="seg lit" style="left: 228px; width: 58px; background: #C6FF3D; animation-delay: 0.3s"></div>
<div class="seg" style="left: 288px; width: 54px; background: #FFB23D"></div>
</div>
`,
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">${v.pv}
<div class="pop" style="position: absolute; inset: 0; background: #0E1E12; display: flex; align-items: center; justify-content: center; animation-delay: 0.1s"><div style="position: relative; width: 80px; height: 80px"><div class="spin" style="position: absolute; inset: 0; border-radius: 50%; border: 6px solid #C6FF3D; border-top-color: transparent"></div><div style="position: absolute; inset: 24px; border-radius: 8px; background: #C6FF3D"></div></div></div>
<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<span class="lbl" style="left: 0; top: 210px">ШАБЛОНЫ АНИМАЦИЙ</span>
<div class="tile glowc" style="left: 0; top: 228px; width: 165px; height: 100px"><div style="position: absolute; left: 62px; top: 16px; width: 40px; height: 40px"><div class="spin" style="position: absolute; inset: 0; border-radius: 50%; border: 4px solid #C6FF3D; border-top-color: transparent"></div><div style="position: absolute; inset: 13px; border-radius: 3px; background: #C6FF3D"></div></div><span class="tname">Интро с логотипом</span></div>
<div class="tile glowc" style="left: 177px; top: 228px; width: 165px; height: 100px; animation-delay: 0.06s"><div style="position: absolute; left: 50px; top: 18px; display: flex; gap: 6px; align-items: flex-end; height: 36px"><span class="bob" style="width: 14px; height: 36px; border-radius: 3px; background: #FF7A1A"></span><span class="bob" style="width: 14px; height: 36px; border-radius: 3px; background: #FF4FA3; animation-delay: 0.1s"></span><span class="bob" style="width: 14px; height: 36px; border-radius: 3px; background: #3D8BFF; animation-delay: 0.2s"></span><span class="bob" style="width: 14px; height: 36px; border-radius: 3px; background: #C6FF3D; animation-delay: 0.3s"></span></div><span class="tname">Кинетический текст</span></div>
<div class="tile" style="left: 0; top: 336px; width: 165px; height: 100px"><div style="position: absolute; left: 14px; right: 14px; top: 14px; height: 44px; border-radius: 8px; background: #3D8BFF; overflow: hidden"><div class="wipe" style="position: absolute; inset: 0; background: #FF7A1A"></div></div><span class="tname">Шторка-переход</span></div>
<div class="tile" style="left: 177px; top: 336px; width: 165px; height: 100px"><span class="twinkle" style="position: absolute; left: 40px; top: 20px; width: 12px; height: 12px; background: #FFB23D; transform: rotate(45deg)"></span><span class="twinkle" style="position: absolute; left: 80px; top: 34px; width: 16px; height: 16px; background: #C6FF3D; animation-delay: 0.3s"></span><span class="twinkle" style="position: absolute; left: 118px; top: 16px; width: 10px; height: 10px; background: #FF4FA3; animation-delay: 0.6s"></span><span class="tname">Финальная плашка</span></div>
<div class="fly" style="position: absolute; left: 0; top: 228px; width: 165px; height: 100px; border-radius: 14px; background: #C6FF3D; --x: -51px; --y: 252px; --s: 0.38; z-index: 3"></div>
<div class="fly" style="position: absolute; left: 177px; top: 228px; width: 165px; height: 100px; border-radius: 14px; background: #FF4FA3; --x: -96px; --y: 222px; --s: 0.3; z-index: 3; animation-delay: 0.06s"></div>
<div class="seg sh" style="left: 0; width: 62px; background: #FF7A1A; --x: 66px"></div>
<div class="seg sh" style="left: 66px; width: 62px; background: #3D8BFF; --x: 66px; animation-delay: 0.03s"></div>
<div class="seg sh" style="left: 132px; width: 62px; background: #8B6CFF; --x: 66px; animation-delay: 0.06s"></div>
<div class="seg sh" style="left: 198px; width: 62px; background: #FFB23D; --x: 66px; animation-delay: 0.09s"></div>
<div class="seg pop" style="left: 0; width: 62px; background: repeating-linear-gradient(135deg, #C6FF3D 0 8px, #A8E02A 8px 16px); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #0B0B0F">ИНТРО</div>
<div class="pop" style="position: absolute; left: 136px; top: 492px; height: 22px; padding: 0 8px; border-radius: 999px; background: #0B0B0F; border: 2px solid #FF4FA3; font-size: 9px; font-weight: 800; color: #FF4FA3; display: flex; align-items: center; z-index: 4; animation-delay: 0.1s">ТЕКСТ</div>
</div>
`,
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">${v.pv}
<div style="position: absolute; left: 0; right: 0; bottom: 18px; height: 30px">
<div class="vis" style="position: absolute; inset: 0; display: flex; justify-content: center"><span style="position: relative"><span class="cap">ЭТО МЕНЯЕТ ВСЁ</span><span class="cap kara" style="position: absolute; left: 0; top: 0; color: #C6FF3D; white-space: nowrap">ЭТО МЕНЯЕТ ВСЁ</span></span></div>
<div class="vis" style="position: absolute; inset: 0; display: flex; justify-content: center; gap: 8px; animation-delay: -3.2s"><span class="cap bnc" style="animation-delay: -3.2s">ЭТО</span><span class="cap bnc" style="color: #FFB23D; animation-delay: -3.1s">МЕНЯЕТ</span><span class="cap bnc" style="animation-delay: -3s">ВСЁ</span></div>
<div class="vis" style="position: absolute; inset: 0; display: flex; justify-content: center; animation-delay: -2.4s"><span class="typw" style="padding: 2px 8px; background: #0B0B0F; font-family: Inter, sans-serif; font-weight: 800; font-size: 18px; color: #FFFFFF; white-space: nowrap; animation-delay: -2.4s">это меняет всё_</span></div>
<div class="vis" style="position: absolute; inset: 0; display: flex; justify-content: center; animation-delay: -1.6s"><span class="cap neon" style="color: #FFD1EA; text-shadow: 0 0 8px #FF4FA3, 0 0 18px #FF4FA3; animation-delay: -1.6s">ЭТО МЕНЯЕТ ВСЁ</span></div>
<div class="vis" style="position: absolute; inset: 0; display: flex; justify-content: center; gap: 8px; animation-delay: -0.8s"><span class="cap wv2" style="color: #C6FF3D; animation-delay: -0.8s">ЭТО</span><span class="cap wv2" style="color: #C6FF3D; animation-delay: -0.7s">МЕНЯЕТ</span><span class="cap wv2" style="color: #C6FF3D; animation-delay: -0.6s">ВСЁ</span></div>
</div>
<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<span class="lbl" style="left: 0; top: 210px">СТИЛЬ СУБТИТРОВ</span>
<div class="row" style="left: 0; right: 0; top: 228px; height: 40px; justify-content: space-between; background: #17171D"><b>Караоке</b><span style="color: #C6FF3D; font-weight: 700">заливка по слову</span></div>
<div class="row" style="left: 0; right: 0; top: 274px; height: 40px; justify-content: space-between; background: #17171D"><b>Поп</b><span style="color: #FFB23D; font-weight: 700">слова выпрыгивают</span></div>
<div class="row" style="left: 0; right: 0; top: 320px; height: 40px; justify-content: space-between; background: #17171D"><b>Печать</b><span style="color: #F4F4F6; font-weight: 700">как на машинке_</span></div>
<div class="row" style="left: 0; right: 0; top: 366px; height: 40px; justify-content: space-between; background: #17171D"><b>Неон</b><span style="color: #FFD1EA; font-weight: 700; text-shadow: 0 0 8px #FF4FA3">мерцает</span></div>
<div class="row" style="left: 0; right: 0; top: 412px; height: 40px; justify-content: space-between; background: #17171D"><b>Волна</b><span style="color: #C6FF3D; font-weight: 700">бежит по словам</span></div>
<div class="sel" style="position: absolute; left: 0; right: 0; top: 228px; height: 40px; border-radius: 8px; border: 2px solid #C6FF3D; box-sizing: border-box; box-shadow: 0 0 20px rgba(198,255,61,0.35)"></div>
<div class="seg" style="left: 0; width: 342px; background: #3D8BFF"></div>
<div class="pop" style="position: absolute; left: 10px; top: 510px; width: 54px; height: 10px; border-radius: 3px; background: #FFFFFF"></div>
<div class="pop" style="position: absolute; left: 72px; top: 510px; width: 40px; height: 10px; border-radius: 3px; background: #C6FF3D; animation-delay: 0.08s"></div>
<div class="pop" style="position: absolute; left: 120px; top: 510px; width: 62px; height: 10px; border-radius: 3px; background: #FFFFFF; animation-delay: 0.16s"></div>
<div class="pop" style="position: absolute; left: 190px; top: 510px; width: 46px; height: 10px; border-radius: 3px; background: #C6FF3D; animation-delay: 0.24s"></div>
<div class="pop" style="position: absolute; left: 244px; top: 510px; width: 56px; height: 10px; border-radius: 3px; background: #FFFFFF; animation-delay: 0.32s"></div>
<div class="pop" style="position: absolute; left: 308px; top: 510px; width: 24px; height: 10px; border-radius: 3px; background: #C6FF3D; animation-delay: 0.4s"></div>
</div>
`,
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">
<div class="zp" style="position: absolute; inset: 0">${v.pv}</div>
<div class="wipeIn" style="position: absolute; inset: 0; background: #3A1A0E"><div style="position: absolute; left: 50%; top: 50px; width: 90px; height: 90px; margin-left: -45px; border-radius: 50%; background: #FF7A1A"></div><div style="position: absolute; left: 0; right: 0; bottom: 0; height: 50px; background: #14141B"></div></div>
<div class="gl" style="position: absolute; left: 0; right: 0; top: 50px; height: 16px; background: #3D8BFF; mix-blend-mode: screen"></div>
<div class="gl" style="position: absolute; left: 0; right: 0; top: 96px; height: 10px; background: #FF4FA3; mix-blend-mode: screen; animation-delay: 0.04s"></div>
<div class="gl" style="position: absolute; left: 0; right: 0; top: 130px; height: 20px; background: #C6FF3D; mix-blend-mode: screen; animation-delay: 0.08s"></div>
<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<span class="lbl" style="left: 0; top: 210px">ПЕРЕХОДЫ</span>
<div class="tile glowc" style="left: 0; top: 230px; width: 165px; height: 70px"><div style="position: absolute; left: 14px; top: 14px; width: 26px; height: 26px; border-radius: 6px; border: 3px solid #C6FF3D; box-sizing: border-box" class="zp"></div><span class="tname">Зум-удар</span></div>
<div class="tile glowc" style="left: 177px; top: 230px; width: 165px; height: 70px; animation-delay: 0.05s"><div style="position: absolute; left: 14px; top: 14px; width: 40px; height: 26px; border-radius: 6px; background: #3D8BFF; overflow: hidden"><div class="wipe" style="position: absolute; inset: 0; background: #FF7A1A"></div></div><span class="tname">Шторка</span></div>
<div class="tile glowc" style="left: 0; top: 310px; width: 165px; height: 70px; animation-delay: 0.1s"><div style="position: absolute; left: 14px; top: 14px; width: 40px; height: 6px; background: #FF4FA3"></div><div style="position: absolute; left: 20px; top: 24px; width: 40px; height: 6px; background: #3D8BFF"></div><span class="tname">Глитч</span></div>
<div class="tile" style="left: 177px; top: 310px; width: 165px; height: 70px"><div style="position: absolute; left: 14px; top: 12px; width: 26px; height: 26px; border-radius: 50%; background: #8B6CFF"></div><div style="position: absolute; left: 32px; top: 16px; width: 22px; height: 22px; border-radius: 50%; background: #FF7A1A"></div><span class="tname">Жидкость</span></div>
<div class="fly" style="position: absolute; left: 0; top: 230px; width: 165px; height: 70px; border-radius: 14px; background: #C6FF3D; --x: 2px; --y: 265px; --s: 0.2; z-index: 3"></div>
<div class="fly" style="position: absolute; left: 177px; top: 230px; width: 165px; height: 70px; border-radius: 14px; background: #C6FF3D; --x: -89px; --y: 265px; --s: 0.2; z-index: 3; animation-delay: 0.05s"></div>
<div class="fly" style="position: absolute; left: 0; top: 310px; width: 165px; height: 70px; border-radius: 14px; background: #C6FF3D; --x: 174px; --y: 185px; --s: 0.2; z-index: 3; animation-delay: 0.1s"></div>
<span class="pop" style="position: absolute; left: 0; top: 400px; padding: 8px 12px; border-radius: 12px; background: #23232C; font-size: 13px; animation-delay: 0.4s">Зум, шторка, глитч расставлены по склейкам</span>
<div class="seg" style="left: 0; width: 82px; background: #8B6CFF"></div>
<div class="seg" style="left: 86px; width: 82px; background: #FF7A1A"></div>
<div class="seg" style="left: 172px; width: 82px; background: #3D8BFF"></div>
<div class="seg" style="left: 258px; width: 84px; background: #FF4FA3"></div>
<div class="pop" style="position: absolute; left: 73px; top: 519px; width: 22px; height: 22px; z-index: 4"><div style="width: 22px; height: 22px; transform: rotate(45deg); background: #C6FF3D; border: 3px solid #0B0B0F; box-sizing: border-box"></div></div>
<div class="pop" style="position: absolute; left: 159px; top: 519px; width: 22px; height: 22px; z-index: 4; animation-delay: 0.05s"><div style="width: 22px; height: 22px; transform: rotate(45deg); background: #C6FF3D; border: 3px solid #0B0B0F; box-sizing: border-box"></div></div>
<div class="pop" style="position: absolute; left: 245px; top: 519px; width: 22px; height: 22px; z-index: 4; animation-delay: 0.1s"><div style="width: 22px; height: 22px; transform: rotate(45deg); background: #C6FF3D; border: 3px solid #0B0B0F; box-sizing: border-box"></div></div>
</div>
`,
(v) => `
<div class="enter" style="position: absolute; left: 0; top: 0; width: 342px; height: 562px; --ed: ${v.edir}">
<div class="pv">
<div class="punch" style="position: absolute; inset: 0; animation-delay: 1.6s">${v.pv}</div>
<div class="flash" style="position: absolute; inset: 0; background: #FFFFFF; opacity: 0; animation-delay: 1.6s"></div>
<span class="pop" style="position: absolute; left: 12px; bottom: 12px; padding: 6px 10px; border-radius: 999px; background: #0B0B0F; border: 2px solid #C6FF3D; font-size: 11px; font-weight: 800; color: #C6FF3D; animation-delay: 0.4s">ТЕМП 2.5 склейки/с</span>
<div class="pbar"><div></div></div><div class="ai"><span class="dot"></span>ИИ монтирует</div><div class="spd">${v.badge}</div></div>
<span class="lbl" style="left: 0; top: 210px">ТИП МОНТАЖА</span>
<div class="tile glowc" style="left: 0; top: 228px; width: 165px; height: 54px; animation-delay: 0.5s"><b style="position: absolute; left: 12px; top: 10px; font-size: 13px; color: #C6FF3D">СДВГ монтаж</b><span style="position: absolute; left: 12px; top: 30px; font-size: 10px; color: #A1A1AA">склейка каждые 0.4 с</span></div>
<div class="tile" style="left: 177px; top: 228px; width: 165px; height: 54px"><b style="position: absolute; left: 12px; top: 10px; font-size: 13px">Кино</b><span style="position: absolute; left: 12px; top: 30px; font-size: 10px; color: #A1A1AA">длинные планы, плавно</span></div>
<div class="tile" style="left: 0; top: 290px; width: 165px; height: 54px"><b style="position: absolute; left: 12px; top: 10px; font-size: 13px">Влог</b><span style="position: absolute; left: 12px; top: 30px; font-size: 10px; color: #A1A1AA">живой ритм, джамп-каты</span></div>
<div class="tile" style="left: 177px; top: 290px; width: 165px; height: 54px"><b style="position: absolute; left: 12px; top: 10px; font-size: 13px">Подкаст</b><span style="position: absolute; left: 12px; top: 30px; font-size: 10px; color: #A1A1AA">камера на говорящего</span></div>
<div class="tile" style="left: 0; top: 352px; width: 165px; height: 54px"><b style="position: absolute; left: 12px; top: 10px; font-size: 13px">Реклама</b><span style="position: absolute; left: 12px; top: 30px; font-size: 10px; color: #A1A1AA">удар в бит, крупно</span></div>
<div class="tile" style="left: 177px; top: 352px; width: 165px; height: 54px"><b style="position: absolute; left: 12px; top: 10px; font-size: 13px">Спокойный</b><span style="position: absolute; left: 12px; top: 30px; font-size: 10px; color: #A1A1AA">медитативно, без спешки</span></div>
<div class="jump" style="position: absolute; left: 0; top: 228px; width: 165px; height: 54px; border-radius: 14px; border: 2px solid #C6FF3D; box-sizing: border-box"></div>
<span class="pop" style="position: absolute; left: 0; top: 420px; padding: 8px 12px; border-radius: 12px; background: #23232C; font-size: 13px; animation-delay: 0.5s">48 с перемонтировано в 16 склеек</span>
<div class="seg fade" style="left: 0; width: 110px; background: #3D8BFF"></div>
<div class="seg fade" style="left: 114px; width: 110px; background: #8B6CFF"></div>
<div class="seg fade" style="left: 228px; width: 114px; background: #FF7A1A"></div>
<div class="seg chop" style="left: 0; width: 18px; background: #FF7A1A"></div>
<div class="seg chop" style="left: 21px; width: 18px; background: #FF4FA3; animation-delay: 0.03s"></div>
<div class="seg chop" style="left: 42px; width: 18px; background: #3D8BFF; animation-delay: 0.06s"></div>
<div class="seg chop" style="left: 63px; width: 18px; background: #C6FF3D; animation-delay: 0.09s"></div>
<div class="seg chop" style="left: 84px; width: 18px; background: #FF7A1A; animation-delay: 0.12s"></div>
<div class="seg chop" style="left: 105px; width: 18px; background: #FF4FA3; animation-delay: 0.15s"></div>
<div class="seg chop" style="left: 126px; width: 18px; background: #3D8BFF; animation-delay: 0.18s"></div>
<div class="seg chop" style="left: 147px; width: 18px; background: #C6FF3D; animation-delay: 0.21s"></div>
<div class="seg chop" style="left: 168px; width: 18px; background: #FF7A1A; animation-delay: 0.24s"></div>
<div class="seg chop" style="left: 189px; width: 18px; background: #FF4FA3; animation-delay: 0.27s"></div>
<div class="seg chop" style="left: 210px; width: 18px; background: #3D8BFF; animation-delay: 0.3s"></div>
<div class="seg chop" style="left: 231px; width: 18px; background: #C6FF3D; animation-delay: 0.33s"></div>
<div class="seg chop" style="left: 252px; width: 18px; background: #FF7A1A; animation-delay: 0.36s"></div>
<div class="seg chop" style="left: 273px; width: 18px; background: #FF4FA3; animation-delay: 0.39s"></div>
<div class="seg chop" style="left: 294px; width: 18px; background: #3D8BFF; animation-delay: 0.42s"></div>
<div class="seg chop" style="left: 315px; width: 27px; background: #C6FF3D; animation-delay: 0.45s"></div>
</div>
`
];
