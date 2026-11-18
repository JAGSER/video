// «Шаги»: библиотека стиля для монтажа поверх видео (приложение Video).
// Пошаговый обучающий рилс: сверху тёмная панель (y 0…960) с заголовком «Шаг N.» (номер жёлтым, название белым),
// по центру иконка, окно программы или карточка, внизу панели субтитры (их рисует приложение).
// Снизу говорящий человек (приложение само сдвигает видео, когда layout(t) = 1).
// На хуке и в финале человек на весь экран: белая плашка-заголовок, карточки-веером, крупное слово-призыв.
const STP = (() => {
  const W = 1080, PH = 960, PI = Math.PI;
  const P = {
    bg0: '#0A0A0C', bg1: '#141416', bg2: '#1B1B1E', line: '#2A2A2E', yellow: '#F6B73C', orange: '#E8743F', white: '#F5F5F6',
    grey: '#9B9BA1', dim: '#6B6B72', card: '#FFFFFF', cardLine: '#E9E9EC', ink: '#17171A', ink2: '#5E5E66', link: '#2F6FE0',
    blue: '#62BDF6', blueD: '#3E9CE0', blueL: '#9AD6FB', hl: '#FFF1CC', green: '#2DBE6C', red: '#F0473C', beige0: '#F6EBD2', beige1: '#C9A365'
  };
  const F = { b: 'InterBlack, Inter, system-ui, sans-serif', m: 'InterBold, Inter, system-ui, sans-serif' };
  let K = null;

  // ---------- время ----------
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eo = (p) => 1 - Math.pow(1 - cl(p), 3);
  const eio = (p) => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const eb = (p) => { p = cl(p); const c = 1.5; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const stag = (lt, t0, i, gap = .12, d = .3) => pr(lt, t0 + i * gap, t0 + i * gap + d);
  const life = (lt, a, b, fi = .3, fo = .2) => Math.min(pr(lt, a, a + fi), b == null ? 1 : 1 - pr(lt, b - fo, b)); // появление и уход

  // режим панели: отрезки [[t0,t1],…] → 0…1 с мягкими краями 0,22 с
  function lay(t, ranges, ramp = .22) {
    let v = 0;
    for (const [a, b] of ranges) v = Math.max(v, Math.min(eio(pr(t, a - ramp * .5, a + ramp * .5)), 1 - eio(pr(t, b - ramp * .5, b + ramp * .5))));
    return v;
  }
  // какая сцена сейчас: список [{t0, …}] по возрастанию → {i, s, lt, next}
  function at(t, list) {
    let i = -1; for (let j = 0; j < list.length; j++) if (t >= list[j].t0) i = j;
    if (i < 0) return null; const s = list[i];
    return { i, s, lt: t - s.t0, next: list[i + 1] ? list[i + 1].t0 : Infinity };
  }

  // ---------- основа ----------
  function begin(t, k) { K = k; const g = k.g; g.textBaseline = 'middle'; return g; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function pop(g, x, y, p, fn, from = .86) { // масштаб от точки + прозрачность
    if (p <= 0) return; g.save(); g.globalAlpha *= cl(p * 1.6); const s = lerp(from, 1, eb(p));
    g.translate(x, y); g.scale(s, s); g.translate(-x, -y); fn(g); g.restore();
  }
  function rise(g, p, fn, dy = 26) { if (p <= 0) return; g.save(); g.globalAlpha *= cl(p * 1.4); g.translate(0, (1 - eo(p)) * dy); fn(g); g.restore(); }
  function font(g, size, w = 'm') { g.font = (w === 'b' ? '900 ' : '700 ') + size + 'px ' + F[w]; }
  function fit(g, s, size, maxW, w = 'm') { let f = size; font(g, f, w); while (g.measureText(s).width > maxW && f > 18) { f -= 2; font(g, f, w); } return f; }
  function txt(g, s, x, y, size, o = {}) { // одна строка, сама ужимается под maxW
    fit(g, s, size, o.max || 960, o.w || 'm'); g.fillStyle = o.col || P.white; g.textAlign = o.al || 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y);
    return g.measureText(s).width;
  }
  function wrapLines(g, s, maxW) {
    const out = []; String(s).split('\n').forEach((para) => { let cur = ''; para.split(/\s+/).filter(Boolean).forEach((w) => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }); out.push(cur); });
    return out;
  }

  // ---------- панель ----------
  // s = layout 0…1: панель шторкой сверху вниз, ровно над видео
  function panel(g, s) {
    if (s <= 0) return; const h = PH * s;
    const gr = g.createLinearGradient(0, 0, 0, PH); gr.addColorStop(0, P.bg0); gr.addColorStop(.55, P.bg1); gr.addColorStop(1, P.bg2);
    g.save(); g.fillStyle = gr; g.fillRect(0, 0, W, h);
    const rg = g.createRadialGradient(540, 430, 40, 540, 430, 620); rg.addColorStop(0, 'rgba(255,255,255,0.045)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, h); g.restore();
  }
  // «Шаг 3. Стиль монтажа»: номер жёлтым, название белым; lt — секунды от начала шага
  function header(g, lt, n, title, o = {}) {
    const y = o.y || 190, size = o.size || 56, a = eo(pr(lt, 0, .35));
    if (a <= 0) return;
    const head = n == null || n === '' ? '' : (o.word || 'Шаг') + ' ' + n + '.';
    font(g, size); let f = size;
    const full = () => g.measureText(head + (head ? ' ' : '') + title).width;
    while (full() > 960 && f > 30) { f -= 2; font(g, f); }
    const w1 = head ? g.measureText(head + ' ').width : 0, w = full(), x0 = 540 - w / 2;
    g.save(); g.globalAlpha *= a; g.translate(0, (1 - a) * 18); g.textAlign = 'left'; g.textBaseline = 'middle';
    if (head) { g.fillStyle = P.yellow; g.fillText(head, x0, y); }
    g.fillStyle = P.white; g.fillText(title, x0 + w1, y); g.restore();
  }
  function label(g, s, x, y, o = {}) { return txt(g, s, x, y, o.size || 30, { col: o.col || P.white, max: o.max || 420, w: o.w || 'm', al: o.al }); }

  // ---------- иконки ----------
  function folder(g, x, y, w, o = {}) { // x,y центр; w ширина
    const h = w * .74, x0 = x - w / 2, y0 = y - h / 2, r = w * .07;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = w * .12; g.shadowOffsetY = w * .04;
    g.fillStyle = P.blueD; g.beginPath(); g.moveTo(x0 + r, y0); g.lineTo(x0 + w * .38, y0); g.lineTo(x0 + w * .46, y0 + h * .1); g.lineTo(x0 + w - r, y0 + h * .1);
    g.quadraticCurveTo(x0 + w, y0 + h * .1, x0 + w, y0 + h * .1 + r); g.lineTo(x0 + w, y0 + h - r); g.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
    g.lineTo(x0 + r, y0 + h); g.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); g.lineTo(x0, y0 + r); g.quadraticCurveTo(x0, y0, x0 + r, y0); g.fill();
    g.shadowColor = 'transparent';
    const gr = g.createLinearGradient(0, y0 + h * .2, 0, y0 + h); gr.addColorStop(0, P.blueL); gr.addColorStop(.25, P.blue); gr.addColorStop(1, '#4BA9EE');
    g.fillStyle = gr; rr(g, x0, y0 + h * .22, w, h * .78, r); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x0 + r, y0 + h * .22 + 2, w - 2 * r, 2);
    g.restore();
    if (o.label) label(g, o.label, x, y + h / 2 + (o.gap || 42), { size: o.size || 34, max: o.max || w * 1.8 });
  }
  function claude(g, x, y, s, o = {}) { // логотип Claude: оранжевый квадрат с белой звездой
    const x0 = x - s / 2, y0 = y - s / 2;
    g.save(); g.shadowColor = 'rgba(232,116,63,0.35)'; g.shadowBlur = s * .3; g.shadowOffsetY = s * .06;
    const gr = g.createLinearGradient(x0, y0, x0 + s, y0 + s); gr.addColorStop(0, '#F08A5D'); gr.addColorStop(1, '#D65A31');
    g.fillStyle = gr; rr(g, x0, y0, s, s, s * .22); g.fill(); g.shadowColor = 'transparent';
    g.strokeStyle = '#fff'; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2 + .13, r1 = s * (i % 2 ? .27 : .33); g.lineWidth = s * (i % 2 ? .05 : .065); g.beginPath(); g.moveTo(x + Math.cos(a) * s * .05, y + Math.sin(a) * s * .05); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke(); }
    g.restore();
    if (o.label) label(g, o.label, x, y + s / 2 + 46, { size: o.size || 34 });
  }
  function dots(g, x1, y1, x2, y2, p = 1, col = P.yellow) { // пунктир-связь, рисуется слева направо
    if (p <= 0) return; g.save(); g.fillStyle = col; const L = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(L / 16);
    for (let i = 0; i <= n * cl(p); i++) { const q = i / n; g.beginPath(); g.arc(lerp(x1, x2, q), lerp(y1, y2, q), 3.2, 0, PI * 2); g.fill(); }
    g.restore();
  }
  function check(g, x, y, s, p = 1, col = P.yellow) { if (p <= 0) return; g.save(); g.strokeStyle = col; g.lineWidth = s * .16; g.lineCap = g.lineJoin = 'round'; g.beginPath(); const a = [x - s * .4, y], b = [x - s * .1, y + s * .3], c = [x + s * .45, y - s * .35]; const q = cl(p * 2); g.moveTo(...a); g.lineTo(lerp(a[0], b[0], cl(q)), lerp(a[1], b[1], cl(q))); if (p > .5) g.lineTo(lerp(b[0], c[0], cl(p * 2 - 1)), lerp(b[1], c[1], cl(p * 2 - 1))); g.stroke(); g.restore(); }
  function cross(g, x, y, w, p = 1) { if (p <= 0) return; g.save(); g.strokeStyle = P.red; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - w / 2, y + w * .12); g.lineTo(x - w / 2 + w * cl(p), y + w * .12 - w * .24 * cl(p)); g.stroke(); g.restore(); }
  function cursor(g, x, y, o = {}) { const s = o.s || 1.4, pr0 = o.press || 0; g.save(); g.translate(x, y); g.scale(s * (1 - pr0 * .12), s * (1 - pr0 * .12));
    g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 2.4; g.lineJoin = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 34); g.lineTo(9, 26); g.lineTo(15, 39); g.lineTo(21, 36); g.lineTo(15, 23); g.lineTo(26, 23); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  function pill(g, x, y, s, o = {}) { // тёмная кнопка-ярлык «✂ Нарезка»
    font(g, o.size || 30); const w = g.measureText(s).width + (o.icon ? 96 : 60), h = (o.size || 30) * 1.9;
    g.save(); g.fillStyle = '#1E1E21'; rr(g, x - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.strokeStyle = '#34343A'; g.lineWidth = 2; g.stroke();
    let tx = x; if (o.icon) { tx += 18; scissors(g, x - w / 2 + 40, y, 16); }
    g.fillStyle = P.white; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, tx, y); g.restore();
  }
  function scissors(g, x, y, r) { g.save(); g.strokeStyle = P.white; g.lineWidth = 3; g.beginPath(); g.arc(x - r * .55, y + r * .55, r * .38, 0, PI * 2); g.arc(x + r * .55, y + r * .55, r * .38, 0, PI * 2); g.moveTo(x - r * .3, y + r * .2); g.lineTo(x + r * .7, y - r * .9); g.moveTo(x + r * .3, y + r * .2); g.lineTo(x - r * .7, y - r * .9); g.stroke(); g.restore(); }

  // ---------- окна и карточки ----------
  // белое окно программы: шапка с тремя точками и заголовком; возвращает {x,y,w,h} области содержимого
  function win(g, x, y, w, h, o = {}) {
    g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 40; g.shadowOffsetY = 14;
    g.fillStyle = P.card; rr(g, x, y, w, h, 22); g.fill(); g.restore();
    const bar = o.bar === false ? 0 : 52;
    if (bar) {
      ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + 30 + i * 22, y + 26, 7, 0, PI * 2); g.fill(); });
      if (o.title) { font(g, 24); const tw = g.measureText(o.title).width, ic = o.icon === false ? 0 : 30; const tx = x + w / 2 - (tw + ic) / 2;
        if (ic) claude(g, tx + 11, y + 26, 22); g.fillStyle = P.ink2; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(o.title, tx + ic, y + 27); }
      g.fillStyle = P.cardLine; g.fillRect(x, y + bar, w, 2);
    }
    if (o.send) { g.fillStyle = P.orange; rr(g, x + w - 58, y + h - 52, 34, 34, 8); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + w - 41, y + h - 26); g.lineTo(x + w - 41, y + h - 43); g.moveTo(x + w - 48, y + h - 37); g.lineTo(x + w - 41, y + h - 44); g.lineTo(x + w - 34, y + h - 37); g.stroke(); }
    return { x: x + 30, y: y + bar + 26, w: w - 60, h: h - bar - 40 };
  }
  // печатающийся текст с кареткой; cps — знаков в секунду
  function typed(g, s, x, y, w, lt, t0, o = {}) {
    const size = o.size || 28, n = Math.max(0, Math.floor((lt - t0) * (o.cps || 34))), part = String(s).slice(0, n);
    font(g, size); g.fillStyle = o.col || P.ink; g.textAlign = 'left'; g.textBaseline = 'middle';
    const lines = wrapLines(g, part, w).slice(0, o.maxLines || 6); let ly = y;
    lines.forEach((l) => { g.fillText(l, x, ly); ly += size * 1.38; });
    const last = lines[lines.length - 1] || '', blink = (Math.floor(lt * 2.2) % 2) == 0 || n < s.length;
    if (lt >= t0 && blink) { g.fillStyle = o.caret || P.ink; g.fillRect(x + g.measureText(last).width + 3, ly - size * 1.38 - size * .55, 3, size * 1.1); }
    return n >= s.length;
  }
  // окно-промпт: заголовок окна + печатающийся текст + кнопка отправки
  function prompt(g, lt, t0, text, o = {}) {
    const x = o.x || 70, y = o.y || 290, w = o.w || 940, h = o.h || 440;
    const p = eo(pr(lt, t0, t0 + .35));
    rise(g, p, (g) => { const c = win(g, x, y, w, h, { title: o.title || 'Claude Code', send: true }); typed(g, text, c.x, c.y + 14, c.w - 10, lt, t0 + .35, { size: o.size || 27, cps: o.cps || 38 }); });
  }
  // таблица в окне: rows [{name, sub, link}] появляются по очереди
  function table(g, lt, t0, rows, o = {}) {
    const x = o.x || 70, y = o.y || 280, w = o.w || 940, rh = o.rh || 80, h = 86 + rows.length * rh;
    const p = eo(pr(lt, t0, t0 + .35));
    rise(g, p, (g) => {
      win(g, x, y, w, h, { bar: false });
      txt(g, o.title || '', x + 34, y + 46, 30, { al: 'left', col: P.ink, max: w - 70 });
      rows.forEach((r, i) => { const q = stag(lt, t0 + .3, i, o.gap || .22, .3); if (q <= 0) return; g.save(); g.globalAlpha *= q; const ry = y + 100 + i * rh + (1 - eo(q)) * 12;
        txt(g, r.name, x + 34, ry, 29, { al: 'left', col: P.ink, max: w * .36 }); if (r.sub) txt(g, r.sub, x + 34, ry + 28, 19, { al: 'left', col: P.ink2, max: w * .36 });
        if (r.link) { const lw = txt(g, r.link, x + w * .44, ry + 6, 22, { al: 'left', col: P.link, max: w * .52 }); g.fillStyle = P.link; g.fillRect(x + w * .44, ry + 20, lw, 2); }
        g.restore(); });
    });
    return h;
  }
  // карточка выбора: items — строки, pick — индекс, который подсвечивается жёлтым с галочкой в момент tPick
  function choice(g, lt, t0, o = {}) {
    const x = o.x || 70, y = o.y || 290, w = o.w || 940, items = o.items || [], h = 170 + items.length * 70;
    rise(g, eo(pr(lt, t0, t0 + .35)), (g) => {
      win(g, x, y, w, h, { bar: false });
      claude(g, x + 44, y + 48, 26); txt(g, o.title || '', x + 70, y + 49, 30, { al: 'left', col: P.ink, max: w - 110 });
      if (o.label) txt(g, o.label, x + 34, y + 104, 22, { al: 'left', col: P.ink2, max: w - 70 });
      items.forEach((s, i) => { const iy = y + 150 + i * 70, on = i === o.pick ? eo(pr(lt, o.tPick == null ? t0 + .8 : o.tPick, (o.tPick == null ? t0 + .8 : o.tPick) + .25)) : 0;
        if (on > 0) { g.save(); g.globalAlpha *= on; g.fillStyle = P.hl; rr(g, x + 20, iy - 30, w - 40, 60, 12); g.fill(); g.restore(); check(g, x + w - 60, iy, 34, on, '#E2A92B'); }
        txt(g, s, x + 40, iy, 28, { al: 'left', col: P.ink, max: w - 140 }); });
    });
  }
  // раскадровка: n кадров-плиток с подписями времени и блоков
  function board(g, lt, t0, o = {}) {
    const x = o.x || 70, y = o.y || 280, w = o.w || 940, n = o.n || 6, lab = o.labels || [], tm = o.times || [];
    const tw = (w - 60 - (n - 1) * 14) / n, th = tw * 1.6, h = th + 170;
    rise(g, eo(pr(lt, t0, t0 + .35)), (g) => {
      win(g, x, y, w, h, { bar: false });
      txt(g, o.title || 'Раскадровка на проверку', x + 30, y + 44, 28, { al: 'left', col: P.ink, max: w - 60 });
      for (let i = 0; i < n; i++) { const q = stag(lt, t0 + .3, i, .1, .25); if (q <= 0) continue; const tx = x + 30 + i * (tw + 14), ty = y + 82;
        g.save(); g.globalAlpha *= q; person(g, tx, ty, tw, th, i);
        if (tm[i]) txt(g, tm[i], tx, ty + th + 26, 18, { al: 'left', col: P.ink2, max: tw });
        if (lab[i]) txt(g, lab[i], tx, ty + th + 52, 18, { al: 'left', col: P.ink, max: tw });
        g.restore(); }
    });
  }
  // плитка-кадр с силуэтом человека (вместо скриншота)
  function person(g, x, y, w, h, seed = 0, tone) {
    const tones = tone ? [tone] : ['#3B3F4A', '#4A3B36', '#2F3A44', '#463F35', '#35323F', '#3D4338'];
    g.save(); rr(g, x, y, w, h, 8); g.clip();
    const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#6D6B70'); gr.addColorStop(1, tones[seed % tones.length]); g.fillStyle = gr; g.fillRect(x, y, w, h);
    const cx = x + w * (.46 + ((seed * 37) % 10) / 100), hy = y + h * .34;
    g.fillStyle = '#2A2524'; g.beginPath(); g.ellipse(cx, y + h * 1.02, w * .56, h * .42, 0, 0, PI * 2); g.fill();
    g.fillStyle = '#D7B79C'; g.beginPath(); g.ellipse(cx, hy, w * .2, w * .25, 0, 0, PI * 2); g.fill();
    g.fillStyle = '#C08A4A'; g.beginPath(); g.ellipse(cx, hy - w * .14, w * .21, w * .12, 0, PI, PI * 2); g.fill();
    g.fillStyle = '#E8E8EA'; rr(g, cx + w * .12, y + h * .62, w * .16, h * .32, w * .07); g.fill();
    g.restore();
  }
  // ряд карточек-роликов (референсы): n плиток, тень, лёгкий наклон
  function reels(g, lt, t0, o = {}) {
    const n = o.n || 4, w = o.w || 200, h = w * 1.6, gap = o.gap || 18, y = o.y || 300, x0 = 540 - (n * w + (n - 1) * gap) / 2;
    for (let i = 0; i < n; i++) { const q = stag(lt, t0, i, .12, .3); if (q <= 0) continue; const x = x0 + i * (w + gap);
      pop(g, x + w / 2, y + h / 2, q, (g) => { g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 24; g.shadowOffsetY = 10; g.fillStyle = '#000'; rr(g, x, y, w, h, 12); g.fill(); g.restore(); person(g, x, y, w, h, i + (o.seed || 0)); }); }
  }
  // крупный образец шрифта «Aa» и подпись под ним
  function type(g, lt, t0, o = {}) { const p = eo(pr(lt, t0, t0 + .4));
    rise(g, p, (g) => { txt(g, o.big || 'Aa', 540, o.y || 440, o.size || 190, { w: 'b', max: 900 }); if (o.sub) txt(g, o.sub, 540, (o.y || 440) + 140, 28, { col: P.grey, max: 900 }); }); }
  // дерево папок: корень и дети, пунктир/линии рисуются, дети выпадают по очереди
  function tree(g, lt, t0, root, kids, o = {}) {
    const rx = 540, ry = o.y || 350, cy = ry + 250, n = kids.length, span = o.span || 640;
    pop(g, rx, ry, eo(pr(lt, t0, t0 + .3)), (g) => folder(g, rx, ry, 190, { label: root, gap: 34, size: 32 }));
    const lp = eo(pr(lt, t0 + .3, t0 + .7)); if (lp <= 0) return;
    g.save(); g.strokeStyle = '#8C8C93'; g.lineWidth = 3; g.beginPath(); g.moveTo(rx, ry + 130); g.lineTo(rx, ry + 130 + 22 * lp);
    g.moveTo(rx - span / 2 * lp, ry + 152); g.lineTo(rx + span / 2 * lp, ry + 152); g.stroke(); g.restore();
    kids.forEach((s, i) => { const kx = n == 1 ? rx : rx - span / 2 + span * i / (n - 1), q = stag(lt, o.tk ? 0 : t0 + .6, i, o.tk ? 0 : .3, .3, 0); const qq = o.tk ? eo(pr(lt, o.tk[i], o.tk[i] + .3)) : q;
      if (qq <= 0) return; g.save(); g.strokeStyle = '#8C8C93'; g.lineWidth = 3; g.beginPath(); g.moveTo(kx, ry + 152); g.lineTo(kx, cy - 60); g.stroke(); g.restore();
      pop(g, kx, cy, qq, (g) => folder(g, kx, cy, 160, { label: s, gap: 32, size: 30, max: 300 })); });
  }

  // ---------- режим «на весь экран» ----------
  // белая плашка-заголовок (хук и финал): строки чёрным, ставь над головой или под подбородком
  function plate(g, lines, x, y, p, o = {}) {
    if (p <= 0) return; const size = o.size || 54; font(g, size, 'b');
    const ls = [].concat(lines), w = Math.min(980, Math.max(...ls.map((l) => g.measureText(l).width)) + 56), h = ls.length * size * 1.16 + 30;
    pop(g, x, y, p, (g) => {
      g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.fillStyle = '#fff';
      ls.forEach((l, i) => { const lw = Math.min(960, g.measureText(l).width + 44); rr(g, x - lw / 2, y - h / 2 + i * size * 1.16 + (i ? 0 : 0), lw, size * 1.16 + 22, 12); g.fill(); });
      g.restore();
      ls.forEach((l, i) => txt(g, l, x, y - h / 2 + 15 + size * .58 + i * size * 1.16, size, { w: 'b', col: P.ink, max: 920 }));
    }, .7);
    return { w, h };
  }
  // крупное слово-призыв «МОНТАЖ»: бежевый градиент, тень; p — появление
  function word(g, s, x, y, p, o = {}) {
    if (p <= 0) return; const size = o.size || 150;
    pop(g, x, y, p, (g) => { fit(g, s, size, 940, 'b'); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 30; g.shadowOffsetY = 12; g.fillStyle = '#5A4528'; g.fillText(s, x, y + 6); g.restore();
      const gr = g.createLinearGradient(0, y - size / 2, 0, y + size / 2); gr.addColorStop(0, P.beige0); gr.addColorStop(1, P.beige1); g.fillStyle = gr; g.fillText(s, x, y); }, 1.25);
  }
  // карточки веером над головой (хук): kinds 'win' | 'logo' | 'reel' | 'list'
  function fan(g, lt, t0, kinds, o = {}) {
    const n = kinds.length, y = o.y || 330, w = o.w || 230, h = w * 1.25;
    kinds.forEach((k, i) => { const q = stag(lt, t0, i, .14, .35); if (q <= 0) return; const x = 540 + (i - (n - 1) / 2) * (w * 1.12), rot = (i - (n - 1) / 2) * .07, bob = Math.sin(lt * 1.6 + i) * 6;
      g.save(); g.translate(x, y + bob + (1 - eo(q)) * 60); g.rotate(rot); g.globalAlpha *= cl(q * 1.5);
      g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 26; g.shadowOffsetY = 10; g.fillStyle = '#fff'; rr(g, -w / 2, -h / 2, w, h, 16); g.fill(); g.shadowColor = 'transparent';
      if (k === 'logo') claude(g, 0, -10, w * .45);
      else if (k === 'reel') person(g, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, i);
      else if (k === 'list') { for (let j = 0; j < 5; j++) { g.fillStyle = j ? '#D8D8DE' : P.ink; rr(g, -w / 2 + 22, -h / 2 + 30 + j * 40, (w - 44) * (j ? .9 - j * .1 : .6), j ? 12 : 18, 6); g.fill(); } }
      else { ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, j) => { g.fillStyle = c; g.beginPath(); g.arc(-w / 2 + 20 + j * 15, -h / 2 + 18, 5, 0, PI * 2); g.fill(); });
        for (let j = 0; j < 4; j++) { g.fillStyle = '#D8D8DE'; rr(g, -w / 2 + 20, -h / 2 + 48 + j * 30, (w - 40) * (1 - j * .15), 12, 6); g.fill(); } }
      g.restore(); });
  }

  return { W, PH, P, F, cl, pr, lerp, eo, eio, eb, stag, life, lay, at, begin, rr, pop, rise, font, fit, txt, label,
    panel, header, folder, claude, dots, check, cross, cursor, pill, scissors, win, typed, prompt, table, choice, board, person, reels, type, tree,
    plate, word, fan };
})();
