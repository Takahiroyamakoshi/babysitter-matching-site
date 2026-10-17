import {randomUUID,createHash} from 'node:crypto';
import {allowFields} from './profile-domain.mjs';
const DAY=86400000;
const fail=(status,code,message)=>{throw Object.assign(new Error(message),{status,code})};
const copy=structuredClone;
const stamp=clock=>clock().toISOString();
function collections(s){s.reports??=[];s.notifications??=[];s.outbox??=[];s.settlements??=[];s.lifecycleHistory??=[];s.disputes??=[];s.consents??=[];}
export function bookingFor(s,actor,id){
 const b=s.bookings.find(b=>b.id===id);
 if(!b)fail(404,'BOOKING_NOT_FOUND','予約が見つかりません。');
 if(!s.users.some(u=>u.id===actor)||![b.sitterId,b.guardianId].includes(actor))fail(403,'NOT_PARTICIPANT','予約当事者だけが参照できます。');
 return b;
}
export function bookingView(s,actor,id){
 const b=bookingFor(s,actor,id),r=s.requests.find(r=>r.id===b.requestId);
 // Only persisted booking/request snapshots are usable for legacy data.
 return {...copy(b),revision:b.revision??0,contractVersion:'local-lifecycle-1',children:copy(b.children??r?.children??null),
  legacySynthetic:!b.children||!b.transportProposal?.sitterAcknowledged||!b.ruleVersion||!b.quote?.transportStatus,
  reports:copy((s.reports??[]).filter(r=>r.bookingId===id)),disputes:copy((s.disputes??[]).filter(d=>d.bookingId===id)),
  consents:copy((s.consents??[]).filter(c=>c.bookingId===id)),settlements:copy((s.settlements??[]).filter(x=>x.bookingId===id)),history:copy((s.lifecycleHistory??[]).filter(x=>x.bookingId===id))};
}
function history(s,b,type,actor,at,detail={}){s.lifecycleHistory.push({id:randomUUID(),bookingId:b.id,type,actor,at,...detail});}
function holdReady(s,b,at,reason,automaticOnly=false){
 for(const x of s.settlements)if(x.bookingId===b.id&&x.status==='ready'&&(!automaticOnly||x.cause==='timeout')){x.status='held';x.heldAt=at;x.holdReason=reason;history(s,b,'settlement_held','system',at,{settlementId:x.id,reason});}
}
// Hash only persisted booking/report conditions, never mutable profile projections.
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
function reportConsent(s,b,r,actor,at,input){
 const request=s.requests.find(request=>request.id===b.requestId);
 // JSON normalization matches the persisted representation (including unknown legacy nulls).
 const conditionSnapshot=JSON.parse(JSON.stringify({contractVersion:'local-lifecycle-1',
  booking:{id:b.id,requestId:b.requestId??null,guardianId:b.guardianId,sitterId:b.sitterId,start:b.start,end:b.end,
   serviceType:b.serviceType??request?.serviceType??null,children:copy(b.children??request?.children??null),transportProposal:copy(b.transportProposal??null)},
  report:{id:r.id,version:r.version,summary:r.summary,actualStart:r.actualStart??null,actualEnd:r.actualEnd??null,submittedBy:r.submittedBy,submittedAt:r.submittedAt,requiresExplicitApproval:!!b.requiresExplicitApproval},
  quote:copy(r.quote),ruleVersion:r.ruleVersion??null}));
 const consent={id:randomUUID(),actorId:actor,action:'approve_report',subjectId:r.id,revision:r.version,bookingId:b.id,
  bookingRevision:input.expectedRevision,operationId:input.operationId,acceptedAt:at,conditionSnapshot,
  conditionHash:createHash('sha256').update(JSON.stringify(canonical(conditionSnapshot))).digest('hex'),
  quote:copy(conditionSnapshot.quote),ruleVersion:conditionSnapshot.ruleVersion};
 s.consents.push(consent);return consent;
}
function ready(s,b,r,cause,at,actor,consentId=null){
 let x=s.settlements.find(x=>x.bookingId===b.id&&x.reportVersion===r.version);
 if(x?.status==='ready'&&cause!=='explicit')return;
 if(!Number.isSafeInteger(b.quote?.guardianTotal)||b.quote.guardianTotal<0)fail(409,'LEGACY_AMOUNT_UNKNOWN','成立時の総額が不明な旧合成予約は精算待ちにできません。');
 const fields={status:'ready',heldAt:null,holdReason:null,cause,consentId:cause==='explicit'?consentId:null,approvedBy:cause==='explicit'?actor:null,approvedAt:cause==='explicit'?at:null,notifiedAt:r.notifiedAt??null,readyAt:at};
 if(x)Object.assign(x,fields);else{s.settlements.push(x={id:randomUUID(),bookingId:b.id,reportVersion:r.version,quote:copy(b.quote),ruleVersion:b.ruleVersion??null,...fields});}
 b.status='settlement_ready';history(s,b,'settlement_ready',actor,at,{settlementId:x.id,reportVersion:r.version,cause});
}
function notification(s,b,type,version,recipientId,at){
 const key=[type,b.id,version,recipientId].join(':');
 if(s.notifications.some(n=>n.key===key))return;
 const n={id:randomUUID(),key,eventType:type,bookingId:b.id,reportVersion:version,recipientId,createdAt:at,readAt:null,channel:'web'};
 s.notifications.push(n);s.outbox.push({id:key+':mail',notificationId:n.id,eventType:type,bookingId:b.id,reportVersion:version,recipientId,channel:'mail',status:'pending',attempts:0,nextAttemptAt:at,leaseUntil:null,attemptToken:null,lastError:null,providerId:null});
}
export function lifecycleCommand(s,actor,id,action,input,clock){
 const original=bookingFor(s,actor,id),user=s.users.find(u=>u.id===actor);
 const sitter=['start','end','report'].includes(action);
 if((sitter&&(actor!==original.sitterId||user.role!=='sitter'))||(!sitter&&(actor!==original.guardianId||user.role!=='guardian')))fail(403,'ROLE_FORBIDDEN','この操作は対象予約の担当者だけが実行できます。');
 allowFields(input,['operationId','expectedRevision',...(action==='report'?['summary']:action==='approve'?['reportVersion']:action==='dispute'?['reportVersion','reason']:[])]);
 if(typeof input.operationId!=='string'||!input.operationId||input.operationId.length>200)fail(400,'OPERATION_ID_REQUIRED','再試行用operationIdが必要です。');
 const key=actor+':'+input.operationId,fingerprint=JSON.stringify({contract:'local-lifecycle-1',bookingId:id,action,input});
 const prior=s.operations[key];if(prior){if(prior.fingerprint!==fingerprint)fail(409,'IDEMPOTENCY_CONFLICT','同じoperationIdで別内容は送信できません。');return copy(prior.result);}
 if(!Number.isInteger(input.expectedRevision)||input.expectedRevision!==(original.revision??0))fail(409,'REVISION_CONFLICT','予約が更新されました。最新の内容を再読込して確認してください。');
 collections(s);
 // Detach any in-memory legacy operation result aliases before changing booking.
 const b=copy(original);s.bookings[s.bookings.indexOf(original)]=b;
 const at=stamp(clock),r=s.reports.find(r=>r.bookingId===id&&r.version===b.currentReportVersion);
 if(action==='start'){
  if(b.status!=='confirmed')fail(409,'INVALID_TRANSITION','開始前の成立予約だけ開始できます。');
  if(clock()<new Date(b.start))fail(409,'START_TOO_EARLY','開始予定時刻前は開始できません。');
  b.actualStart=at;b.startedBy=actor;b.status='in_progress';
 }else if(action==='end'){
  if(b.status!=='in_progress')fail(409,'INVALID_TRANSITION','開始後だけ終了できます。');
  b.actualEnd=at;b.endedBy=actor;b.status='ended';b.reportDueAt=new Date(+clock()+DAY).toISOString();
 }else if(action==='report'){
  if(!['ended','awaiting_guardian','disputed','settlement_ready'].includes(b.status))fail(409,'INVALID_TRANSITION','終了後だけ実績を提出できます。');
  if(typeof input.summary!=='string'||!input.summary.trim()||input.summary.length>4000)fail(422,'INVALID_SUMMARY','実績の要約を1〜4000文字で入力してください。');
  holdReady(s,b,at,'report_corrected');if(r){r.supersededAt=at;history(s,b,'report_superseded',actor,at,{reportVersion:r.version});}
  const version=(b.currentReportVersion??0)+1;
  const report={id:randomUUID(),bookingId:id,version,summary:input.summary.trim(),submittedBy:actor,submittedAt:at,actualStart:b.actualStart,actualEnd:b.actualEnd,quote:copy(b.quote),ruleVersion:b.ruleVersion??null,requiresExplicitApproval:!!b.requiresExplicitApproval,notifiedAt:null};
  s.reports.push(report);b.currentReportVersion=version;b.status='awaiting_guardian';notification(s,b,'report',version,b.guardianId,at);
  for(const o of s.outbox)if(o.bookingId===id&&o.eventType==='missing_report'&&!['accepted','suppressed'].includes(o.status)){o.status='suppressed';o.leaseUntil=null;}
 }else{
  if(!r||input.reportVersion!==b.currentReportVersion)fail(409,'REPORT_VERSION_CONFLICT','最新版の実績を確認してください。');
  if(!['awaiting_guardian','disputed','settlement_ready'].includes(b.status))fail(409,'INVALID_TRANSITION','現在は実績確認を操作できません。');
  if(action==='approve'){
   const consent=reportConsent(s,b,r,actor,at,input);
   ready(s,b,r,'explicit',at,actor,consent.id);r.approval={actor,at,consentId:consent.id};b.openDispute=false;
   for(const d of s.disputes)if(d.bookingId===id&&!d.resolvedAt){d.resolvedAt=at;d.resolvedBy=actor;d.resolvedReportVersion=r.version;}
  }else if(action==='dispute'){
   if(typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>2000)fail(422,'INVALID_REASON','異議の理由を1〜2000文字で入力してください。');
   holdReady(s,b,at,'dispute');b.status='disputed';b.openDispute=true;b.requiresExplicitApproval=true;
   s.disputes.push({id:randomUUID(),bookingId:id,reportVersion:r.version,reason:input.reason.trim(),actor,createdAt:at,resolvedAt:null});
  }else fail(404,'NOT_IMPLEMENTED','この操作は実装されていません。');
 }
 b.revision=(b.revision??0)+1;history(s,b,action,actor,at,{revision:b.revision,reportVersion:b.currentReportVersion??null});
 const result={booking:bookingView(s,actor,id)};s.operations[key]={fingerprint,result:copy(result)};return result;
}
export function readNotification(s,actor,id,input,clock){
 const n=(s.notifications??[]).find(n=>n.id===id&&n.recipientId===actor);if(!n)fail(404,'NOTIFICATION_NOT_FOUND','本人のお知らせが見つかりません。');
 allowFields(input,['operationId']);if(typeof input.operationId!=='string'||!input.operationId)fail(400,'OPERATION_ID_REQUIRED','operationIdが必要です。');
 const key=actor+':'+input.operationId,fingerprint=JSON.stringify({notification:id,input}),prior=s.operations[key];
 if(prior){if(prior.fingerprint!==fingerprint)fail(409,'IDEMPOTENCY_CONFLICT','同じoperationIdで別内容は送信できません。');return copy(prior.result);}
 n.readAt??=stamp(clock);const result={notification:copy(n)};s.operations[key]={fingerprint,result:copy(result)};return result;
}
export function lifecycleJobs(s,clock){
 collections(s);const at=stamp(clock);
 for(const b of s.bookings){
  if(b.status==='ended'&&!b.currentReportVersion&&b.reportDueAt&&clock()>=new Date(b.reportDueAt))notification(s,b,'missing_report',0,b.sitterId,at);
  const r=s.reports.find(r=>r.bookingId===b.id&&r.version===b.currentReportVersion);
  if(r&&b.status==='awaiting_guardian'&&r.notifiedAt&&+clock()>=+new Date(r.notifiedAt)+DAY&&!b.requiresExplicitApproval&&!r.requiresExplicitApproval&&!b.openDispute){ready(s,b,r,'timeout',at,'system');b.revision=(b.revision??0)+1;}
 }
}
// Pure local synthetic adapter; it never opens a network connection.
export const syntheticMail=async o=>({status:'accepted',providerId:'synthetic:'+o.id});
export function mailOutcome(s,id,outcome,clock,token){
 collections(s);const o=s.outbox.find(o=>o.id===id);if(!o||o.status==='suppressed'||token&&o.attemptToken!==token)return;
 const at=stamp(clock),b=s.bookings.find(b=>b.id===o.bookingId);
 if(!b)return;
 const wasAccepted=o.status==='accepted';
 if(outcome.status==='accepted'){
  if(wasAccepted)return;o.status='accepted';o.acceptedAt=at;o.providerId=outcome.providerId??'synthetic:'+o.id;o.lastError=null;
 }else{
  if(wasAccepted&&outcome.status!=='permanent_failure')return;
  o.status=outcome.status==='permanent_failure'?'permanent_failure':outcome.status==='unknown'?'unknown':'retry';o.lastError=outcome.error??outcome.status;o.nextAttemptAt=new Date(+clock()+60000).toISOString();
 }
 o.leaseUntil=null;history(s,b,'mail_'+o.status,'synthetic-mail',at,{outboxId:id,reportVersion:o.reportVersion});
 if(o.eventType!=='report'||o.reportVersion!==b.currentReportVersion)return;
 const r=s.reports.find(r=>r.bookingId===b.id&&r.version===o.reportVersion);if(!r||r.supersededAt)return;
 if(o.status==='accepted'){
  const n=s.notifications.find(n=>n.id===o.notificationId);if(n){r.notifiedAt=new Date(Math.max(+new Date(n.createdAt),+new Date(o.acceptedAt))).toISOString();r.notificationInvalidatedAt=null;}
 }else if(o.status==='permanent_failure'){
  r.notificationInvalidatedAt=at;r.notifiedAt=null;holdReady(s,b,at,'mail_permanent_failure',true);
  if(b.status==='settlement_ready'&&!s.settlements.some(x=>x.bookingId===b.id&&x.status==='ready'))b.status='awaiting_guardian';
 }
 b.revision=(b.revision??0)+1;
}
export async function lifecycleTick(store,clock,adapter=syntheticMail){
 // Lease is durable. Network/adapters run outside Store's writer queue.
 const pending=await store.mutate(s=>{
  lifecycleJobs(s,clock);const at=+clock(),claimed=[];
  for(const o of s.outbox){if(o.status==='accepted'||o.status==='suppressed'||+new Date(o.nextAttemptAt)>at||o.leaseUntil&&+new Date(o.leaseUntil)>at)continue;
   o.attemptToken=randomUUID();o.attempts++;o.status='sending';o.leaseUntil=new Date(at+30000).toISOString();claimed.push(copy(o));}
  return claimed;
 });
 await Promise.all(pending.map(async o=>{let result;try{result=await adapter(o);}catch(e){result={status:'unknown',error:e.message};}await store.mutate(s=>mailOutcome(s,o.id,result,clock,o.attemptToken));}));
 // A delayed worker still evaluates dueAt using persisted timestamps.
 await store.mutate(s=>lifecycleJobs(s,clock));
}