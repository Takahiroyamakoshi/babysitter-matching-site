import http from 'node:http';
import { readFile, writeFile, rename, mkdir, open, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const RULE_VERSION = 'local-demo-0.1';
const MAX_RATE = 10000;
const BUFFER_MINUTES = 30;
const loopbackHost = /^(127\.0\.0\.1|localhost)(:\d+)?$/;
const json = (status, body) => ({ status, body });
const err = (status, code, message) => { const e = new Error(message); e.status=status; e.code=code; throw e; };
const clone = (v) => structuredClone(v);
const now = () => new Date();

export function fixture() {
  return {
    schema: 1,
    users: [
      { id:'guardian-demo', role:'guardian', name:'さくら（合成）', region:'東京', children:[{id:'child-demo', name:'はる（合成）', birthDate:'2021-05-10'}] },
      { id:'guardian-third', role:'guardian', name:'テスト保護者（合成）', region:'東京', children:[] },
      { id:'sitter-aya', role:'sitter', name:'あや（合成）', region:'東京', rate:2200, transport:800, qualifications:['保育士'], ageMonths:[6,120], capacity:3, multiScenario:true, review:{qualification:true, training:true, notification:true, initialInsurance:true}, available:true, availability:{startMinute:480,endMinute:1320} },
      { id:'sitter-yui', role:'sitter', name:'ゆい（合成）', region:'東京', rate:1900, transport:600, qualifications:['幼稚園教諭'], ageMonths:[12,120], capacity:2, multiScenario:false, review:{qualification:true, training:true, notification:true, initialInsurance:true}, available:true, availability:{startMinute:480,endMinute:1320} }
    ],
    messages: [], requests: [], bookings: [], operations: {}
  };
}
const isVerified = (s) => !!(s?.review?.qualification && s.review.training && s.review.notification && s.review.initialInsurance && s.available);
const atJst = (iso) => new Date(iso);
const validQuarter = (d) => d.getUTCMinutes()%15===0 && d.getUTCSeconds()===0 && d.getUTCMilliseconds()===0;
function jstParts(iso) { const d=new Date(+new Date(iso)+9*3600000); return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()}; }
function childEligible(birthDate, start) {
  const [year,month,day]=birthDate.split('-').map(Number), service=jstParts(start);
  const calendar=new Date(Date.UTC(year,month-1,day));
  if(!year||!month||!day||calendar.getUTCFullYear()!==year||calendar.getUTCMonth()+1!==month||calendar.getUTCDate()!==day) return false;
  const months=(service.year-year)*12+service.month-month-(service.day<day?1:0);
  if(months<6) return false;
  const endYear=year+(month<4||(month===4&&day===1)?9:10);
  const serviceKey=service.year*10000+service.month*100+service.day;
  return serviceKey<=endYear*10000+331;
}
function ageMonths(birthDate, start) {
  const [year,month,day]=birthDate.split('-').map(Number), d=jstParts(start);
  return (d.year-year)*12+d.month-month-(d.day<day?1:0);
}
function parseSlot(input, clock=now) {
  const {start,end,serviceType='normal', medical=false, medication=false, sick=false, postIllness=false, children=[]}=input;
  const a=atJst(start), b=atJst(end);
  if (serviceType!=='normal' || medical || medication || sick || postIllness) err(422,'SERVICE_UNAVAILABLE','病児・病後児・投薬補助はこのデモでは受付できません。');
  if (!start || !end || Number.isNaN(+a)||Number.isNaN(+b)||a<=clock()||b<=a) err(422,'INVALID_TIME','未来の開始・終了時刻を指定してください。');
  if (!validQuarter(a)||!validQuarter(b)||b-a<3*3600000) err(422,'INVALID_DURATION','通常保育は15分刻みで最低3時間です。');
  if (!Array.isArray(children)||children.length<1||children.length>3) err(422,'INVALID_CHILDREN','対象児は1〜3人です。');
  for (const c of children) if (!c.birthDate||!['保護者の子','きょうだい'].includes(c.relation)||c.care!=='通常保育'||!childEligible(c.birthDate,start)) err(422,'CHILD_NOT_ELIGIBLE','対象児の年齢・関係・保育内容を確認してください。');
  return { start:a.toISOString(), end:b.toISOString(), children };
}
function nightHours(start,end) {
  let total=0, cursor=new Date(start), finish=new Date(end);
  while(cursor<finish) {
    const next=new Date(Math.min(+finish,+cursor+15*60000));
    const h=cursor.getUTCHours(); // inputs carry JST offset, UTC calculation is shifted; use local wall time below
    const jst=(h+9)%24;
    if(jst>=21||jst<8) total+=(next-cursor)/3600000;
    cursor=next;
  }
  return total;
}
export function quote(input, sitter, clock=now) {
  const slot=parseSlot(input,clock);
  if (!isVerified(sitter)) err(422,'SITTER_NOT_READY','このシッターは合成審査確認前です。');
  if(!Number.isInteger(sitter.rate)||sitter.rate<=0||sitter.rate>MAX_RATE||!Number.isInteger(sitter.transport)||sitter.transport<0) err(500,'INVALID_SITTER_PRICING','シッターの合成料金設定が不正です。');
  const count=slot.children.length;
  if (count>sitter.capacity || (count>=2&&!sitter.multiScenario)) err(422,'MULTI_CONDITION_UNMET','この人数条件は合成適合シナリオ外です。');
  for(const c of slot.children) {
    const months=ageMonths(c.birthDate,slot.start);
    if(months<sitter.ageMonths[0]||months>sitter.ageMonths[1]) err(422,'AGE_OUT_OF_RANGE','シッターの対応年齢外です。');
    if(months<12&&!sitter.qualifications.some(q=>q==='保育士'||q==='看護師')) err(422,'INFANT_QUALIFICATION_REQUIRED','1歳未満には保育士または看護師が必要です。');
    if(sitter.qualifications.length===1&&sitter.qualifications[0]==='幼稚園教諭'&&!sitter.review.training) err(422,'TRAINING_REQUIRED','必要研修が未確認です。');
  }
  const hours=(atJst(slot.end)-atJst(slot.start))/3600000;
  const base=sitter.rate*count*hours;
  const night=sitter.rate*count*nightHours(slot.start,slot.end)*.2;
  const service=Math.floor(base+night), fee=Math.floor(service*.15), transport=sitter.transport;
  return {slot, quote:{rate:sitter.rate, children:count, hours, base, nightSurcharge:night, service, fee, takeHome:service-fee, transport, guardianTotal:service+transport, currency:'JPY', note:'税区分・実請求は含まれないローカルデモ見積りです。'}};
}
function withinAvailability(sitter,start,end) {
  const a=new Date(+new Date(start)+9*3600000), b=new Date(+new Date(end)+9*3600000);
  const open=sitter.availability||{startMinute:0,endMinute:1440};
  return a.getUTCFullYear()===b.getUTCFullYear()&&a.getUTCMonth()===b.getUTCMonth()&&a.getUTCDate()===b.getUTCDate()&&a.getUTCHours()*60+a.getUTCMinutes()>=open.startMinute&&b.getUTCHours()*60+b.getUTCMinutes()<=open.endMinute;
}
function conflict(bookings,sitterId,start,end) {
  const a=atJst(start), b=atJst(end);
  return bookings.some(x=>{
    if(x.sitterId!==sitterId||x.status!=='confirmed') return false;
    const gap=Math.max(BUFFER_MINUTES,x.bufferMinutes||0)*60000;
    return !(b+gap<=atJst(x.start)||atJst(x.end)+gap<=a);
  });
}
function expiry(r) { return new Date(Math.min(+new Date(r.createdAt)+86400000,+new Date(r.start))).toISOString(); }
function expireRequests(state, clock=now) {
  for(const r of state.requests) if(r.status==='pending'&&clock()>=new Date(r.expiresAt)) r.status='expired';
}
function operation(state, actor, id, fingerprint, result) {
  if(!id) err(400,'OPERATION_ID_REQUIRED','再試行用operationIdが必要です。');
  const key=actor+':'+id, prior=state.operations[key];
  if(prior) {
    if(prior.fingerprint!==fingerprint) err(409,'IDEMPOTENCY_CONFLICT','同じoperationIdで別内容は送信できません。');
    return prior.result;
  }
  state.operations[key]={fingerprint,result}; return null;
}
function participant(state, actor, sitterId) {
  const user=state.users.find(x=>x.id===actor);
  if(!user) err(401,'UNKNOWN_ACTOR','デモ利用者を選択してください。');
  const sitter=state.users.find(x=>x.id===sitterId&&x.role==='sitter');
  if(!sitter) err(404,'SITTER_NOT_FOUND','シッターが見つかりません。');
  if(user.role!=='guardian'&&user.id!==sitterId) err(403,'NOT_PARTICIPANT','この会話の当事者ではありません。');
  return {user,sitter};
}
export class Store {
  constructor(file, opts={}) { this.file=file; this.lock=file+'.lock'; this.state=null; this.queue=Promise.resolve(); this.failWrites=opts.failWrites||false; this.lockHandle=null; }
  async init() {
    await mkdir(path.dirname(this.file),{recursive:true});
    try { this.lockHandle=await open(this.lock,'wx'); } catch { err(409,'STORE_IN_USE','同じ保存先を使うサーバーが既に起動しています。'); }
    if(existsSync(this.file)) {
      try { this.state=JSON.parse(await readFile(this.file,'utf8')); } catch { err(500,'CORRUPT_STORE','保存データが壊れています。自動初期化はしません。'); }
      if(this.state.schema!==1||!Array.isArray(this.state.users)||!Array.isArray(this.state.messages)||!Array.isArray(this.state.requests)||!Array.isArray(this.state.bookings)||!this.state.operations||typeof this.state.operations!=='object'||this.state.users.some(u=>!u?.id||!u?.role)) err(500,'CORRUPT_STORE','保存データの形式が不正です。');
    } else { this.state=fixture(); await this.persist(this.state); }
  }
  async persist(candidate) {
    if(this.failWrites) throw new Error('injected write failure');
    const temp=this.file+'.tmp';
    await writeFile(temp,JSON.stringify(candidate,null,2),'utf8');
    await rename(temp,this.file);
  }
  async mutate(fn) {
    const job=async()=>{ const candidate=clone(this.state); const result=await fn(candidate); await this.persist(candidate); this.state=candidate; return result; };
    const result=this.queue.then(job,job); this.queue=result.catch(()=>{}); return result;
  }
  async close(){ if(this.lockHandle){ await this.lockHandle.close(); await unlink(this.lock).catch(()=>{}); this.lockHandle=null; } }
}
function listSitters(state, query, clock) {
  const children=query.children?JSON.parse(query.children):[];
  const start=query.start, end=query.end, maxRate=Number(query.maxRate||MAX_RATE);
  if(query.medical==='true'||query.medication==='true'||query.sick==='true'||query.postIllness==='true'||query.serviceType&&query.serviceType!=='normal') err(422,'SERVICE_UNAVAILABLE','病児・病後児・投薬補助はこのデモでは受付できません。');
  if(!start||!end||!children.length) err(422,'SEARCH_CONDITIONS_REQUIRED','日時と対象児を指定してください。');
  return state.users.filter(s=>{
    if(s.role!=='sitter'||!isVerified(s)||s.region!==query.region||s.rate>maxRate||(query.qualification&&!s.qualifications.includes(query.qualification))) return false;
    try { quote({start,end,children,serviceType:query.serviceType||'normal'},s,clock); return withinAvailability(s,start,end)&&!conflict(state.bookings,s.id,start,end); } catch { return false; }
  }).map(publicSitter);
}
const publicSitter=({id,role='sitter',name,region,rate,transport,qualifications,ageMonths,capacity})=>({id,role,name,region,rate,transport,qualifications,ageMonths,capacity});
const body=async(req)=>new Promise((resolve,reject)=>{let data='';req.on('data',x=>{data+=x;if(data.length>100000)reject(new Error('too large'));});req.on('end',()=>{try{resolve(data?JSON.parse(data):{});}catch{reject(Object.assign(new Error('JSON'),{status:400,code:'INVALID_JSON'}));}});});
const send=(res,status,payload)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(payload));};
function security(req) {
  const host=(req.headers.host||'').toLowerCase(); if(!loopbackHost.test(host)) err(400,'HOST_REJECTED','loopback以外のHostは拒否しました。');
  const origin=req.headers.origin; if(origin&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) err(403,'ORIGIN_REJECTED','許可されないOriginです。');
}
export function createHandler(store, clock=now) {
  return async(req,res)=>{
    try {
      security(req);
      const url=new URL(req.url,'http://127.0.0.1:8787'), actor=req.headers['x-demo-actor'];
      if(req.method!=='GET'&&!req.headers['content-type']?.includes('application/json')) err(415,'JSON_REQUIRED','変更はJSONで送信してください。');
      if(url.pathname.startsWith('/api/')&&(!actor||Array.isArray(actor)||!store.state.users.some(u=>u.id===actor))) err(401,'UNKNOWN_ACTOR','デモ利用者を選択してください。');
      if(req.method==='GET'&&url.pathname==='/api/bootstrap') { const result=await store.mutate(s=>{expireRequests(s,clock);return {users:s.users.map(u=>u.role==='sitter'?publicSitter(u):{id:u.id,role:u.role,name:u.name,children:u.children||[]}),requests:s.requests.filter(r=>r.guardianId===actor||r.sitterId===actor),bookings:s.bookings.filter(b=>b.guardianId===actor||b.sitterId===actor)};}); return send(res,200,result); }
      if(req.method==='GET'&&url.pathname==='/api/search') return send(res,200,{sitters:listSitters(store.state,Object.fromEntries(url.searchParams),clock)});
      if(req.method==='GET'&&url.pathname==='/api/messages') { const sitterId=url.searchParams.get('sitterId'), p=participant(store.state,actor,sitterId); const guardianId=p.user.role==='sitter'?url.searchParams.get('guardianId'):actor; if(!guardianId||!store.state.users.some(u=>u.id===guardianId&&u.role==='guardian')) err(422,'GUARDIAN_REQUIRED','会話する保護者を選択してください。'); return send(res,200,{messages:store.state.messages.filter(m=>m.sitterId===sitterId&&m.guardianId===guardianId)}); }
      if(req.method==='POST'&&url.pathname==='/api/register') { const input=await body(req); const r=await store.mutate(s=>{if(!['guardian','sitter'].includes(input.role)||!input.name)err(422,'INVALID_REGISTRATION','役割と表示名を入力してください。'); const id='local-'+randomUUID(); const u=input.role==='guardian'?{id,role:'guardian',name:input.name+'（合成）',region:'東京',children:[]}:{id,role:'sitter',name:input.name+'（合成）',region:'東京',rate:1800,transport:500,qualifications:[],ageMonths:[12,120],capacity:1,multiScenario:false,review:{qualification:false,training:false,notification:false,initialInsurance:false},available:false};s.users.push(u);return u;}); return send(res,201,{user:r,notice:input.role==='sitter'?'新規シッターは合成確認待ちのため検索・受付できません。':'ローカル合成登録を完了しました。'}); }
      if(req.method==='POST'&&url.pathname==='/api/messages') { const input=await body(req); const result=await store.mutate(s=>{const {user,sitter}=participant(s,actor,input.sitterId); if(!input.body?.trim())err(422,'EMPTY_MESSAGE','相談内容を入力してください。'); const fingerprint=JSON.stringify({to:input.sitterId,guardianId:input.guardianId||actor,body:input.body}); const prior=operation(s,actor,input.operationId,fingerprint,null);if(prior)return prior; const guardianId=user.role==='guardian'?actor:input.guardianId; if(user.role==='sitter'&&!guardianId)err(422,'GUARDIAN_REQUIRED','返信先を指定してください。'); const m={id:randomUUID(),sitterId:sitter.id,guardianId,authorId:actor,body:input.body.trim(),createdAt:clock().toISOString()};s.messages.push(m);s.operations[actor+':'+input.operationId].result=m;return m;});return send(res,201,{message:result}); }
      if(req.method==='POST'&&url.pathname==='/api/quotes') { const input=await body(req); const sitter=store.state.users.find(x=>x.id===input.sitterId); if(!sitter)err(404,'SITTER_NOT_FOUND','シッターが見つかりません。'); return send(res,200,quote(input,sitter,clock)); }
      if(req.method==='POST'&&url.pathname==='/api/requests') { const input=await body(req); const result=await store.mutate(s=>{const guardian=s.users.find(x=>x.id===actor&&x.role==='guardian');if(!guardian)err(403,'GUARDIAN_ONLY','保護者だけが正式依頼できます。');const sitter=s.users.find(x=>x.id===input.sitterId);if(!sitter)err(404,'SITTER_NOT_FOUND','シッターが見つかりません。');if(!input.acceptCancellation)err(422,'CANCELLATION_CONSENT_REQUIRED','キャンセル条件への同意が必要です。');const fingerprint=JSON.stringify({...input,guardianId:actor});const prior=operation(s,actor,input.operationId,fingerprint,null);if(prior)return prior;const q=quote(input,sitter,clock);if(!withinAvailability(sitter,q.slot.start,q.slot.end))err(422,'OUTSIDE_AVAILABILITY','合成シッターの空き時間外です。');if(conflict(s.bookings,sitter.id,q.slot.start,q.slot.end))err(409,'SLOT_CONFLICT','成立済み予約と移動余裕が競合します。');const r={id:randomUUID(),guardianId:actor,sitterId:sitter.id,status:'pending',createdAt:clock().toISOString(),start:q.slot.start,end:q.slot.end,children:q.slot.children,expiresAt:'',quote:q.quote,ruleVersion:RULE_VERSION,cancellation:'取消条件（ローカルデモ）: 実行・精算は未実装です。日本時間の利用開始日基準で、前々日以前0%、前日50%、当日100%を保育料の取消料率案とし、返金不能な発生済み実費だけを交通費対象とします。取消料も運営15%・シッター85%の案です。',medical:false};r.expiresAt=expiry(r);s.requests.push(r);s.operations[actor+':'+input.operationId].result=r;return r;});return send(res,201,{request:result}); }
      const decline=url.pathname.match(/^\/api\/requests\/([^/]+)\/decline$/);
      if(req.method==='POST'&&decline) { const input=await body(req); const result=await store.mutate(s=>{expireRequests(s,clock);const r=s.requests.find(x=>x.id===decline[1]);if(!r)err(404,'REQUEST_NOT_FOUND','依頼が見つかりません。');if(r.sitterId!==actor)err(403,'SITTER_ONLY','依頼先シッターだけが辞退できます。');const prior=operation(s,actor,input.operationId,JSON.stringify({request:r.id,action:'decline'}),null);if(prior)return prior;if(r.status!=='pending')err(409,'REQUEST_NOT_PENDING','この依頼は承認待ちではありません。');r.status='declined';s.operations[actor+':'+input.operationId].result=r;return r;});return send(res,200,{request:result}); }
      const approve=url.pathname.match(/^\/api\/requests\/([^/]+)\/approve$/);
      if(req.method==='POST'&&approve) { const input=await body(req);const result=await store.mutate(s=>{expireRequests(s,clock);const r=s.requests.find(x=>x.id===approve[1]);if(!r)err(404,'REQUEST_NOT_FOUND','依頼が見つかりません。');if(r.sitterId!==actor)err(403,'SITTER_ONLY','依頼先シッターだけが承認できます。');const fingerprint=JSON.stringify({request:r.id});const prior=operation(s,actor,input.operationId,fingerprint,null);if(prior)return prior;if(r.status==='expired')err(409,'REQUEST_EXPIRED','この依頼は期限切れです。');if(r.status!=='pending')err(409,'REQUEST_NOT_PENDING','この依頼は承認待ちではありません。');const sitter=s.users.find(x=>x.id===actor);quote({start:r.start,end:r.end,children:r.children,serviceType:'normal'},sitter,clock);if(!withinAvailability(sitter,r.start,r.end))err(422,'OUTSIDE_AVAILABILITY','合成シッターの空き時間外です。');if(conflict(s.bookings,actor,r.start,r.end))err(409,'SLOT_CONFLICT','成立済み予約と移動余裕が競合します。');r.status='confirmed';const b={id:randomUUID(),requestId:r.id,sitterId:actor,guardianId:r.guardianId,status:'confirmed',start:r.start,end:r.end,bufferMinutes:BUFFER_MINUTES,quote:r.quote,ruleVersion:r.ruleVersion};s.bookings.push(b);s.operations[actor+':'+input.operationId].result={request:r,booking:b};return {request:r,booking:b};});return send(res,200,result); }
      if(req.method==='POST'&&url.pathname==='/api/testing/fail-write') return send(res,403,{code:'NOT_AVAILABLE',message:'本番相当の変更APIはありません。'});
      if(req.method!=='GET'&&url.pathname.startsWith('/api/')) err(404,'NOT_IMPLEMENTED','この変更APIは実装されていません。');
      const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
      const safe=path.normalize(file).replace(/^\.\.(\/|\|$)/,'');
      const dist=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist',safe);
      const raw=await readFile(dist); const type=dist.endsWith('.html')?'text/html; charset=utf-8':dist.endsWith('.js')?'text/javascript; charset=utf-8':dist.endsWith('.css')?'text/css; charset=utf-8':'application/octet-stream';
      res.writeHead(200,{'content-type':type});res.end(raw);
    } catch(e) { send(res,e.status||500,{code:e.code||'INTERNAL_ERROR',message:e.message||'予期しないエラーです。'}); }
  };
}
export async function start({dataFile=path.join(path.dirname(fileURLToPath(import.meta.url)),'data','local-demo.json'),port=8787}={}) {
  const store=new Store(dataFile);
  try { await store.init(); const server=http.createServer(createHandler(store)); await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);}); return {server,store}; }
  catch(e) { await store.close(); throw e; }
}
if(process.argv[1]===fileURLToPath(import.meta.url)) start().then(({server,store})=>{
  console.log('Local demo: http://127.0.0.1:8787');
  const stop=()=>server.close(()=>store.close().finally(()=>process.exit(0)));
  process.once('SIGINT',stop); process.once('SIGTERM',stop);
}).catch(e=>{console.error(e.message);process.exitCode=1;});
