const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const PUBLIC_AI="https://pomoshnik.jagser.deno.net/montage";
export async function askAI(prompt,parts=[]){
  const r=await fetch(PUBLIC_AI,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,parts})});
  const j=await r.json().catch(()=>({error:"сервер не ответил"}));
  if(!r.ok||j.error)throw new Error(j.error||r.status);return j.text||"";
}
export const GFX_DOC=`Холст 1080x1920 (x вправо, y вниз). Вставка (insert):
{"t":сек_начала,"d":длительность,"icon":"один эмодзи для таймлайна","idea":"зачем эта вставка, 3-6 слов","sfx":"pop|thud|none",
 "cam":{"zoom":1.0-1.35,"zoomAt":сек_от_начала,"shake":0-30,"shakeAt":сек,"flash":true|false,"dim":0-0.7},
 "layers":[слой,...]}
Слои (у всех: "x","y" центр, "rot" градусы, "at" задержка появления от начала вставки, "dur" сколько живёт (по умолчанию до конца),
 "in": pop|slam|drop|rise|left|right|fade|spin|stamp|none, "out": fade|pop|up|left|right|none, "loop": none|bob|pulse|wiggle|spin|shake):
 {"k":"text","text":"текст, \\n перенос","size":40-220,"font":"b(жирный гротеск)|m(полужирный)|l(курсив с засечками)","color":"#hex","stroke":"#hex или пусто","box":{"color":"#hex или rgba","r":0-60,"pad":10-50},"stagger":"none|word|letter|type","step":0.04-0.4,"hl":["слова","для подсветки"],"hlColor":"#hex","maxW":300-1000}
 {"k":"emoji","ch":"🔥","size":60-300,"fx":"none|float|rain|burst","n":1-20}
 {"k":"shape","sh":"rect|circle|heart|star|arrow|line|ring|burst|underline","w":..,"h":..,"x2":..,"y2":..,"fill":"#hex или пусто","stroke":"#hex","sw":4-20,"draw":true (рисуется линией)}
 {"k":"frame","w":..,"h":..,"cx":..,"cy":..,"s":1.5-3,"bcolor":"#hex","b":4-30,"caption":"подпись"} (окно-лупа: увеличенный кусок кадра вокруг точки cx,cy)`;


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
export const PLAN_PROMPT=(D,frames)=>`Ты лучший монтажёр и моушн-дизайнер вертикальных рилсов, уровень популярных роликов «монтаж через Claude»: каждая графическая вставка что-то добавляет к смыслу, шутит, поясняет, подчёркивает эмоцию или указывает на предмет в кадре.
Приложены звук ролика (${D.toFixed(1)} с) и кадры с временем: ${frames.map(f=>f.t.toFixed(1)).join(", ")} с.
Сначала пойми ролик: о чём он, кто говорит, где лицо и важные предметы в кадре, настроение, где смешно, где пик. Потом смонтируй.
Верни ТОЛЬКО JSON:
{"title":"о чём ролик, 2-4 слова","lang":"язык речи","palette":["#hex","#hex","#hex"],
"faces":[{"t":сек кадра,"x":лево,"y":верх,"w":ширина,"h":высота}] (лицо главного человека на КАЖДОМ кадре, в координатах холста 1080x1920: кадры приложены уменьшенными в 4 раза, умножь на 4; от лба до подбородка),
"words":[{"w":"слово","s":сек,"e":сек}],
"keep":[{"s":сек,"e":сек}],
"inserts":[вставка,...]}
words: субтитры НА РУССКОМ по реальному звуку (если речь не русская, живой короткий перевод каждой фразы, слова перевода разложены по времени фразы).
keep: смех, реакции, важные паузы, которые нельзя вырезать.
inserts: одна вставка на каждые 2-4 секунды, не накладываются. Правила:
- Каждая вставка придумана именно под этот момент ролика: что сказано и что видно. Никаких общих фраз, никаких шаблонов.
- Разные идеи по ходу ролика: заголовок-крючок в первые 1.5 с, подписи и ярлыки к людям и предметам со стрелками, крупные выкрики, ироничные комментарии, эмодзи-реакции, счётчики и рейтинги, окно-лупа на деталь, ключевые слова цитатой, финальный панчлайн.
- Единая палитра ролика (palette), у текстов обводка или плашка для читаемости.
- Никогда не закрывай лицо и глаза. Основное место для текстов и плашек: нижняя половина кадра, y от 1000 до 1320 (над субтитрами), или свободный край рядом с предметом. Выше лица только если там пусто и это заголовок. Субтитры внизу (y 1380-1500), туда не ставь.
- Анимации спокойные и чистые, как у профессиональных моушн-дизайнеров: pop, rise, fade, мягкий slam. Вспышка flash и тряска shake максимум 1-2 раза за ролик. sfx: pop или none.
- Анимации и композиция меняются от вставки к вставке; удары (slam, stamp, shake, zoom, flash) только на пиках.
- Тексты по-русски, короткие, живые.
${GFX_DOC}`;
