const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const PUBLIC_AI="https://pomoshnik.jagser.deno.net/montage";
export async function askAI(prompt,parts=[],temperature=0.9){
  const r=await fetch(PUBLIC_AI,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,parts,temperature})});
  const j=await r.json().catch(()=>({error:"сервер не ответил"}));
  if(!r.ok||j.error)throw new Error(j.error||r.status);return j.text||"";
}
export const CLAUDE_AI="https://pomoshnik.jagser.deno.net/montage-claude";
export async function askClaude(prompt,images=[],onWait){
  const r=await fetch(CLAUDE_AI,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,images})});
  const j=await r.json().catch(()=>({error:"сервер не ответил"}));
  if(!r.ok||j.error)throw new Error(j.error||r.status);
  if(!j.job)return j.text||"";
  const base=CLAUDE_AI.replace("/montage-claude","/montage-job?id=")+j.job;
  for(let i=0;i<150;i++){
    await new Promise(r=>setTimeout(r,3000));onWait&&onWait(i);
    const q=await fetch(base).then(r=>r.json()).catch(()=>null);
    if(q&&q.done){if(q.error)throw new Error(q.error);return q.text||""}
  }
  throw new Error("Claude не ответил вовремя");
}
export const GFX_DOC=`Холст 1080x1920 (x вправо, y вниз). Вставка (insert):
{"t":сек_начала,"d":длительность,"icon":"один эмодзи только для значка на таймлайне (в кадр не попадает)","idea":"зачем вставка, 3-6 слов","sfx":"pop|thud|none",
 "cam":{"zoom":1.0-1.25,"zoomAt":сек_от_начала,"shake":0-14,"shakeAt":сек,"flash":true|false,"dim":0-0.6},
 "layers":[слой,...]}
Общие поля слоя: "x","y" (центр), "rot" (градусы), "at" (задержка от начала вставки), "dur" (сколько живёт, по умолчанию до конца),
 "in": pop|slam|drop|rise|left|right|fade|spin|stamp|none, "out": fade|pop|up|left|right|none, "loop": none|bob|pulse|wiggle|spin.
Виды слоёв:
 {"k":"svg","svg":"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 W H'>...</svg>","w":ширина_на_холсте,"h":высота} — ТВОЯ графика: стикеры, значки, плашки, ленты, бейджи, рамки, иллюстрации, иконки. Рисуй как дизайнер: градиенты, тени (filter), обводки, скругления, детали. ВНУТРИ SVG НЕ ИСПОЛЬЗУЙ <text> (шрифты там не грузятся) — надписи делай слоем text поверх.
 {"k":"text","text":"текст, \\n перенос","size":28-220,"font":"b (Inter Black)|m (Inter Bold)|l (Lora Italic)","color":"#hex","stroke":"#hex или пусто","box":{"color":"#hex, rgba или css-градиент linear-gradient(...)","r":0-60,"pad":8-50,"border":"css border или пусто","shadow":"css box-shadow или пусто"},"stagger":"none|word|letter|type","step":0.03-0.3,"hl":["слова"],"hlColor":"#hex","maxW":200-1000,"ls":межбуквенный_px,"upper":true|false}
 {"k":"shape","sh":"arrow|line|ring|underline|circle|rect|star|heart|burst","w":..,"h":..,"x2":..,"y2":..,"fill":"#hex","stroke":"#hex","sw":3-20,"draw":true} — указатели и простые фигуры, рисуются линией.
 {"k":"frame","w":..,"h":..,"cx":..,"cy":..,"s":1.5-3,"bcolor":"#hex","b":4-24,"caption":"подпись"} — окно-лупа на деталь кадра.`;
export function b64(blob){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(",")[1]);fr.onerror=rej;fr.readAsDataURL(blob)})}
export function parseJSON(t){t=String(t).trim().replace(/^```(json)?/,"").replace(/```$/,"");const a=t.indexOf("{"),b=t.lastIndexOf("}");return JSON.parse(t.slice(a,b+1))}
export async function audioWav(file){
  const buf=await file.arrayBuffer();
  const tmp=new (window.AudioContext||window.webkitAudioContext)();
  const ab=await tmp.decodeAudioData(buf);tmp.close&&tmp.close();
  const rate=ab.duration<300?16000:8000;
  const off=new OfflineAudioContext(1,Math.ceil(ab.duration*rate),rate);const s=off.createBufferSource();s.buffer=ab;s.connect(off.destination);s.start();
  const r=await off.startRendering();const d=r.getChannelData(0);
  const out=new DataView(new ArrayBuffer(44+d.length*2));const W=(o,s)=>{for(let i=0;i<s.length;i++)out.setUint8(o+i,s.charCodeAt(i))};
  W(0,"RIFF");out.setUint32(4,36+d.length*2,true);W(8,"WAVE");W(12,"fmt ");out.setUint32(16,16,true);out.setUint16(20,1,true);out.setUint16(22,1,true);out.setUint32(24,rate,true);out.setUint32(28,rate*2,true);out.setUint16(32,2,true);out.setUint16(34,16,true);W(36,"data");out.setUint32(40,d.length*2,true);
  for(let i=0;i<d.length;i++)out.setInt16(44+i*2,clamp(d[i],-1,1)*32767,true);
  return new Blob([out],{type:"audio/wav"});
}
export async function grabFrames(url,dur,onProg,maxN=32){
  // кадры ролика для ИИ: равномерно по всей длине, 270x480
  const v=document.createElement("video");v.muted=true;v.playsInline=true;v.preload="auto";v.src=url;
  await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=()=>j(new Error("кадры не читаются"))});
  const n=Math.min(maxN,Math.max(4,Math.ceil(dur/1.0))),c=document.createElement("canvas");c.width=270;c.height=480;const g=c.getContext("2d");
  const out=[];
  for(let i=0;i<n;i++){
    const t=Math.min(dur-0.05,(i+0.5)*dur/n);
    await new Promise(r=>{v.onseeked=r;v.currentTime=t});
    const vw=v.videoWidth,vh=v.videoHeight,sc=Math.max(270/vw,480/vh);g.drawImage(v,(270-vw*sc)/2,(480-vh*sc)/2,vw*sc,vh*sc);
    out.push({t,data:c.toDataURL("image/jpeg",.6).split(",")[1]});
    onProg&&onProg(i+1,n);
  }
  v.removeAttribute("src");v.load();
  return out;
}
export const ANALYZE_PROMPT=(D,frames)=>`Разбери ролик для монтажёра. Приложены звук (${D.toFixed(1)} с) и кадры с временем: ${frames.map(f=>f.t.toFixed(1)).join(", ")} с. Кадры уменьшены в 4 раза: все координаты давай в холсте 1080x1920 (умножай на 4).
Верни ТОЛЬКО JSON:
{"title":"о чём ролик, 2-4 слова","lang":"язык речи","summary":"2-3 предложения: о чём ролик, кто говорит, тон",
"words":[{"w":"слово","s":сек,"e":сек}],
"keep":[{"s":сек,"e":сек}],
"retakes":[{"s":сек,"e":сек,"why":"дубль|оговорка|фальстарт|мусор"}],
"faces":[{"t":сек кадра,"x":лево,"y":верх,"w":ширина,"h":высота}],
"scenes":[{"s":сек,"e":сек,"what":"что происходит в кадре","objects":[{"name":"предмет","x":..,"y":..,"w":..,"h":..}]}],
"moments":[{"t":сек,"kind":"крючок|шутка|пик|товар|факт|эмоция|призыв","say":"что сказано или произошло"}]}
words: субтитры НА РУССКОМ точно по звуку (если речь не русская, живой короткий перевод, слова перевода разложены по времени фразы).
Названия и числа: бренды и программы пиши как они пишутся (Claude Code, Remotion, Telegram, YouTube), числа цифрами, имена с большой буквы; ничего не додумывай.
keep: смех, реакции, важные паузы, которые нельзя вырезать.
retakes: что монтажёр вырезал бы: повторные дубли одной фразы (оставь последний удачный, вырежи прежние), оговорки с поправкой, фальстарты, «э-э»/«ну вот», обрывки. Границы точно по словам, смысл не теряй. Если вырезать нечего, [].
faces: лицо главного человека на КАЖДОМ кадре, от лба до подбородка.
objects: важные предметы в кадре (товар, жест, вещь, о которой говорят) с рамкой.`;
export const DESIGN_PROMPT=(D,an)=>`Ты сильный моушн-дизайнер вертикальных рилсов, уровень популярных роликов «монтаж через Claude». Тебе дан разбор ролика (${D.toFixed(1)} с) и ключевые кадры (по порядку, время подписано в разборе keyframes).
Разбор: ${JSON.stringify(an)}
Задача: сделать дизайн монтажа ЦЕЛИКОМ сам.
1) Определи фирменный стиль ролика: палитру (3-5 цветов под настроение и предметы в кадре), какой шрифт для заголовков, стиль плашек и стикеров. Всё в ролике в этом едином стиле.
2) Сделай вставки (одна на 2-4 секунды, не накладываются): каждая про конкретный момент, со смыслом (крючок в первые 1.5 с, ярлыки к предметам со стрелкой, ключевые слова, ироничные комментарии, свои нарисованные стикеры-реакции, бейджи с цифрами, финальный панчлайн). Тексты по-русски, короткие, живые.
3) Графику рисуй сам в SVG: никаких системных эмодзи в кадре, никаких дешёвых прямоугольников по умолчанию. Плашки с градиентом, тенью, аккуратными скруглениями, бейджи и стикеры с объёмом и обводкой, как у дизайнера.
4) Никогда не закрывай лицо (faces) и глаза. Основное место для текстов: нижняя половина кадра y 1000-1320 или свободный край рядом с предметом. Субтитры внизу y 1380-1500, туда ничего не ставь.
5) Анимации чистые: pop, rise, fade, мягкий slam, stagger по словам. flash и shake максимум 1-2 раза за ролик.
${GFX_DOC}
Верни ТОЛЬКО JSON: {"theme":{"palette":["#hex",...],"accent":"#hex цвет выделения в субтитрах","subText":"#hex","subStroke":"#hex","font":"b|m|l"},"inserts":[вставка,...]}`;
export const CHECK_PROMPT=(design,shots)=>`Ты арт-директор. Это кадры готового монтажа: по одному на каждую вставку, в момент когда она полностью появилась (по порядку, id вставок: ${shots.map(s=>s.id).join(", ")}).
Текущий дизайн вставок: ${JSON.stringify(design)}
Проверь каждый кадр строго: закрыто ли лицо или глаза, вылезает ли что-то за край, читается ли текст, не налезают ли элементы друг на друга, красиво ли (дорого, аккуратно, в едином стиле), подходит ли по смыслу. Исправь всё, что плохо.
${GFX_DOC}
Верни ТОЛЬКО JSON {"ops":[{"op":"set","id":..,...поля вставки целиком с layers},{"op":"del","id":..}],"notes":"что исправил, коротко по-русски"}. Если всё хорошо: {"ops":[],"notes":"ок"}.`;

export const OVERLAY_PROMPT=`Ты — сильный моушн-дизайнер и программист. Ты делаешь монтажную графику ПОВЕРХ живого видео (вертикальный рилс 1080×1920): прозрачный слой на Canvas 2D над видео человека. Это полный комплекс монтажа, как в популярных роликах «монтаж через Claude»: крючок в первые секунды, ярлыки и подписи к предметам со стрелками, ключевые слова и числа, рисунки-метафоры к сказанному, реакции, ироничные комментарии, финальный панчлайн. Графика подчёркивает и дополняет то, что человек говорит и показывает, а не перекрывает его.

ФОРМАТ ОТВЕТА: только один блок \\\`\\\`\\\`js … \\\`\\\`\\\` без пояснений. В нём функция draw(t, k), которая рисует кадр в момент t (секунды, 0…k.duration). Рядом можно объявить свои функции и константы. Кадры рисуются независимо и не по порядку — всё вычисляй из t, не храни состояние между вызовами. Нельзя: сеть, картинки, DOM, setTimeout, Math.random (используй k.rand(seed)).

ХОЛСТ: k.g — CanvasRenderingContext2D, k.W=1080, k.H=1920. Холст ПРОЗРАЧНЫЙ, под ним идёт видео. НЕ заливай холст и не рисуй полноэкранный фон, рамки стиля, виньетки, сетки, сканлинии и HUD на весь экран (функции стиля для фона и рамки кадра не вызывай). Рисуешь только отдельные элементы: плашки, тексты, рисунки, стрелки, бейджи, числа. Полноэкранная заливка допустима только как вставка-удар до 0.6 с. Безопасная зона: x 60…1020, y 110…1360 (k.SAFE). Ниже y 1360 приложение само рисует субтитры речи, туда ничего не ставь и сам субтитры речи не рисуй.
ЛИЦО: k.face(t) → {x,y,w,h} — где лицо человека в кадре в момент t (или null). НИКОГДА не закрывай лицо и глаза: каждую плашку, текст и рисунок ставь в свободное место (выше лица, ниже лица до y 1360, сбоку), проверяя k.face(t) в том же кадре. Текст поверх видео всегда на плашке или с обводкой, чтобы читался на любом фоне.

СИНХРОН С ГОЛОСОМ: k.subs — фразы речи человека в видео [{t0,t1,text}]. k.sub(t) → {i, text, t0, t1, p} — текущая фраза (p — доля 0…1). Меняй сцены вместе с фразами. k.amp — громкость голоса 0…1 (для пульса, «дыхания»).
k.when('слово', n) → секунда, когда в озвучке звучит n-е (с 1) вхождение слова; регистр и окончание не важны (k.when('лодк') найдёт «лодок»), числа цифрами и словами равны (k.when('7') = k.when('семь')); слова нет — null (или третий аргумент: k.when('кран', 1, 57)). Названный предмет, число, цвет появляется в момент k.when(...), а не в начале фразы. В звуке так же: s.when(...). k.words — все слова [{w,t0,t1}].

КИСТИ:
- k.text(str, x, y, opts) — ВЕСЬ текст рисуй только им: он сам уменьшает шрифт и переносит строки, чтобы влезть в экран. opts: size (64), weight (700), color, align ('center'|'left'|'right'), maxWidth, maxLines (3), lineHeight (1.2), alpha, font, stroke (цвет обводки), strokeWidth. y — центр блока. Возвращает {w,h,size}.
- k.path(d, progress, x, y, {scale, color, width, fill}) — SVG-путь с координатами вокруг 0,0; прорисовывается штрихом по мере progress 0…1; fill — заливка, проявляется вместе с progress. color: null — без обводки.
- k.card(x, y, w, h, {r, color, shadow}) — скруглённая подложка (x,y — левый верхний угол).
- k.emoji(символ, x, y, size) — только если в стиле нет своего рисунка; лучше рисуй предметы сам.
- k.prog(t,a,b) → 0…1; k.ease.out / inOut / back / elastic; k.lerp; k.clamp; k.rand(seed) → генератор 0…1.
- k.palette = {bg:'#F6F1E9', ink:'#1F1B16', accent:'#B5532E', soft:'#F3E1D6', white:'#FFFDF9', muted:'#6E655A'} — фирменная; можно придумать свою под тему, но текст должен хорошо читаться.
- k.title — тема ролика; k.duration — длина в секундах.

КАЧЕСТВО:
- Текст на экране — короткие ключевые слова, числа, заголовки (до ~7 слов), а не полные фразы озвучки.
- Одновременно не больше 2–3 текстовых блоков; они не налезают друг на друга и на рисунки.
- У каждой сцены появление (0,3–0,6 с), жизнь (лёгкое движение) и уход. Плавно, через k.ease. Разные приёмы в разных сценах.
- Первые 1–2 секунды — цепляющий заголовок-крючок про суть ролика.
- Графика появляется каждые 2–4 секунды, точно на нужные слова (k.when), и не висит постоянно: между вставками видно чистое видео.
- Кадр рисуется быстро (<10 мс): не больше ~300 фигур, без тяжёлых циклов.
- Код компактный (до ~350 строк): сцены описывай массивом данных и общими функциями, без копирования одинаковых кусков.
- Если пришлют замечания или кадры — ответь исправленным кодом целиком.

ЗВУК: в том же блоке объяви function sound(s) — звуковые эффекты под твою анимацию. Она вызывается один раз и раскладывает звуки по времени: s.play(t, "имя", громкость 0.05…0.3, {pitch}) — pitch от 0.5 до 2 сдвигает высоту (удобно для серии). Других звуков нет, свои не синтезируй. Есть s.duration, s.subs, s.rand(seed).
Звуки (имя — что это):
- появление: pop_soft (мягкий поп), pop_high (звонкий поп), pop_double (поп-поп), bubble (пузырёк вверх), bubble_down (пузырёк вниз), drop (капля), marimba (нота маримбы), kalimba (нота калимбы), wood (деревянный стук), bamboo (полый стук), woodblock (высокий стук), rim (щелчок по ободу барабана);
- смена сцены: marimba_run (лесенка маримбы вверх), kalimba_run (лесенка калимбы вверх);
- итог и успех: success (две ноты вверх), success3 (три ноты вверх), notify (три мягкие ноты), sparkle (искорки), magic (взлёт с искорками), ta_da (та-дам), fanfare_soft (мягкие фанфары), error_soft (две ноты вниз — «так не надо», «ошибка»);
- кнопки: click (щелчок), toggle_on (включение), toggle_off (выключение), key_soft (клавиша);
- числа и текст: tick (тик), type (печатная машинка), counter (серия тиков ~0.6 с), odometer (тики вверх ~0.7 с), abacus (счёты), tally (четыре тика по одному).
- Звуки подчёркивают события на экране: появление предмета, смена сцены, набегающее число, печатающийся текст, итог. Ставь их точно в те моменты, когда это происходит в draw.
- Главное — голос, под ним ещё будет музыка: громкость 0.08…0.2, в среднем не чаще одного звука в 1–1,5 с (серия тиков у счётчика — один звук). Голос человека в видео главный: звуки тихие.`;

export function styleRules(konst,doc){
  if(/РЕЖИМ: ПАНЕЛЬ/.test(doc||""))return "СТИЛЬ ГРАФИКИ: «"+konst+"» (обязательно, рисуй через его библиотеку "+konst+").\n"+
  "ЭТОТ СТИЛЬ ОТМЕНЯЕТ запрет на фон: в режиме панели ты сам заливаешь ВЕРХНЮЮ половину кадра (y 0…960) панелью стиля, а видео с человеком приложение само сдвигает в нижнюю половину. "+
  "Режим задаёшь функцией layout(t, k) → 0…1 (1 = панель сверху, человек снизу; 0 = человек на весь экран). Ниже y 960 в режиме панели ничего не рисуй. "+
  "Субтитры речи рисует приложение: в режиме панели в полосе y 780…900 внутри панели, на весь экран около y 1100…1200; туда ничего не ставь. Всё остальное из общих правил (лицо, синхрон k.when, звук) действует.\n\nПРАВИЛА СТИЛЯ (полностью):\n";
  return "СТИЛЬ ГРАФИКИ: «"+konst+"» (обязательно, рисуй через его библиотеку "+konst+").\n"+
  "Все элементы графики (плашки, тексты, рисунки, числа, переходы, звук) в визуальном языке стиля из правил и примера. Не вводи элементы другого стиля. "+
  "Предметы, для которых в библиотеке "+konst+" есть функции, строй этими функциями. Если готовой нет, нарисуй сам кодом в языке стиля: те же цвета, линия, заливка, уровень детализации. "+
  "Пример ниже сделан как полноэкранный ролик с фоном. У тебя видео под графикой: бери из стиля элементы, шрифты, цвета, анимации и рисунки, но фон, рамку кадра, HUD и заливку всего экрана НЕ рисуй.\n\nПРАВИЛА СТИЛЯ (полностью):\n";
}
export const STYLE_PICK=(styles)=>`\nТакже выбери стиль графики для монтажа, который лучше всего подходит теме и настроению ролика, из списка (верни его id в поле "style"):\n${styles.map(s=>s.id+": "+s.name+" — "+s.desc).join("\n")}`;
export async function askClaudeChat({system,messages,model,max_tokens},onWait){
  const r=await fetch(CLAUDE_AI,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,messages,model,max_tokens})});
  const j=await r.json().catch(()=>({error:"сервер не ответил"}));
  if(!r.ok||j.error)throw new Error(j.error||r.status);
  if(!j.job)return j.text||"";
  const base=CLAUDE_AI.replace("/montage-claude","/montage-job?id=")+j.job;
  for(let i=0;i<200;i++){
    await new Promise(r=>setTimeout(r,3000));onWait&&onWait(i);
    const q=await fetch(base).then(r=>r.json()).catch(()=>null);
    if(q&&q.done){if(q.error)throw new Error(q.error);return q.text||""}
  }
  throw new Error("Claude не ответил вовремя");
}
export function extractCode(t){const m=String(t).match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/);return m?m[1]:(/function\s+draw\s*\(/.test(t)?t:null)}
