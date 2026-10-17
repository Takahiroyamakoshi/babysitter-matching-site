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
  const q=quote(good({start:'2026-10-20T20:00:00+09:00',end:'2026-10-20T23:00:00+09:00',rate:1,guardianTotal:1}),aya(),fixed).quote;
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
  const input={...good(),sitterId:'sitter-aya',acceptCancellation:true,operationId:'request-1'};
  const [one,a]=await call('/api/requests','guardian-demo',input); assert.equal(one.status,201);
  const [two,b]=await call('/api/requests','guardian-demo',input); assert.equal(two.status,201); assert.equal(a.request.id,b.request.id);
  const [forbidden]=await call('/api/requests/'+a.request.id+'/approve','sitter-yui',{operationId:'wrong'}); assert.equal(forbidden.status,403);
  const [approved,c]=await call('/api/requests/'+a.request.id+'/approve','sitter-aya',{operationId:'approve-1'}); assert.equal(approved.status,200);assert.equal(c.booking.status,'confirmed');
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
  const [created,data]=await call('/api/requests','guardian-demo',{...good(),sitterId:'sitter-aya',acceptCancellation:true,operationId:'medical-request'});
  assert.equal(created.status,201); store.state.requests[0].medical=true;
  const [approval]=await call('/api/requests/'+data.request.id+'/approve','sitter-aya',{operationId:'medical-approve'});
  assert.equal(approval.status,422); assert.equal(store.state.requests[0].status,'pending');
  await new Promise(resolve=>server.close(resolve));await store.close();
});

test('travel buffer allows exactly 30 minutes and refuses a closer confirmed-slot request',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sitter-buffer-')), file=path.join(dir,'state.json');
  const {server,store}=await start({dataFile:file,port:0}), port=server.address().port;
  const call=async(p,actor,body)=>{const r=await fetch('http://127.0.0.1:'+port+p,{method:'POST',headers:{'content-type':'application/json','x-demo-actor':actor},body:JSON.stringify(body)});return [r,await r.json()]};
  const make=async(start,end,key)=>{const [r,d]=await call('/api/requests','guardian-demo',{...good({start,end}),sitterId:'sitter-aya',acceptCancellation:true,operationId:key});assert.equal(r.status,201);return d.request;};
  const first=await make('2026-10-20T10:00:00+09:00','2026-10-20T13:00:00+09:00','b1');
  assert.equal((await call('/api/requests/'+first.id+'/approve','sitter-aya',{operationId:'a1'}))[0].status,200);
  const exact=await make('2026-10-20T13:30:00+09:00','2026-10-20T16:30:00+09:00','b2');
  assert.equal((await call('/api/requests/'+exact.id+'/approve','sitter-aya',{operationId:'a2'}))[0].status,200);
  const [near]=await call('/api/requests','guardian-demo',{...good({start:'2026-10-20T16:45:00+09:00',end:'2026-10-20T19:45:00+09:00'}),sitterId:'sitter-aya',acceptCancellation:true,operationId:'b3'});
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
