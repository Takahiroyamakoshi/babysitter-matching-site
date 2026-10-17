import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fixture,Store,start,quote} from './server.mjs';
import {lifecycleCommand as command,lifecycleJobs,bookingView,lifecycleTick,mailOutcome} from './lifecycle-domain.mjs';
const G='guardian-demo',S='sitter-aya',OTHER='guardian-third',DAY=86400000;
function scenario(){
 const s=fixture();let time=Date.parse('2026-10-20T01:00:00Z'),seq=0;
 const clock=()=>new Date(time);
 const children=[{name:'対象児（合成）',birthDate:'2021-05-10',relation:'保護者の子',care:'通常保育'}];
 const q=quote({start:'2026-10-20T01:00:00Z',end:'2026-10-20T04:00:00Z',children,transportAmount:500},s.users.find(u=>u.id===S),()=>new Date('2026-10-01')).quote;
 s.bookings.push({id:'b',guardianId:G,sitterId:S,status:'confirmed',start:'2026-10-20T01:00:00Z',end:'2026-10-20T04:00:00Z',children,quote:q,ruleVersion:'saved-rule',transportProposal:{amount:500,guardianAccepted:true,sitterAcknowledged:true}});
 const act=(action,input={},actor=['approve','dispute'].includes(action)?G:S)=>command(s,actor,'b',action,{operationId:'op-'+(++seq),expectedRevision:s.bookings[0].revision??0,...input},clock);
 const report=()=>{act('start');act('end');return act('report',{summary:'元気に過ごしました（合成）'});};
 return {s,clock,act,report,advance:ms=>time+=ms,set:value=>time=Date.parse(value)};
}
function accept(x,version=1){const o=x.s.outbox.find(o=>o.reportVersion===version&&o.eventType==='report');mailOutcome(x.s,o.id,{status:'accepted'},x.clock);return o;}
test('authorization, ordered events, future start and untrusted fields are rejected',()=>{
 const x=scenario();x.advance(-1);
 assert.throws(()=>x.act('start'),e=>e.code==='START_TOO_EARLY');x.advance(1);
 assert.throws(()=>x.act('end'),e=>e.code==='INVALID_TRANSITION');
 for(const actor of [G,OTHER,'sitter-yui'])assert.throws(()=>x.act('start',{},actor),e=>e.status===403);
 assert.throws(()=>bookingView(x.s,OTHER,'b'),e=>e.status===403);
 assert.throws(()=>x.act('start',{guardianTotal:1}),e=>e.status===422);
 x.report();assert.throws(()=>x.act('approve',{reportVersion:1},S),e=>e.status===403);
 assert.throws(()=>x.act('report',{summary:'x',notifiedAt:'2020-01-01'}),e=>e.status===422);
 assert.equal(x.s.bookings[0].actualStart,'2026-10-20T01:00:00.000Z');
});
test('same operation returns immutable original success; changed content and stale revision conflict',()=>{
 const x=scenario(),input={expectedRevision:0,operationId:'stable'};
 const result=command(x.s,S,'b','start',input,x.clock);x.act('end');
 assert.deepEqual(command(x.s,S,'b','start',input,x.clock),result);
 assert.equal(result.booking.status,'in_progress');
 assert.throws(()=>command(x.s,S,'b','start',{...input,expectedRevision:1},x.clock),e=>e.code==='IDEMPOTENCY_CONFLICT');
 assert.throws(()=>command(x.s,S,'b','report',{expectedRevision:0,operationId:'stale',summary:'x'},x.clock),e=>e.code==='REVISION_CONFLICT');
});
test('web + mail acceptance starts 24h exactly; reads are not required',()=>{
 const x=scenario();x.report();x.advance(DAY*2);lifecycleJobs(x.s,x.clock);assert.equal(x.s.settlements.length,0);
 accept(x);const notified=x.s.reports[0].notifiedAt;assert.equal(notified,x.clock().toISOString());
 x.advance(DAY-1);lifecycleJobs(x.s,x.clock);assert.equal(x.s.settlements.length,0);
 x.advance(1);lifecycleJobs(x.s,x.clock);lifecycleJobs(x.s,x.clock);
 assert.equal(x.s.settlements.length,1);assert.equal(x.s.settlements[0].cause,'timeout');assert.equal(x.s.notifications[0].readAt,null);
});
test('correction invalidates timeout ready, old delayed result cannot notify current version',()=>{
 const x=scenario();x.report();accept(x);x.advance(DAY);lifecycleJobs(x.s,x.clock);
 x.act('report',{summary:'訂正しました（合成）'});assert.equal(x.s.settlements[0].status,'held');
 mailOutcome(x.s,x.s.outbox[0].id,{status:'permanent_failure'},x.clock);
 assert.equal(x.s.reports[1].notifiedAt,null);x.advance(DAY*2);lifecycleJobs(x.s,x.clock);assert.equal(x.s.settlements.filter(s=>s.status==='ready').length,0);
 accept(x,2);x.advance(DAY-1);lifecycleJobs(x.s,x.clock);assert.equal(x.s.settlements.length,1);
 x.advance(1);lifecycleJobs(x.s,x.clock);assert.equal(x.s.settlements.filter(s=>s.status==='ready').length,1);assert.equal(x.s.settlements[1].reportVersion,2);
});
test('permanent late failure suspends automatic ready and successful retry restarts 24h',()=>{
 const x=scenario();x.report();const o=accept(x);x.advance(DAY);lifecycleJobs(x.s,x.clock);
 mailOutcome(x.s,o.id,{status:'permanent_failure'},x.clock);assert.equal(x.s.bookings[0].status,'awaiting_guardian');assert.equal(x.s.settlements[0].status,'held');assert.equal(x.s.reports[0].notifiedAt,null);
 x.advance(DAY);lifecycleJobs(x.s,x.clock);assert.equal(x.s.settlements[0].status,'held');
 accept(x);x.advance(DAY-1);lifecycleJobs(x.s,x.clock);assert.equal(x.s.settlements[0].status,'held');
 x.advance(1);lifecycleJobs(x.s,x.clock);assert.equal(x.s.settlements.length,1);assert.equal(x.s.settlements[0].status,'ready');
});
test('explicit approval works without mail and late permanent failure cannot cancel that consent (A01)',()=>{
 const x=scenario();x.report();x.act('approve',{reportVersion:1});
 mailOutcome(x.s,x.s.outbox[0].id,{status:'permanent_failure'},x.clock);
 assert.equal(x.s.settlements[0].status,'ready');assert.equal(x.s.settlements[0].cause,'explicit');assert.equal(x.s.bookings[0].status,'settlement_ready');
});
test('dispute holds ready and stays sticky through corrections and arbitrary elapsed time',()=>{
 const x=scenario();x.report();x.act('approve',{reportVersion:1});x.act('dispute',{reportVersion:1,reason:'内容を相談したい（合成）'});
 assert.equal(x.s.settlements[0].status,'held');assert.equal(x.s.disputes[0].resolvedAt,null);
 x.act('report',{summary:'相談内容を反映（合成）'});accept(x,2);x.advance(DAY*200);lifecycleJobs(x.s,x.clock);
 assert.equal(x.s.bookings[0].requiresExplicitApproval,true);assert.equal(x.s.reports[1].requiresExplicitApproval,true);assert.equal(x.s.disputes[0].resolvedAt,null);assert.equal(x.s.settlements.filter(s=>s.status==='ready').length,0);
 assert.throws(()=>x.act('approve',{reportVersion:1}),e=>e.code==='REPORT_VERSION_CONFLICT');
 x.act('report',{summary:'再訂正（合成）'});x.advance(DAY*200);lifecycleJobs(x.s,x.clock);assert.equal(x.s.settlements.filter(s=>s.status==='ready').length,0);
 x.act('approve',{reportVersion:3});assert.equal(x.s.disputes[0].resolvedReportVersion,3);assert.equal(x.s.settlements.filter(s=>s.status==='ready').length,1);
});
test('unreported reminder at exact end+24h is unique and late report suppresses unsent mail',()=>{
 const x=scenario();x.act('start');x.act('end');x.advance(DAY-1);lifecycleJobs(x.s,x.clock);assert.equal(x.s.notifications.length,0);
 x.advance(1);lifecycleJobs(x.s,x.clock);lifecycleJobs(x.s,x.clock);assert.equal(x.s.notifications.length,1);assert.equal(x.s.notifications[0].recipientId,S);
 x.act('report',{summary:'遅い報告（合成）'});assert.equal(x.s.outbox[0].status,'suppressed');assert.equal(x.s.settlements.length,0);
});
test('legacy missing snapshot fields never use current profile; saved request fallback only (A02)',()=>{
 const x=scenario();delete x.s.bookings[0].children;delete x.s.bookings[0].transportProposal;delete x.s.bookings[0].ruleVersion;
 x.s.users[0].children=[{id:'new',name:'今の児',birthDate:'2024-01-01'}];
 assert.equal(bookingView(x.s,G,'b').children,null);assert.equal(bookingView(x.s,G,'b').legacySynthetic,true);
 x.s.bookings[0].requestId='r';x.s.requests.push({id:'r',children:[{name:'保存済み児',birthDate:'2021-05-10'}]});
 assert.equal(bookingView(x.s,G,'b').children[0].name,'保存済み児');
 x.s.users.find(u=>u.id===S).rate=9999;const saved=structuredClone(x.s.bookings[0].quote);x.report();x.act('approve',{reportVersion:1});assert.deepEqual(x.s.settlements[0].quote,saved);
});
async function runtime(t){
 const dir=await mkdtemp(path.join(tmpdir(),'lifecycle-')),file=path.join(dir,'state.json'),x=scenario();
 const seed=new Store(file);await seed.init();await seed.mutate(s=>Object.assign(s,x.s));await seed.close();
 const app=await start({dataFile:file,port:0,clock:x.clock,syntheticClock:true,jobInterval:0});
 t.after(async()=>{await new Promise(r=>app.server.close(r));await app.store.close();});
 const call=async(route,actor=S,input)=>{const res=await fetch('http://127.0.0.1:'+app.server.address().port+route,{method:input?'POST':'GET',headers:{'x-demo-actor':actor,'content-type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});return {status:res.status,data:await res.json()}};
 return {...app,...x,file,call};
}
test('20 simultaneous start commands: one winner; original slot remains protected through early end and later lifecycle',async t=>{
 const x=await runtime(t);const responses=await Promise.all(Array.from({length:20},(_,i)=>x.call('/api/bookings/b/start',S,{operationId:'start-'+i,expectedRevision:0})));
 assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(responses.filter(r=>r.status===409).length,19);
 const original=x.store.state.bookings[0];
 const input={start:'2026-10-20T02:00:00Z',end:'2026-10-20T05:00:00Z',children:original.children,sitterId:S,expectedRate:2200,transportAmount:500,acceptTransport:true,acceptCancellation:true};
 for(const [i,status] of ['in_progress','ended','awaiting_guardian','disputed','settlement_ready'].entries()){
  await x.store.mutate(s=>{s.bookings[0].status=status});
  assert.equal((await x.call('/api/requests',G,{...input,operationId:'conflict-'+i})).status,409,status);
 }
});
test('20 concurrent approvals/disputes/job checks preserve revision and at most one active ready',async t=>{
 const x=await runtime(t);await x.store.mutate(s=>{command(s,S,'b','start',{expectedRevision:0,operationId:'s'},x.clock);command(s,S,'b','end',{expectedRevision:1,operationId:'e'},x.clock);command(s,S,'b','report',{expectedRevision:2,operationId:'r',summary:'合成実績'},x.clock)});
 await x.tick();x.advance(DAY);const revision=x.store.state.bookings[0].revision;
 const jobs=Array.from({length:20},(_,i)=>i%3===0?x.store.mutate(s=>lifecycleJobs(s,x.clock)):x.call('/api/bookings/b/'+(i%2?'approve':'dispute'),G,{expectedRevision:revision,operationId:'race-'+i,reportVersion:1,...(i%2?{}:{reason:'合成異議'})}));
 await Promise.all(jobs);assert.ok(x.store.state.settlements.filter(s=>s.status==='ready').length<=1);
 if(x.store.state.bookings[0].openDispute)assert.equal(x.store.state.settlements.filter(s=>s.status==='ready').length,0);
 const current=x.store.state.bookings[0];await x.call('/api/bookings/b/dispute',G,{expectedRevision:current.revision,operationId:'final-dispute',reportVersion:1,reason:'再確認（合成）'});
 assert.equal(x.store.state.settlements.filter(s=>s.status==='ready').length,0);
});
test('write failure is atomic and same-ID retry succeeds; restart retains all state and original operation result',async t=>{
 const x=await runtime(t),before=await readFile(x.file,'utf8'),input={expectedRevision:0,operationId:'retry'};
 x.store.failWrites=true;assert.equal((await x.call('/api/bookings/b/start',S,input)).status,500);assert.equal(x.store.state.bookings[0].status,'confirmed');assert.equal(await readFile(x.file,'utf8'),before);
 x.store.failWrites=false;const first=await x.call('/api/bookings/b/start',S,input);assert.equal(first.status,200);
 await x.call('/api/bookings/b/end',S,{expectedRevision:1,operationId:'end'});await x.call('/api/bookings/b/report',S,{expectedRevision:2,operationId:'report',summary:'保存実績（合成）'});await x.tick();
 const b=x.store.state.bookings[0];await x.call('/api/bookings/b/dispute',G,{expectedRevision:b.revision,operationId:'dispute',reportVersion:1,reason:'保存異議（合成）'});
 const beforeFailure=structuredClone(x.store.state);x.store.failWrites=true;
 assert.equal((await x.call('/api/bookings/b/report',S,{expectedRevision:x.store.state.bookings[0].revision,operationId:'report2',summary:'保存訂正（合成）'})).status,500);assert.deepEqual(x.store.state,beforeFailure);x.store.failWrites=false;
 const saved=structuredClone(x.store.state);await new Promise(r=>x.server.close(r));await x.store.close();
 const restored=new Store(x.file);await restored.init();assert.deepEqual(restored.state,saved);assert.deepEqual(command(restored.state,S,'b','start',input,x.clock),first.data);await restored.close();
});
test('worker retries unknown/failure, durable lease prevents concurrent send, stale version result cannot apply',async t=>{
 const x=await runtime(t);await x.store.mutate(s=>{command(s,S,'b','start',{expectedRevision:0,operationId:'s'},x.clock);command(s,S,'b','end',{expectedRevision:1,operationId:'e'},x.clock);command(s,S,'b','report',{expectedRevision:2,operationId:'r',summary:'合成'},x.clock)});
 let count=0;const bad=async()=>{count++;return {status:'unknown',error:'timeout'}};
 await lifecycleTick(x.store,x.clock,bad);assert.equal(x.store.state.reports[0].notifiedAt,null);assert.equal(count,1);
 await lifecycleTick(x.store,x.clock,bad);assert.equal(count,1);x.advance(60000);
 let release;const result=new Promise(r=>release=r);const pending=lifecycleTick(x.store,x.clock,async()=>{count++;return result});
 // Wait for durable claim without relying on a wall-clock race.
 while(x.store.state.outbox[0].status!=='sending')await new Promise(r=>setImmediate(r));
 await lifecycleTick(x.store,x.clock,bad);assert.equal(count,2);
 await x.store.mutate(s=>command(s,S,'b','report',{expectedRevision:s.bookings[0].revision,operationId:'r2',summary:'訂正合成'},x.clock));
 release({status:'accepted'});await pending;assert.equal(x.store.state.reports[1].notifiedAt,null);
 await lifecycleTick(x.store,x.clock,async()=>({status:'accepted'}));assert.ok(x.store.state.reports[1].notifiedAt);
 const sent=x.store.state.outbox.filter(o=>o.status==='accepted').map(o=>o.attempts);await x.tick();assert.deepEqual(x.store.state.outbox.filter(o=>o.status==='accepted').map(o=>o.attempts),sent);
});
test('notification ACL, current actor replay ACL, synthetic clock label, no clock/fault mutation API',async t=>{
 const x=await runtime(t);await x.store.mutate(s=>{command(s,S,'b','start',{expectedRevision:0,operationId:'s'},x.clock);command(s,S,'b','end',{expectedRevision:1,operationId:'e'},x.clock);command(s,S,'b','report',{expectedRevision:2,operationId:'r',summary:'合成'},x.clock)});
 const n=x.store.state.notifications[0];assert.equal((await x.call('/api/notifications/'+n.id+'/read',OTHER,{operationId:'read'})).status,404);
 assert.equal((await x.call('/api/notifications/'+n.id+'/read',G,{operationId:'read'})).status,200);
 assert.equal((await x.call('/api/bookings/b',OTHER)).status,403);const bootstrap=(await x.call('/api/bootstrap',G)).data;assert.equal(bootstrap.syntheticClock,true);assert.equal(bootstrap.notifications.length,1);
 assert.equal((await x.call('/api/bootstrap',OTHER)).data.notifications.length,0);
 for(const route of ['/api/testing/clock','/api/testing/mail','/api/clock'])assert.equal((await x.call(route,G,{now:'2030-01-01'})).status,404);
});

test('explicit consent upgrades a timeout ready before delayed permanent mail failure (A01)',()=>{
 const x=scenario();x.report();const o=accept(x);x.advance(DAY);lifecycleJobs(x.s,x.clock);
 x.act('approve',{reportVersion:1});mailOutcome(x.s,o.id,{status:'permanent_failure'},x.clock);
 assert.equal(x.s.settlements[0].status,'ready');assert.equal(x.s.settlements[0].cause,'explicit');assert.equal(x.s.settlements.length,1);
});
test('reapproval of a held version retains hold history and clears current hold reason',()=>{
 const x=scenario();x.report();x.act('approve',{reportVersion:1});x.act('dispute',{reportVersion:1,reason:'相談（合成）'});x.act('approve',{reportVersion:1});
 assert.equal(x.s.settlements[0].status,'ready');assert.equal(x.s.settlements[0].holdReason,null);
 assert.equal(x.s.lifecycleHistory.filter(h=>h.type==='settlement_held').length,1);
});
