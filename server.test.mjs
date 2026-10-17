import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fixture, quote, Store, start } from './server.mjs';

const fixed=()=>new Date('2026-10-01T00:00:00.000Z');
const good=(overrides={})=>({start:'2026-10-20T10:00:00+09:00',end:'2026-10-20T13:00:00+09:00',serviceType:'normal',children:[{birthDate:'2021-05-10',relation:'保護者の子',care:'通常保育'}],...overrides});
const aya=()=>fixture().users.find(x=>x.id==='sitter-aya');

test('server quote ignores client price and calculates night and 15% fee',()=>{
  const q=quote(good({start:'2026-10-20T20:00:00+09:00',end:'2026-10-20T23:00:00+09:00',rate:1,guardianTotal:1,transportAmount:800}),aya(),fixed).quote;
  assert.equal(q.service,7480,JSON.stringify(q)); // 3h base + 2h of 20% night for one child
  assert.equal(q.fee,1122);
  assert.equal(q.guardianTotal,8280);
});

test('age, medical, duration and 3-child scenario gates reject before a quote',()=>{
  assert.throws(()=>quote(good({children:[{birthDate:'2026-06-01',relation:'保護者の子',care:'通常保育'}]}),aya(),fixed),/対象児/);
  assert.throws(()=>quote(good({medical:true}),aya(),fixed),/病児/);
  assert.throws(()=>quote(good({end:'2026-10-20T12:45:00+09:00'}),aya(),fixed),/最低3時間/);
  const yui=fixture().users.find(x=>x.id==='sitter-yui');
  assert.throws(()=>quote(good({children:Array.from({length:3},()=>({birthDate:'2021-05-10',relation:'保護者の子',care:'通常保育'}))}),yui,fixed),/人数条件/);
});

test('atomic store retains existing in-memory state on write failure and locks the path',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-store-')), file=path.join(dir,'state.json');
  const first=new Store(file); await first.init();
  const second=new Store(file); await assert.rejects(second.init(),/既に起動/);
  const before=first.state.users.length; first.failWrites=true;
  await assert.rejects(first.mutate(s=>s.users.push({id:'x'})),/injected write failure/);
  assert.equal(first.state.users.length,before);
  await first.close();
});

test('request creation is idempotent and only its sitter can approve',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-api-')), file=path.join(dir,'state.json');
  const {server,store}=await start({dataFile:file,port:0}); const port=server.address().port;
  const call=async(p,actor,body)=>{const r=await fetch('http://127.0.0.1:'+port+p,{method:'POST',headers:{'content-type':'application/json','x-demo-actor':actor},body:JSON.stringify(body)});return [r,await r.json()]};
  const input={...good(),sitterId:'sitter-aya',expectedRate:2200,acceptCancellation:true,transportAmount:500,acceptTransport:true,operationId:'request-1'};
  const [one,a]=await call('/api/requests','guardian-demo',input); assert.equal(one.status,201);
  const [two,b]=await call('/api/requests','guardian-demo',input); assert.equal(two.status,201); assert.equal(a.request.id,b.request.id);
  const [forbidden]=await call('/api/requests/'+a.request.id+'/approve','sitter-yui',{operationId:'wrong'}); assert.equal(forbidden.status,403);
  const [approved,c]=await call('/api/requests/'+a.request.id+'/approve','sitter-aya',{operationId:'approve-1',acknowledgeTransport:true}); assert.equal(approved.status,200);assert.equal(c.booking.status,'confirmed');
  await new Promise(resolve=>server.close(resolve));await store.close();
});

test('unknown Host and cross-origin mutations are refused',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-host-')), file=path.join(dir,'state.json');
  const {server,store}=await start({dataFile:file,port:0}); const port=server.address().port;
  const r=await fetch('http://127.0.0.1:'+port+'/api/register',{method:'POST',headers:{'content-type':'application/json','host':'example.test','origin':'https://example.test'},body:'{}'});
  assert.equal(r.status,403);await new Promise(resolve=>server.close(resolve));await store.close();
});

test('approval rechecks persisted medical flags and refuses a tampered pending request',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-medical-')), file=path.join(dir,'state.json');
  const {server,store}=await start({dataFile:file,port:0}), port=server.address().port;
  const call=async(p,actor,body)=>{const r=await fetch('http://127.0.0.1:'+port+p,{method:'POST',headers:{'content-type':'application/json','x-demo-actor':actor},body:JSON.stringify(body)});return [r,await r.json()]};
  const [created,data]=await call('/api/requests','guardian-demo',{...good(),sitterId:'sitter-aya',expectedRate:2200,acceptCancellation:true,transportAmount:500,acceptTransport:true,operationId:'medical-request'});
  assert.equal(created.status,201); store.state.requests[0].medical=true;
  const [approval]=await call('/api/requests/'+data.request.id+'/approve','sitter-aya',{operationId:'medical-approve',acknowledgeTransport:true});
  assert.equal(approval.status,422); assert.equal(store.state.requests[0].status,'pending');
  await new Promise(resolve=>server.close(resolve));await store.close();
});

test('travel buffer allows exactly 30 minutes and refuses a closer confirmed-slot request',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-buffer-')), file=path.join(dir,'state.json');
  const {server,store}=await start({dataFile:file,port:0}), port=server.address().port;
  const call=async(p,actor,body)=>{const r=await fetch('http://127.0.0.1:'+port+p,{method:'POST',headers:{'content-type':'application/json','x-demo-actor':actor},body:JSON.stringify(body)});return [r,await r.json()]};
  const make=async(start,end,key)=>{const [r,d]=await call('/api/requests','guardian-demo',{...good({start,end}),sitterId:'sitter-aya',expectedRate:2200,acceptCancellation:true,transportAmount:500,acceptTransport:true,operationId:key});assert.equal(r.status,201);return d.request;};
  const first=await make('2026-10-20T10:00:00+09:00','2026-10-20T13:00:00+09:00','b1');
  assert.equal((await call('/api/requests/'+first.id+'/approve','sitter-aya',{operationId:'a1',acknowledgeTransport:true}))[0].status,200);
  const exact=await make('2026-10-20T13:30:00+09:00','2026-10-20T16:30:00+09:00','b2');
  assert.equal((await call('/api/requests/'+exact.id+'/approve','sitter-aya',{operationId:'a2',acknowledgeTransport:true}))[0].status,200);
  const [near]=await call('/api/requests','guardian-demo',{...good({start:'2026-10-20T16:45:00+09:00',end:'2026-10-20T19:45:00+09:00'}),sitterId:'sitter-aya',expectedRate:2200,acceptCancellation:true,transportAmount:500,acceptTransport:true,operationId:'b3'});
  assert.equal(near.status,409);
  await new Promise(resolve=>server.close(resolve));await store.close();
});

test('search rejects medical flags and applies qualification and rate filters',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-search-')), file=path.join(dir,'state.json');
  const {server,store}=await start({dataFile:file,port:0}), port=server.address().port;
  const base='region=%E6%9D%B1%E4%BA%AC&start=2026-10-20T10%3A00%3A00%2B09%3A00&end=2026-10-20T13%3A00%3A00%2B09%3A00&children='+encodeURIComponent(JSON.stringify(good().children));
  const medical=await fetch('http://127.0.0.1:'+port+'/api/search?'+base+'&medical=true',{headers:{'x-demo-actor':'guardian-demo'}});
  assert.equal(medical.status,422);
  const filtered=await fetch('http://127.0.0.1:'+port+'/api/search?'+base+'&qualification='+encodeURIComponent('幼稚園教諭')+'&maxRate=2000',{headers:{'x-demo-actor':'guardian-demo'}});
  assert.equal((await filtered.json()).sitters[0].id,'sitter-yui');
  await new Promise(resolve=>server.close(resolve));await store.close();
});


test('transport is pending without an explicit proposal; zero is explicit, invalid types rejected',()=>{
  const pending=quote(good(),aya(),fixed).quote;
  assert.equal(pending.transport,null); assert.equal(pending.guardianTotal,null);
  assert.equal(pending.transportStatus,'pending'); assert.equal(pending.service,6600);
  for(const amount of [0,500]) {
    const q=quote(good({transportAmount:amount}),aya(),fixed).quote;
    assert.equal(q.transport,amount); assert.equal(q.guardianTotal,6600+amount);
  }
  for(const amount of [-1,1.5,'500','',null,NaN,Infinity]) {
    assert.throws(()=>quote(good({transportAmount:amount}),aya(),fixed),/交通費/);
  }
});

test('common search validation precedes filters and distinguishes valid empty results',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-search-validation-'));
  const {server,store}=await start({dataFile:path.join(dir,'state.json'),port:0});
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await store.close()});
  const search=async(overrides={})=>{
    const input=good(overrides), params=new URLSearchParams({region:'千葉',start:input.start,end:input.end,children:JSON.stringify(input.children)});
    const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/search?'+params,{headers:{'x-demo-actor':'guardian-demo'}});
    return [r.status,await r.json()];
  };
  const [invalid,data]=await search({end:'2026-10-20T12:45:00+09:00'});
  assert.equal(invalid,422);assert.match(data.message,/最低3時間/);
  const [valid,empty]=await search(); assert.equal(valid,200); assert.deepEqual(empty.sitters,[]);
  assert.equal((await search({children:Array.from({length:4},()=>good().children[0])}))[0],422);
});


async function testApi(t) {
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-ux-'));
  const runtime=await start({dataFile:path.join(dir,'state.json'),port:0});
  t.after(async()=>{await new Promise(resolve=>runtime.server.close(resolve));await runtime.store.close()});
  const call=async(route,actor,body)=>{
    const response=await fetch('http://127.0.0.1:'+runtime.server.address().port+route,{method:'POST',headers:{'content-type':'application/json','x-demo-actor':actor},body:JSON.stringify(body)});
    return {status:response.status,data:await response.json()};
  };
  return {...runtime,call};
}

test('new formal requests and approvals require both transport confirmations and preserve proposed 500',async t=>{
  const {store,call}=await testApi(t);
  const input={...good(),sitterId:'sitter-aya',expectedRate:2200,acceptCancellation:true};
  for(const [key,fields] of Object.entries({missing:{},unconfirmed:{transportAmount:500},negative:{transportAmount:-1,acceptTransport:true},string:{transportAmount:'500',acceptTransport:true}})) {
    const result=await call('/api/requests','guardian-demo',{...input,...fields,operationId:key});assert.equal(result.status,422);
  }
  assert.equal(store.state.requests.length,0);
  const proposed={...input,transportAmount:500,acceptTransport:true,operationId:'new'};
  const created=await call('/api/requests','guardian-demo',proposed);assert.equal(created.status,201);
  assert.equal(created.data.request.quote.guardianTotal,7100);
  assert.deepEqual(created.data.request.transportProposal,{amount:500,guardianAccepted:true});
  const route='/api/requests/'+created.data.request.id+'/approve';
  assert.equal((await call(route,'sitter-aya',{operationId:'unchecked'})).status,422);
  assert.equal(store.state.bookings.length,0);
  store.state.users.find(u=>u.id==='sitter-aya').transport=9999;
  const approval={operationId:'approved',acknowledgeTransport:true};
  const confirmed=await call(route,'sitter-aya',approval);assert.equal(confirmed.status,200);
  assert.equal(confirmed.data.booking.quote.transport,500);
  assert.equal(confirmed.data.booking.transportProposal.sitterAcknowledged,true);
  assert.deepEqual(confirmed.data.booking.children,good().children);
  assert.deepEqual((await call(route,'sitter-aya',approval)).data,confirmed.data);
  assert.equal((await call(route,'sitter-aya',{...approval,acknowledgeTransport:false})).status,409);
  assert.equal((await call('/api/requests','guardian-demo',{...proposed,transportAmount:0})).status,409);
  assert.equal(store.state.bookings.length,1);
});

test('schema1 old pending, bookings and successful operations survive restart without new gates',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-legacy-')),file=path.join(dir,'state.json');
  const store=new Store(file);await store.init();
  const oldInput={...good(),sitterId:'sitter-aya',acceptCancellation:true,operationId:'old-request'};
  const oldQuote={...quote(good({transportAmount:800}),aya(),fixed).quote};delete oldQuote.transportStatus;
  const old={id:'legacy-pending',guardianId:'guardian-demo',sitterId:'sitter-aya',status:'pending',createdAt:'2026-10-17T00:00:00Z',start:good().start,end:good().end,children:good().children,serviceType:'normal',expiresAt:'2026-10-20T01:00:00Z',ruleVersion:'local-demo-0.1',quote:oldQuote};
  const confirmed={...old,id:'legacy-confirmed',status:'confirmed',start:'2026-10-21T10:00:00+09:00',end:'2026-10-21T13:00:00+09:00'};
  const booking={id:'legacy-booking',requestId:confirmed.id,sitterId:'sitter-aya',guardianId:'guardian-demo',status:'confirmed',start:confirmed.start,end:confirmed.end,quote:oldQuote,ruleVersion:'local-demo-0.1'};
  await store.mutate(s=>{
    s.requests.push(old,confirmed);s.bookings.push(booking);
    s.operations['guardian-demo:old-request']={fingerprint:JSON.stringify({...oldInput,guardianId:'guardian-demo'}),result:old};
    s.operations['sitter-aya:old-approved']={fingerprint:JSON.stringify({request:confirmed.id}),result:{request:confirmed,booking}};
    s.users.find(u=>u.id==='sitter-aya').transport=1500;
  });await store.close();
  const runtime=await start({dataFile:file,port:0});
  t.after(async()=>{await new Promise(resolve=>runtime.server.close(resolve));await runtime.store.close()});
  const post=async(route,actor,data)=>{const response=await fetch('http://127.0.0.1:'+runtime.server.address().port+route,{method:'POST',headers:{'content-type':'application/json','x-demo-actor':actor},body:JSON.stringify(data)});return {status:response.status,data:await response.json()}};
  const replay=await post('/api/requests','guardian-demo',oldInput);assert.equal(replay.status,201);assert.deepEqual(replay.data.request,old);
  assert.equal((await post('/api/requests','guardian-demo',{...oldInput,acceptCancellation:false})).status,409);
  const approvalReplay=await post('/api/requests/'+confirmed.id+'/approve','sitter-aya',{operationId:'old-approved'});
  assert.equal(approvalReplay.status,200);assert.deepEqual(approvalReplay.data.booking,booking);
  const pendingApproval=await post('/api/requests/'+old.id+'/approve','sitter-aya',{operationId:'old-pending-approve'});
  assert.equal(pendingApproval.status,200);assert.equal(pendingApproval.data.booking.quote.transport,800);
  assert.equal(pendingApproval.data.booking.quote.guardianTotal,7400);
});

test('invalid child structures and impossible dates are input errors before empty-region filtering',async t=>{
  const {server}=await testApi(t);
  for(const children of ['{', 'null','{}','[null]',JSON.stringify([{birthDate:20210510,relation:'保護者の子',care:'通常保育'}]),JSON.stringify([{birthDate:'2021-02-30',relation:'保護者の子',care:'通常保育'}])]) {
    const params=new URLSearchParams({region:'千葉',start:good().start,end:good().end,children});
    const result=await fetch('http://127.0.0.1:'+server.address().port+'/api/search?'+params,{headers:{'x-demo-actor':'guardian-demo'}});
    assert.equal(result.status,422,children);
  }
  assert.throws(()=>quote(good({start:'2027-02-30T10:00:00+09:00',end:'2027-02-30T13:00:00+09:00'}),aya(),fixed),/実在/);
});
