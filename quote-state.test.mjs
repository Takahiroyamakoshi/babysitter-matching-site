import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateKey,invalidateEstimate,canSubmitEstimate,QuoteGuard,transportInput} from './src/quote-state.mjs';

test('every child, time, actor, sitter and transport participates in estimate identity',()=>{
  const original={sitterId:'aya',start:'a',end:'b',children:[{birthDate:'2021-01-01'},{birthDate:'2022-02-02'}]};
  const key=estimateKey('guardian',original);
  for(const change of [{sitterId:'yui'},{start:'c'},{end:'c'},{children:[original.children[0],{birthDate:'2023-03-03'}]},{transportAmount:0}])
    assert.notEqual(estimateKey('guardian',{...original,...change}),key);
  assert.notEqual(estimateKey('other',original),key);
});
test('condition edits and recalculation revoke quote and both consents',()=>{
  const confirmed={quote:{transport:500,guardianTotal:7100},quoteKey:'current',acceptCancellation:true,acceptTransport:true};
  assert.equal(canSubmitEstimate(confirmed,'current'),true);
  assert.equal(canSubmitEstimate(confirmed,'changed'),false);
  assert.equal(canSubmitEstimate({...confirmed,quote:{transport:null,guardianTotal:null}},'current'),false);
  const edited=invalidateEstimate();
  assert.equal(edited.quote,null);assert.equal(edited.acceptTransport,false);assert.equal(edited.acceptCancellation,false);
  assert.equal(canSubmitEstimate(edited,'current'),false);
});
test('late responses are discarded after edits, actor switches and repeated same-condition requests',async()=>{
  const guard=new QuoteGuard();
  let resolve; const response=new Promise(r=>resolve=r);
  const old=guard.begin('first');
  const delivery=response.then(()=>guard.isCurrent(old,'second'));
  guard.invalidate();guard.begin('second');resolve();assert.equal(await delivery,false);
  const first=guard.begin('same'),latest=guard.begin('same');
  assert.equal(guard.isCurrent(first,'same'),false);assert.equal(guard.isCurrent(latest,'same'),true);
  guard.invalidate();assert.equal(guard.isCurrent(latest,'same'),false);
});
test('empty transport never becomes zero, explicit zero remains valid',()=>{
  assert.deepEqual(transportInput(''),{});assert.deepEqual(transportInput('  '),{});
  assert.deepEqual(transportInput('0'),{transportAmount:0});assert.deepEqual(transportInput('500'),{transportAmount:500});
});
