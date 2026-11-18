import {askClaudeChat,parseJSON} from "./ai.js";

const COLORS=["#FF7A1A","#3D8BFF","#8B6CFF","#FF4FA3","#C6FF3D","#FFB23D"];
const j=(x)=>JSON.stringify(x);
const uniq=a=>[...new Set((Array.isArray(a)?a:[]).map(Number).filter(Number.isFinite))];
const phrases=S=>S.phr||[];
const ids=S=>phrases(S).map(x=>x.id);
const normOrder=(a,S)=>{
  const all=ids(S),set=new Set(all);
  return [...uniq(a),...all].filter((x,i,a)=>set.has(x)&&a.indexOf(x)===i);
};
const now=(S)=>phrases(S).reduce((n,p)=>Math.max(n,p.e),0)||S.dur||0;
const boundaryCuts=S=>{
  const drop=new Set(S.drop||[]),out=[];
  let t=0;
  for(const id of (S.order||ids(S))){
    if(drop.has(id))continue;
    const p=phrases(S).find(x=>x.id===id);
    if(!p)continue;
    if(out.length)t+=Math.max(0,p.s-(phrases(S).find(x=>x.id===out[out.length-1].id)?.e||p.s));
    t+=Math.max(.01,p.e-p.s)+.16;
    out.push({id,t});
  }
  return out.slice(0,-1).map(x=>+x.t.toFixed(2));
};
const ask=async(system,user)=>{
  const text=await askClaudeChat({
    system,
    messages:[{role:"user",content:user}],
    model:"claude-opus-5-5",
    max_tokens:1800
  });
  return parseJSON(text);
};
const routeHeuristic=(text,S)=>{
  const t=String(text).toLowerCase();
  if(/дубл|повтор|лучше[еий] дубл/.test(t))return{fn:1,params:{}};
  if(/сократ|короч|секунд|длин/.test(t)){
    const m=t.match(/(\d+(?:[.,]\d+)?)\s*(?:с|сек|секунд)/);
    return{fn:2,params:m?Number(m[1].replace(",",".")):15};
  }
  if(/3\s*(?:рол|рил|reel)|рилс|разбей/.test(t))return{fn:3,params:{}};
  if(/нарез|сцен/.test(t)&&/скач|загруз/.test(t))return{fn:5,params:{picks:[]}};
  if(/нарез|сцен/.test(t))return{fn:4,params:{}};
  if(/интро|плашк|анимац/.test(t))return{fn:6,params:{}};
  if(/субтит|караоке|неон|кинемат|стил/.test(t))return{fn:7,params:(t.match(/неон|karaoke|караоке|classic|wv2|bnc|typw/)||[""])[0]};
  if(/переход|склейк|зум|штор|глитч|жидк/.test(t)){
    const kind=/глитч/.test(t)?"glitch":/штор/.test(t)?"wipe":/жидк/.test(t)?"mix":"zoom";
    return{fn:8,params:kind};
  }
  if(/реклам|vlog|подкаст|кино|cinema|adhd|спокой|calm|темп/.test(t)){
    const etype=/реклам/.test(t)?"ad":/vlog/.test(t)?"vlog":/подкаст/.test(t)?"podcast":/кино|cinema/.test(t)?"cinema":/спокой|calm/.test(t)?"calm":"adhd";
    return{fn:9,params:etype};
  }
  if(/перестав|поряд|начало|конец/.test(t))return{fn:0,params:{description:text}};
  return null;
};

export async function route(text,S,curFn){
  const h=routeHeuristic(text,S);
  try{
    const r=await ask(
      `Ты маршрутизатор функций видеомонтажа. Ответь только JSON без markdown.
Функции: 0 перестановка фраз, 1 лучшие дубли, 2 сокращение до секунд, 3 три reels, 4 нарезка сцен, 5 скачать сцены, 6 сцены-анимации и интро, 7 стиль субтитров, 8 переходы, 9 тип монтажа.
Правила: «переставь конец в начало»=0, «оставь лучшие дубли»=1, «сделай секунд на двадцать»=2, «покажи субтитры неон»=7, «поставь глитч на склейки»=8, «сделай как в рекламе»=9.
Для неизвестной правки графики верни {"fn":-1}.
Формат {"fn":0..9 или -1,"params":...}. Для 2 params число секунд; 5 params {"picks":[номера]}; 7 строка стиля; 8 вид zoom|wipe|glitch|mix; 9 тип ad|adhd|cinema|vlog|podcast|calm; 0 описание.`,
      `Команда: ${text}\nТекущий экран: ${curFn}\nДанные: ${j({dur:S.dur,phr:S.phr?.slice(0,80),scenes:S.scenes||S.an?.scenes||[]})}`
    );
    if(r&&Number.isFinite(Number(r.fn)))return r;
  }catch{}
  return h||{fn:-1};
}

const opSystem=`Ты монтажёр коротких видео. Ответь только JSON без markdown.
Нужно вернуть объект {"patch":{},"anim":{"before":{},"after":{},"badge":"..."}}.
Не меняй лишние поля. id фраз бери только из переданного списка.`;

export async function runOp(fn,params,S){
  const P=phrases(S),all=ids(S),oldDur=now(S);
  if(fn===4){
    const raw=S.an?.scenes||[];
    const scenes=raw.length?raw.map((x,i)=>({s:+x.s||0,e:+x.e||oldDur,label:x.what||`Сцена ${i+1}`,color:COLORS[i%COLORS.length]})):
      P.map((p,i)=>({s:p.s,e:p.e,label:p.text,color:COLORS[i%COLORS.length]}));
    return{patch:{scenes,pick:scenes.map((_,i)=>i)},anim:{fn:4,before:{scenes:S.scenes||[]},after:{scenes},badge:`Найдено ${scenes.length} сцен`}};
  }
  if(fn===5){
    const sc=S.scenes||[];
    let picks=params?.picks||[];
    if(!picks.length)picks=S.pick?.length?S.pick:sc.map((_,i)=>i);
    picks=uniq(picks).map(x=>x>=1&&x<=sc.length?x-1:x).filter(x=>x>=0&&x<sc.length);
    return{patch:{pick:picks},anim:{fn:5,before:{picks:S.pick||[]},after:{picks},badge:`Скачивание · ${picks.length} файла MP4`}};
  }
  if(fn===7){
    const style=String(params||"karaoke").toLowerCase().replace("караоке","karaoke");
    return{patch:{subStyle:style},anim:{fn:7,before:{style:S.subStyle||"karaoke"},after:{style},badge:`Субтитры · ${style}`}};
  }
  if(fn===8){
    const kind=typeof params==="string"?params:(params?.kind||"zoom");
    const cuts=boundaryCuts(S);
    return{patch:{trans:kind},anim:{fn:8,before:{kind:S.trans||null},after:{kind,cuts},badge:`Переходы · ${kind}`}};
  }
  if(fn===9){
    const etype=typeof params==="string"?params:(params?.etype||"vlog");
    const cuts=boundaryCuts(S),tempo=+(cuts.length/Math.max(oldDur,.1)).toFixed(2);
    return{patch:{etype},anim:{fn:9,before:{etype:S.etype||null},after:{etype,cuts,tempo},badge:`${etype} · ${tempo} склейки/с`}};
  }
  const context={dur:oldDur,phr:P,order:S.order||all,drop:S.drop||[],cuts:S.cuts||[],reels:S.reels||null};
  let schema="";
  if(fn===0)schema=`Новая перестановка всех id в order. params=${j(params)}`;
  if(fn===1)schema=`Найди повторы мысли. Верни groups:[{ids:[...],best:id,scores:{id:0..100}}], а drop — все ids кроме best в каждой группе. Остальные не выбрасывай.`;
  if(fn===2)schema=`Сократи ролик до ${Number(params)||15} секунд, сохрани смысл. Верни dropIds и итоговую dur не больше цели.`;
  if(fn===3)schema=`Раздели все фразы на 3 законченных смысловых группы, groups:[[ids],[ids],[ids]], каждый id ровно один раз.`;
  if(fn===6)schema=`Напиши короткое интро по смыслу ролика: intro:{title,sub}, title до 28 символов, sub до 42.`;
  const r=await ask(opSystem,`${schema}\nИсходные данные:\n${j(context)}`);
  let patch={},before={},after={};
  if(fn===0){
    const order=normOrder(r.order||r.after?.order,S);
    patch={order};before={order:S.order||all};after={order};
  }else if(fn===1){
    const groups=(r.groups||r.after?.groups||[]).map(g=>({ids:uniq(g.ids),best:Number(g.best),scores:g.scores||{}}));
    const drop=uniq(r.drop||r.after?.drop||groups.flatMap(g=>g.ids.filter(x=>x!==g.best)));
    patch={drop};before={groups:[]};after={drop};before.groups=groups;
  }else if(fn===2){
    const dropIds=uniq(r.dropIds||r.after?.dropIds);
    const dur=Number(r.dur||r.after?.dur)||Math.min(Number(params)||15,oldDur);
    patch={drop:uniq([...(S.drop||[]),...dropIds])};
    before={dur:oldDur};after={dur,dropIds};
  }else if(fn===3){
    const groups=(r.groups||r.after?.groups||[]).map(uniq);
    patch={reels:groups};before={};after={groups};
  }else if(fn===6){
    const intro=r.intro||r.after?.intro||{title:"Главное за минуту",sub:"Смотри до конца"};
    patch={intro};before={intro:S.intro||null};after={intro};
  }
  const labels={0:"Порядок фраз обновлён",1:"Лучшие дубли оставлены",2:`Длина · ${after.dur||Math.min(Number(params)||15,oldDur).toFixed(1)} с`,3:"3 ГОТОВЫХ REELS",6:"Интро и текст-плашка готовы"};
  return{patch,anim:{fn,before,after,badge:labels[fn]||"Готово"}};
}
