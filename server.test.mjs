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
