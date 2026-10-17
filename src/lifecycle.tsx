import {useEffect,useRef,useState} from 'react';
import {api} from './profile';
type Report={version:number;summary:string;submittedAt:string;notifiedAt:string|null;requiresExplicitApproval:boolean;supersededAt?:string};
type Settlement={id:string;reportVersion:number;status:string;cause:string;holdReason?:string};
type Dispute={id:string;reportVersion:number;reason:string;createdAt:string;resolvedAt:string|null};
type Booking={id:string;sitterId:string;guardianId:string;start:string;end:string;status:string;revision:number;actualStart?:string;actualEnd?:string;currentReportVersion?:number;requiresExplicitApproval?:boolean;openDispute?:boolean;ruleVersion?:string;legacySynthetic:boolean;children:{name?:string;birthDate:string;relation?:string;care?:string}[]|null;quote:{rate:number;service:number;fee?:number|null;takeHome?:number|null;transport:number|null;guardianTotal:number|null};reports:Report[];settlements:Settlement[];disputes:Dispute[]};
type Notification={id:string;bookingId:string;reportVersion:number;eventType:string;createdAt:string;readAt:string|null;mailStatus:string};
const time=(value?:string|null)=>value?new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'未記録';
const yen=(value:number|null|undefined)=>value==null?'旧データ：不明':new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(value);
const labels:Record<string,string>={confirmed:'成立・開始前',in_progress:'保育中',ended:'終了・実績未提出',awaiting_guardian:'保護者の実績確認待ち',disputed:'異議・相談中',settlement_ready:'精算待ち（ローカル検証・請求なし）'};
const mailLabel:Record<string,string>={pending:'合成メール受付待ち',sending:'合成メール処理中',accepted:'合成メールadapter受付済み（実送信なし）',retry:'合成メール再試行待ち',unknown:'合成メール結果不明・再試行待ち',permanent_failure:'合成メール受付失敗・再通知待ち',suppressed:'報告済みのため未送信通知を抑止'};
export function LifecyclePanel({actor,notificationsOnly=false,initialBooking,onOpenBooking,onConsult,onChanged}:{actor:string;notificationsOnly?:boolean;initialBooking?:string;onOpenBooking:(id:string)=>void;onConsult:(sitter:string,guardian:string)=>void;onChanged:()=>void}){
 const [bookings,setBookings]=useState<Booking[]>([]),[notifications,setNotifications]=useState<Notification[]>([]),[selected,setSelected]=useState(initialBooking??''),[serverTime,setServerTime]=useState(''),[syntheticClock,setSyntheticClock]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[drafts,setDrafts]=useState<Record<string,string>>({}),[reasons,setReasons]=useState<Record<string,string>>({}),[approved,setApproved]=useState<Record<string,boolean>>({});
 const live=useRef(true),pending=useRef(false),attempts=useRef<Record<string,{key:string;input:object}>>({}),sequence=useRef(0),applied=useRef(0),errorRef=useRef<HTMLDivElement>(null);
 const load=async()=>{const request=++sequence.current,data=await api('/api/bootstrap',actor);if(live.current&&request>applied.current){applied.current=request;setBookings(data.bookings);setNotifications(data.notifications);setServerTime(data.serverTime);setSyntheticClock(data.syntheticClock)}};
 useEffect(()=>{live.current=true;load().catch(e=>{if(live.current)setError(e.message)});const timer=window.setInterval(()=>load().catch(()=>{}),3000);return()=>{live.current=false;window.clearInterval(timer)}},[actor]);
 useEffect(()=>{if(initialBooking)setSelected(initialBooking)},[initialBooking]);
 useEffect(()=>{if(error)errorRef.current?.focus()},[error]);
 const change=(value:string)=>{if(pending.current)return;setSelected(value);setError('');setNotice('')};
 const b=bookings.find(b=>b.id===selected),r=b?.reports.find(r=>r.version===b.currentReportVersion),sitter=b?.sitterId===actor;
 const mutate=async(action:string,extra:object={})=>{
  if(!b||pending.current)return;
  const slot=b.id+':'+action,content=JSON.stringify(extra),previous=attempts.current[slot];
  // A failed transport may conceal success. Keep the entire original request for retry,
  // including its revision, until the user edits or explicitly reloads for confirmation.
  if(!previous||previous.key!==content)attempts.current[slot]={key:content,input:{...extra,expectedRevision:b.revision,operationId:crypto.randomUUID()}};
  const attempt=attempts.current[slot];pending.current=true;setBusy(true);setError('');setNotice('');
  try{await api('/api/bookings/'+b.id+'/'+action,actor,{method:'POST',body:JSON.stringify(attempt.input)});if(live.current){delete attempts.current[slot];if(action==='report')setDrafts(old=>({...old,[b.id]:''}));setApproved({});setNotice('保存しました。最新の予約状態を表示しています。');await load();onChanged()}}
  catch(e:any){if(live.current)setError(e.message+' 入力を保持しています。同じ内容で再試行できます。')}
  finally{pending.current=false;if(live.current)setBusy(false)}
 };
 const reload=async()=>{if(pending.current)return;pending.current=true;setBusy(true);try{await load();if(live.current){attempts.current={};setApproved({});setError('');setNotice('最新の状態を読み込みました。入力を保持しています。内容を再確認して操作してください。')}}catch(e:any){if(live.current)setError(e.message)}finally{pending.current=false;if(live.current)setBusy(false)}};
 const read=async(n:Notification)=>{if(pending.current)return;pending.current=true;setBusy(true);try{await api('/api/notifications/'+n.id+'/read',actor,{method:'POST',body:JSON.stringify({operationId:'read:'+n.id})});if(live.current){onChanged();onOpenBooking(n.bookingId)}}catch(e:any){if(live.current)setError(e.message)}finally{pending.current=false;if(live.current)setBusy(false)}};
 return <section className="lifecycle" aria-label={notificationsOnly?'お知らせ':'成立予約と実績'}>
  <p className={syntheticClock?'notice':'small'}>{syntheticClock?'合成時計（ローカル検証）':'サーバー時刻'}：{time(serverTime)} / 日本時間</p>
  {error&&<div className="error" role="alert" tabIndex={-1} ref={errorRef}>{error}</div>}{notice&&<p role="status" className="success">{notice}</p>}
  <button className="secondary" disabled={busy} onClick={reload}>最新の状態を再読込（入力を保持）</button>
  {notificationsOnly?<><h2>お知らせ（未読 {notifications.filter(n=>!n.readAt).length}件）</h2><div className="grid">{notifications.slice().reverse().map(n=><article className="card" key={n.id}><h3>{n.readAt?'既読':'未読'} · {n.eventType==='report'?'実績が提出・訂正されました':'終了から24時間：実績を提出してください'}</h3><p>{time(n.createdAt)}{n.reportVersion>0?' / 実績 第'+n.reportVersion+'版':''}</p><p>{mailLabel[n.mailStatus]??n.mailStatus}</p><button disabled={busy} onClick={()=>read(n)}>関連予約を開く・既読にする</button></article>)}</div>{!notifications.length&&<p className="empty">お知らせはありません。</p>}</>:<>
   <h2>成立予約・実績</h2><div className="booking-list">{bookings.map(item=><button className="secondary booking-choice" key={item.id} aria-pressed={selected===item.id} disabled={busy} onClick={()=>change(item.id)}><strong>{time(item.start)}</strong><span>{labels[item.status]??item.status}</span><small>予約 {item.id.slice(0,8)}</small></button>)}</div>
   {!bookings.length&&<p className="empty">成立した予約はまだありません。正式依頼をシッターが承認すると表示されます。</p>}
   {!!bookings.length&&!b&&<p>予約を選んで詳細・実績を確認してください。</p>}
   {b&&<article className="card booking-detail"><h2>予約詳細</h2><p className="tag">{labels[b.status]??b.status}</p><p>予約 {b.id}</p><dl className="metadata"><dt>成立した日時</dt><dd>{time(b.start)} 〜 {time(b.end)}</dd><dt>記録した開始</dt><dd>{time(b.actualStart)}</dd><dt>記録した終了</dt><dd>{time(b.actualEnd)}</dd><dt>料金規則版</dt><dd>{b.ruleVersion??'旧データ：不明'}</dd><dt>対象児（成立時）</dt><dd>{b.children?b.children.map((c,i)=><div key={i}>{c.name??'保存済み対象児'} · {c.birthDate} · {c.relation??'旧データ：関係不明'} · {c.care??'旧データ：保育内容不明'}</div>):'旧データ：保存済み情報なし'}</dd></dl>
    {b.legacySynthetic&&<p className="notice">legacy synthetic：旧合成予約です。不足する児・規則・交通費相互同意は不明であり、現在のプロフィールから補完していません。実請求・税確認済みを意味しません。</p>}
    <dl className="prices"><dt>成立時の時給（1人・1時間）</dt><dd>{yen(b.quote.rate)}</dd><dt>保育料（夜間加算を含む）</dt><dd>{yen(b.quote.service)}</dd>{sitter&&<><dt>運営手数料（成立時の保育料15%）</dt><dd>{yen(b.quote.fee)}</dd><dt>保育料の手取り（交通費別）</dt><dd>{yen(b.quote.takeHome)}</dd></>}<dt>合意済み交通費</dt><dd>{yen(b.quote.transport)}</dd><dt className="total">成立時の総額</dt><dd className="total">{yen(b.quote.guardianTotal)}</dd></dl>
    <p className="small">開始・終了記録で成立額は変わりません。未承認の延長・短縮・立替などはこの実績で料金変更できません。金額に関する相談は当事者チャットへ戻ってください。</p>
    <fieldset className="editor-fields" disabled={busy}>
     {sitter&&b.status==='confirmed'&&<button disabled={!!serverTime&&new Date(serverTime)<new Date(b.start)} onClick={()=>mutate('start')}>保育を開始する</button>}
     {sitter&&b.status==='confirmed'&&!!serverTime&&new Date(serverTime)<new Date(b.start)&&<p>開始予定時刻になると開始できます。</p>}
     {sitter&&b.status==='in_progress'&&<button onClick={()=>mutate('end')}>保育を終了する</button>}
     {sitter&&['ended','awaiting_guardian','disputed','settlement_ready'].includes(b.status)&&<form className="form" onSubmit={e=>{e.preventDefault();mutate('report',{summary:drafts[b.id]??''})}}><label htmlFor={'report-'+b.id}>{r?'実績を訂正・再提出（新しい版）':'実績の要約（合成情報のみ）'}<textarea id={'report-'+b.id} maxLength={4000} required value={drafts[b.id]??''} onChange={e=>{setDrafts({...drafts,[b.id]:e.target.value});setNotice('')}}/></label><button type="submit" disabled={!drafts[b.id]?.trim()}>{r?'訂正した実績を提出':'実績を提出'}</button>{r&&<p className="small">再提出すると旧版の確認と精算待ちを保留し、保護者へ改めて通知します。</p>}</form>}
    </fieldset>
    {r&&<section className="report-summary"><h3>現在の実績 第{r.version}版</h3><p className="preserve-text">{r.summary}</p><p>提出：{time(r.submittedAt)}</p><p>{r.notifiedAt?'Web保存・合成メールadapter受付成立：'+time(r.notifiedAt):'通知成立待ち：Web保存のみでは24時間を起算しません。'}</p><p>{b.requiresExplicitApproval||r.requiresExplicitApproval?'異議後のため、以後の版も保護者の明示承認が必要です。時間経過だけで精算待ちになりません。':'通常は通知成立から24時間経過、または保護者の明示承認で精算待ちになります。'}</p>
     {!sitter&&<fieldset className="editor-fields form" disabled={busy}><label><input type="checkbox" checked={approved[b.id+':'+r.version+':'+b.revision]??false} onChange={e=>setApproved({...approved,[b.id+':'+r.version+':'+b.revision]:e.target.checked})}/>第{r.version}版の実績と成立時総額 {yen(b.quote.guardianTotal)} を確認しました</label><button disabled={!approved[b.id+':'+r.version+':'+b.revision]} onClick={()=>mutate('approve',{reportVersion:r.version})}>この実績を明示承認する</button><label htmlFor={'dispute-'+b.id}>異議の理由（合成情報のみ）<textarea id={'dispute-'+b.id} maxLength={2000} value={reasons[b.id]??''} onChange={e=>setReasons({...reasons,[b.id]:e.target.value})}/></label><button className="secondary" disabled={!reasons[b.id]?.trim()} onClick={()=>mutate('dispute',{reportVersion:r.version,reason:reasons[b.id]})}>異議を申し立て・精算を保留</button></fieldset>}
    </section>}
    {!!b.disputes.length&&<section><h3>異議と相談</h3>{b.disputes.map(d=><p className="preserve-text" key={d.id}>第{d.reportVersion}版：{d.reason} / {d.resolvedAt?'保護者が最新版を明示承認：'+time(d.resolvedAt):'未解決・当事者で相談中'}</p>)}<p className="small">未解決時の運営対応画面は未実装です。再提出だけでは異議解決になりません。</p></section>}
    <button className="secondary" disabled={busy} onClick={()=>onConsult(b.sitterId,b.guardianId)}>この予約の当事者チャットへ</button>
    {!!b.settlements.length&&<section><h3>精算の状態</h3>{b.settlements.map(x=><p key={x.id}>第{x.reportVersion}版：{x.status==='ready'?'精算待ち（ローカル検証・請求なし）':'保留（履歴を保持）'} / {x.cause==='explicit'?'保護者の明示承認':'通常通知成立から24時間経過'}{x.holdReason?' / '+({report_corrected:'実績訂正',dispute:'異議',mail_permanent_failure:'合成メール受付失敗'}[x.holdReason]??x.holdReason):''}</p>)}<p className="small">請求・カード決済・銀行入金は行っていません。</p></section>}
    {b.reports.length>1&&<details><summary>過去の実績版（現在の確認対象は第{b.currentReportVersion}版）</summary>{b.reports.filter(old=>old.version!==b.currentReportVersion).map(old=><div key={old.version}><h4>第{old.version}版・旧版</h4><p className="preserve-text">{old.summary}</p><p>失効：{time(old.supersededAt)}</p></div>)}</details>}
   </article>}
  </>}
 </section>;
}