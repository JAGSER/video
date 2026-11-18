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
"faces":[{"t":сек кадра,"x":лево,"y":верх,"w":ширина,"h":высота}],
"scenes":[{"s":сек,"e":сек,"what":"что происходит в кадре","objects":[{"name":"предмет","x":..,"y":..,"w":..,"h":..}]}],
"moments":[{"t":сек,"kind":"крючок|шутка|пик|товар|факт|эмоция|призыв","say":"что сказано или произошло"}]}
words: субтитры НА РУССКОМ точно по звуку (если речь не русская, живой короткий перевод, слова перевода разложены по времени фразы).
keep: смех, реакции, важные паузы, которые нельзя вырезать.
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
