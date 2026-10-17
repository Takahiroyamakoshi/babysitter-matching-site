import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {start} from './server.mjs';
import {scheduleFields,withinAvailability,syntheticName} from './profile-domain.mjs';
const slot={sitterId:'sitter-aya',start:'2026-11-20T10:00:00+09:00',end:'2026-11-20T13:00:00+09:00',children:[{birthDate:'2021-05-10',relation:'保護者の子',care:'通常保育'}],transportAmount:500,acceptTransport:true,acceptCancellation:true};
async function setup(t){
 const dir=await mkdtemp(path.join(tmpdir(),'next-core-'));const app=await start({dataFile:path.join(dir,'state.json'),port:0});
 t.after(async()=>{await new Promise(r=>app.server.close(r));await app.store.close()});
 const call=async(route,actor='guardian-demo',input,method='PATCH')=>{
 const response=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/'+route,{method:input?method:'GET',headers:{'x-demo-actor':actor,'content-type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});
 return {status:response.status,...await response.json()};};
 return {...app,call};
}
test('owner projection, stable child revision, replay and privacy',async t=>{
 const {call}=await setup(t);
 assert.equal((await call('me')).user.profileRevision,0);
 assert.ok((await call('bootstrap')).users.every(u=>!('children'in u)&&!('review'in u)));
 const input={name:'赤ちゃん',birthDate:'2026-10-17',expectedRevision:0,operationId:'child'};
 const added=await call('me/children','guardian-demo',input,'POST');assert.equal(added.status,201);
 assert.equal(added.user.profileRevision,1);const child=added.user.children.at(-1);assert.ok(child.id);
 assert.deepEqual(await call('me/children','guardian-demo',input,'POST'),added);
 assert.equal((await call('me/children','guardian-demo',{...input,name:'別内容'},'POST')).code,'IDEMPOTENCY_CONFLICT');
 assert.equal((await call('me/children/'+child.id,'guardian-third',{...input,operationId:'other'})).status,404);
 assert.equal((await call('me','guardian-demo',{name:'a',region:'東京',expectedRevision:0,operationId:'stale'})).code,'PROFILE_CONFLICT');
 assert.equal((await call('me','guardian-demo',{name:'a',region:'東京',role:'sitter',expectedRevision:1,operationId:'escalate'})).status,422);
});
test('displayed price is required; pending quote frozen and current availability rechecked',async t=>{
 const {call,store}=await setup(t);
 assert.equal((await call('requests','guardian-demo',{...slot,operationId:'missing'},'POST')).status,422);
 const created=await call('requests','guardian-demo',{...slot,expectedRate:2200,operationId:'create'},'POST');assert.equal(created.status,201);
 const schedule={weekly:Array(7).fill({startMinute:480,endMinute:1320}),exceptions:{'2026-11-20':null}};
 assert.equal((await call('me/sitter-settings','sitter-aya',{rate:2400,availabilitySchedule:schedule,expectedRevision:0,operationId:'settings'})).status,200);
 assert.equal((await call('requests','guardian-demo',{...slot,expectedRate:2200,operationId:'stale'},'POST')).code,'PRICE_CHANGED');
 const route='requests/'+created.request.id+'/approve',approval={operationId:'approve',acknowledgeTransport:true};
 assert.equal((await call(route,'sitter-aya',approval,'POST')).code,'OUTSIDE_AVAILABILITY');
 delete schedule.exceptions['2026-11-20'];
 await call('me/sitter-settings','sitter-aya',{rate:2400,availabilitySchedule:schedule,expectedRevision:1,operationId:'reopen'});
 const accepted=await call(route,'sitter-aya',approval,'POST');assert.equal(accepted.status,200);assert.equal(accepted.booking.quote.rate,2200);
 assert.equal(store.state.requests[0].quote.rate,2200);
});
test('write failure leaves profile, operation and revision unchanged, retry succeeds',async t=>{
 const {call,store}=await setup(t);const before=structuredClone(store.state);
 const input={name:'編集',region:'千葉',expectedRevision:0,operationId:'retry'};
 store.failWrites=true;assert.equal((await call('me','guardian-demo',input)).status,500);assert.deepEqual(store.state,before);
 store.failWrites=false;assert.equal((await call('me','guardian-demo',input)).user.profileRevision,1);
});

test('profile replay remains the original response after child changes and server restart',async t=>{
 const {call,store,server}=await setup(t);
 const input={name:'a'.repeat(40),region:'東京',expectedRevision:0,operationId:'profile-max'};
 const first=await call('me','guardian-demo',input);assert.equal(first.status,200);
 assert.equal(first.user.name,'a'.repeat(40)+'（合成）');
 const roundtrip=await call('me','guardian-demo',{name:first.user.name,region:'千葉',expectedRevision:1,operationId:'profile-roundtrip'});assert.equal(roundtrip.status,200);
 const added=await call('me/children','guardian-demo',{name:'追加',birthDate:'2020-01-01',expectedRevision:2,operationId:'add-later'},'POST');
 assert.equal(added.status,201);
 await call('me/children/child-demo','guardian-demo',{name:'変更',birthDate:'2020-02-02',expectedRevision:3,operationId:'edit-later'});
 assert.deepEqual(await call('me','guardian-demo',input),first);
 assert.equal(first.user.children[0].birthDate,'2021-05-10');
 const file=store.file;await new Promise(r=>server.close(r));await store.close();
 const restarted=await start({dataFile:file,port:0});t.after(async()=>{await new Promise(r=>restarted.server.close(r));await restarted.store.close()});
 const response=await fetch('http://127.0.0.1:'+restarted.server.address().port+'/api/me',{method:'PATCH',headers:{'x-demo-actor':'guardian-demo','content-type':'application/json'},body:JSON.stringify(input)});
 assert.deepEqual({status:response.status,...await response.json()},first);
});
test('schedule rejects malformed boundaries and uses JST weekdays, exceptions and midnight',()=>{
 const week=Array.from({length:7},()=>null);week[2]={startMinute:1260,endMinute:1440};
 const schedule=scheduleFields({weekly:week,exceptions:{}});
 const sitter={availabilitySchedule:schedule};
 assert.equal(withinAvailability(sitter,'2026-10-20T21:00:00+09:00','2026-10-21T00:00:00+09:00'),true);
 assert.equal(withinAvailability(sitter,'2026-10-20T21:00:00+09:00','2026-10-21T00:15:00+09:00'),false);
 sitter.availabilitySchedule.exceptions['2026-10-20']=null;
 assert.equal(withinAvailability(sitter,'2026-10-20T21:00:00+09:00','2026-10-21T00:00:00+09:00'),false);
 delete sitter.availabilitySchedule.exceptions['2026-10-20'];
 assert.equal(withinAvailability({availability:{startMinute:480,endMinute:1320}},'2026-10-20T08:00:00+09:00','2026-10-20T11:00:00+09:00'),true);
 assert.equal(withinAvailability({},'2026-10-20T21:00:00+09:00','2026-10-21T00:00:00+09:00'),true);
 for(const entry of [{startMinute:481,endMinute:600},{startMinute:600,endMinute:600},{startMinute:'480',endMinute:600},{startMinute:0,endMinute:1455},{startMinute:-15,endMinute:600},{startMinute:0,endMinute:600,extra:true}]){
 assert.throws(()=>scheduleFields({weekly:Array(7).fill(entry),exceptions:{}}));
 }
 for(const value of [{weekly:[],exceptions:{}},{weekly:week,exceptions:{'2026-02-30':null}},{weekly:week,exceptions:[]},{weekly:week,exceptions:{},extra:1}])assert.throws(()=>scheduleFields(value));
 assert.equal(syntheticName('編集（合成）（合成）'),'編集（合成）');assert.throws(()=>syntheticName('（合成）'));
});
test('role, date, allowlist, concurrent revision, child limit and newly registered sitter stay bounded',async t=>{
 const {call,store}=await setup(t);
 const child={name:'合成児',birthDate:'2020-01-01',expectedRevision:0,operationId:'c'};
 assert.equal((await call('me/children','sitter-aya',child,'POST')).status,403);
 assert.equal((await call('me/sitter-settings','guardian-demo',{rate:2000,expectedRevision:0,operationId:'s'})).status,403);
 for(const birthDate of ['2026-02-30','1899-12-31','2999-01-01'])assert.equal((await call('me/children','guardian-demo',{...child,birthDate},'POST')).status,422);
 for(const key of ['id','role','children','review','qualifications','ageMonths','capacity','multiScenario','available','transport'])assert.equal((await call('me','guardian-demo',{name:'x',region:'東京',expectedRevision:0,operationId:'p-'+key,[key]:true})).status,422);
 const results=await Promise.all(['one','two'].map(operationId=>call('me','guardian-demo',{name:operationId,region:'東京',expectedRevision:0,operationId})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const input={name:'new',role:'sitter'};const registered=await call('register','guardian-demo',input,'POST');assert.equal(registered.status,201);
 const settings={rate:3000,availabilitySchedule:{weekly:Array(7).fill({startMinute:0,endMinute:1440}),exceptions:{}},expectedRevision:0,operationId:'new-settings'};
 const saved=await call('me/sitter-settings',registered.user.id,settings);assert.equal(saved.user.listingReady,false);
 assert.equal(store.state.users.find(u=>u.id===registered.user.id).available,false);
 assert.equal((await call('quotes','guardian-demo',{...slot,sitterId:registered.user.id},'POST')).code,'SITTER_NOT_READY');
 const guardian=store.state.users.find(u=>u.id==='guardian-demo');guardian.children=Array.from({length:12},(_,i)=>({id:'c'+i,name:'c',birthDate:'2020-01-01'}));
 assert.equal((await call('me/children','guardian-demo',{...child,expectedRevision:1},'POST')).code,'CHILD_LIMIT');
});

test('search/create share weekly and exception rules; child/profile changes and closing after confirmation preserve snapshots',async t=>{
 const {call,store}=await setup(t);
 const params=new URLSearchParams({region:'東京',start:slot.start,end:slot.end,children:JSON.stringify(slot.children)});
 const candidates=async()=> (await call('search?'+params)).sitters.map(u=>u.id);
 assert.ok((await candidates()).includes('sitter-aya'));
 const weekly=Array(7).fill({startMinute:480,endMinute:1320}),settings={rate:2200,availabilitySchedule:{weekly,exceptions:{'2026-11-20':null}},expectedRevision:0,operationId:'closed'};
 await call('me/sitter-settings','sitter-aya',settings);
 assert.equal((await candidates()).includes('sitter-aya'),false);
 assert.equal((await call('requests','guardian-demo',{...slot,expectedRate:2200,operationId:'closed-request'},'POST')).code,'OUTSIDE_AVAILABILITY');
 await call('me/sitter-settings','sitter-aya',{...settings,expectedRevision:1,operationId:'open',availabilitySchedule:{weekly,exceptions:{'2026-11-20':{startMinute:600,endMinute:780}}}});
 assert.ok((await candidates()).includes('sitter-aya'));
 const made=await call('requests','guardian-demo',{...slot,expectedRate:2200,operationId:'frozen'},'POST');
 const confirmed=await call('requests/'+made.request.id+'/approve','sitter-aya',{operationId:'a',acknowledgeTransport:true},'POST');
 const before=structuredClone(confirmed.booking);
 await call('me/children/child-demo','guardian-demo',{name:'変更児',birthDate:'2020-01-01',expectedRevision:0,operationId:'change-child'});
 await call('me/sitter-settings','sitter-aya',{...settings,rate:1800,expectedRevision:2,operationId:'close-after'});
 assert.deepEqual(store.state.bookings[0],before);assert.equal(store.state.requests[0].status,'confirmed');
 assert.deepEqual(store.state.requests[0].children,slot.children);
 assert.equal((await call('requests','guardian-demo',{...slot,expectedRate:2200,operationId:'lowered'},'POST')).code,'PRICE_CHANGED');
 for(const expectedRate of ['2200',null,2200.5])assert.equal((await call('requests','guardian-demo',{...slot,expectedRate,operationId:'invalid-'+expectedRate},'POST')).status,422);
});
