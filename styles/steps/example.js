// Пример монтажа в стиле «Шаги» поверх ролика «Свой Telegram-бот за 3 шага» (другая тема; повторяй приёмы, не тексты).
// Время в секундах исходника; моменты слов берём из озвучки через k.when(слово, n, запасное время).
let K0 = null;
const at = (q, n, d) => (K0 ? K0.when(q, n, d) : d);

// хук 0…5.4 на весь экран, шаги 5.4…41, финал на весь экран
const PANEL = [[5.4, 41.2]];
function layout(t, k) { return STP.lay(t, PANEL); }

const STEPS = [
  { t0: 5.4, n: 1, title: 'Подготовка' },
  { t0: 17.0, n: 2, title: 'Код бота' },
  { t0: 30.2, n: 3, title: 'Запуск' },
];

// сцены центра панели: каждая на своё слово
const SCENES = [
  { t0: 5.4, fn: (g, t, lt, a) => { // «нужен Telegram и BotFather»
      g.globalAlpha *= a;
      STP.pop(g, 360, 470, STP.eo(STP.pr(lt, 0, .35)), (g) => iconCard(g, 330, 470, 'T', '#2AABEE', 'Telegram'));
      const tb = at('botfather', 1, 7.1) - 5.4;
      STP.dots(g, 450, 470, 630, 470, STP.eo(STP.pr(lt, tb - .1, tb + .4)));
      STP.pop(g, 720, 470, STP.eo(STP.pr(lt, tb, tb + .35)), (g) => iconCard(g, 750, 470, 'B', '#3A8BD8', 'BotFather'));
    } },
  { t0: 9.6, fn: (g, t, lt, a) => { // «создай папку bot, внутри две»
      g.globalAlpha *= a;
      STP.tree(g, lt, 0, '«bot»', ['код', 'ключи'], { tk: [at('код', 1, 11.2) - 9.6, at('ключ', 1, 12.0) - 9.6], span: 420 });
    } },
  { t0: 13.4, fn: (g, t, lt, a) => { // «выбери: локально»
      g.globalAlpha *= a;
      STP.choice(g, lt, 0, { title: 'Новый бот', label: 'Где запускать', items: ['Облако', 'Локально'], pick: 1, tPick: at('локальн', 1, 14.6) - 13.4, y: 300 });
    } },
  { t0: 17.0, fn: (g, t, lt, a) => { // промпт печатается
      g.globalAlpha *= a;
      STP.prompt(g, lt, .1, 'Напиши Telegram-бота на Python: отвечает на команды /start и /help, ключ бери из папки «ключи».', { y: 290, h: 400 });
    } },
  { t0: 23.6, fn: (g, t, lt, a) => { // список библиотек
      g.globalAlpha *= a;
      STP.table(g, lt, 0, [
        { name: 'Python', sub: 'язык', link: 'python.org' },
        { name: 'aiogram', sub: 'библиотека бота', link: 'github.com/aiogram' },
        { name: 'dotenv', sub: 'ключи из файла' },
      ], { title: 'Поставь это', y: 300 });
    } },
  { t0: 30.2, fn: (g, t, lt, a) => { // «Запуск»: кнопка и курсор
      g.globalAlpha *= a;
      STP.pill(g, 540, 430, 'Запустить', { size: 48 });
      const tc = at('нажми', 1, 31.8) - 30.2, m = STP.eo(STP.pr(lt, tc - .5, tc));
      STP.cursor(g, STP.lerp(820, 600, m), STP.lerp(640, 450, m), { press: STP.pr(lt, tc, tc + .08) * (1 - STP.pr(lt, tc + .15, tc + .3)) });
      STP.check(g, 540, 600, 80, STP.pr(lt, tc + .3, tc + .8), STP.P.green);
    } },
  { t0: 35.0, fn: (g, t, lt, a) => { // «проверь всё на раскадровке»
      g.globalAlpha *= a;
      STP.board(g, lt, 0, { n: 5, times: ['0:00', '0:05', '0:17', '0:30', '0:41'], labels: ['хук', 'шаг 1', 'шаг 2', 'шаг 3', 'финал'], title: 'План ролика', y: 300 });
    } },
];

// своя иконка сервиса в манере стиля: белая карточка с буквой
function iconCard(g, x, y, ch, col, name) {
  g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
  g.fillStyle = col; STP.rr(g, x - 100, y - 100, 200, 200, 46); g.fill(); g.restore();
  STP.txt(g, ch, x, y + 6, 120, { w: 'b' });
  STP.label(g, name, x, y + 150);
}

function draw(t, k) {
  K0 = k;
  const g = STP.begin(t, k), s = k.split(t);
  if (s > 0) {
    STP.panel(g, s);
    g.save(); g.globalAlpha *= s;
    const st = STP.at(t, STEPS);
    if (st) STP.header(g, st.lt, st.s.n, st.s.title);
    const sc = STP.at(t, SCENES);
    if (sc) { g.save(); sc.s.fn(g, t, sc.lt, STP.life(t, sc.s.t0, sc.next, .01, .2)); g.restore(); }
    g.restore();
    return;
  }
  const f = k.face(t), above = f ? Math.max(260, f.y - 200) : 330, chin = f ? f.y + f.h : 900, wy = chin + 95 + 65 < 1150 ? chin + 95 : 1330;
  if (t < 5.4) { // хук: обещание и карточки над головой
    STP.fan(g, t, .2, ['win', 'logo', 'list'], { y: above, w: 190 });
    STP.plate(g, ['Свой Telegram-бот', 'за 3 шага'], 540, 1390, STP.life(t, .3, 5.3));
  } else { // финал: слово для комментария и название
    const tw = at('бот', 3, 42.5);
    STP.word(g, 'БОТ', 540, wy, STP.life(t, tw, 46.5, .35, .3), { size: 130 });
  }
}

function sound(s) {
  const at = (q, n, d) => s.when(q, n, d);
  s.play(.3, 'pop_soft', .12);
  [0, 1, 2].forEach((i) => s.play(.2 + i * .14, 'pop_high', .08, { pitch: 1.15 - i * .15 }));
  STEPS.forEach((st) => s.play(st.t0, 'marimba_run', .1));
  s.play(at('botfather', 1, 7.1), 'pop_high', .1);
  s.play(at('код', 1, 11.2), 'wood', .1, { pitch: 1.1 });
  s.play(at('ключ', 1, 12.0), 'wood', .1, { pitch: .9 });
  s.play(at('локальн', 1, 14.6), 'toggle_on', .12);
  s.play(17.2, 'type', .1);
  [0, 1, 2].forEach((i) => s.play(23.9 + i * .22, 'tick', .09));
  s.play(at('нажми', 1, 31.8), 'click', .14);
  s.play(at('нажми', 1, 31.8) + .4, 'success', .12);
  s.play(at('бот', 3, 42.5), 'pop_double', .14);
}
