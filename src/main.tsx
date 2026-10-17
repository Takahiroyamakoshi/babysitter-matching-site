import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { estimateKey, invalidateEstimate, canSubmitEstimate, QuoteGuard, transportInput } from './quote-state.mjs';
import {ActionGuard} from './action-state.mjs';
import type { Estimate } from './quote-state.mjs';
import { api, ProfilePanel, SettingsEditor } from './profile';
import type {OwnUser,SavedChild} from './profile';
import './style.css';

type Child={name:string;birthDate:string;relation:string;care:string};
type User={id:string;role:'guardian'|'sitter';name:string};
type Sitter=User & {region:string;rate:number;qualifications:string[];ageMonths:number[];capacity:number};
type Quote={rate:number;base:number;nightSurcharge:number;service:number;fee:number;takeHome:number;transport:number|null;guardianTotal:number|null};
type CareRequest={id:string;guardianId:string;sitterId:string;status:string;start:string;end:string;expiresAt:string;children:Child[];quote:Quote;transportProposal?:{amount:number;guardianAccepted:boolean;sitterAcknowledged?:boolean}};
type Message={id:string;body:string;authorId:string;createdAt:string};
type Conditions={start:string;end:string;birthDates:string[];childIds?:string[]};
type Filters={region:string;qualification:string;maxRate:string};
type Tab='search'|'consult'|'request'|'requests'|'account'|'profile'|'settings';
const quarterHours=Array.from({length:96},(_,i)=>String(Math.floor(i/4)).padStart(2,'0')+':'+String(i%4*15).padStart(2,'0'));
const id=()=>crypto.randomUUID();
const asIso=(v:string)=>v?v+':00+09:00':'';
const dateValue=(days:number,hour:number)=>new Date(Date.now()+days*86400000).toISOString().slice(0,10)+'T'+String(hour).padStart(2,'0')+':00';
const yen=(v:number)=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(v);
const ageLabel=(months:number)=>months<12?months+'か月':Math.floor(months/12)+'歳'+(months%12?months%12+'か月':'');
const displayTime=(value:string)=>new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
function conditionError(value:Conditions) {
  if(!value.start||!value.end)return '開始・終了日時を入力してください。';
  const start=new Date(asIso(value.start)),end=new Date(asIso(value.end));
  if(!Number.isFinite(+start)||!Number.isFinite(+end))return '開始・終了日時を入力してください。';
  if(+start<=Date.now()||+end<=+start)return '未来の開始日時と、それより後の終了日時を指定してください。';
  if(+end-+start<3*3600000)return '通常保育は最低3時間です。終了日時を延ばしてください。';
  if(start.getUTCMinutes()%15||end.getUTCMinutes()%15)return '開始・終了は15分刻みで指定してください。';
  if(value.birthDates.some(d=>!d))return 'お子さま全員の生年月日を入力してください。';
  return '';
}
function RequestConditions({value,onChange,prefix,savedChildren=[]}:{value:Conditions;onChange:(value:Conditions)=>void;prefix:string;savedChildren?:SavedChild[]}) {
  const [selectionError,setSelectionError]=useState('');
  const reason=conditionError(value),invalidTime=!!reason&&!reason.includes('生年月日');
  return <fieldset className="card form"><legend>お子さま・依頼日時</legend>
    <p className="small">通常保育は最低3時間、15分刻みです。日時は日本時間で入力してください。</p>
    <div className="request-datetimes">
      {(['start','end'] as const).map(field=>{
        const [date,time='00:00']=value[field].split('T'),label=field==='start'?'開始':'終了';
        // Keep the selected time even while its date is cleared; validation blocks incomplete values.
        return <div className="request-datetime" key={field}>
          <label htmlFor={prefix+'-'+field+'-date'}>{label}日<input id={prefix+'-'+field+'-date'} type="date" value={date} aria-invalid={invalidTime} aria-describedby={prefix+'-help'} onChange={e=>onChange({...value,[field]:e.target.value+'T'+time})}/></label>
          <label htmlFor={prefix+'-'+field+'-time'}>{label}時刻<select id={prefix+'-'+field+'-time'} value={time} aria-invalid={invalidTime} aria-describedby={prefix+'-help'} onChange={e=>onChange({...value,[field]:date+'T'+e.target.value})}>{quarterHours.map(hour=><option key={hour} value={hour}>{hour}</option>)}</select></label>
        </div>;
      })}
    </div>
    <label htmlFor={prefix+'-count'}>お子さまの人数<select id={prefix+'-count'} value={value.birthDates.length} onChange={e=>onChange({...value,birthDates:Array.from({length:Number(e.target.value)},(_,i)=>value.birthDates[i]||''),childIds:Array.from({length:Number(e.target.value)},(_,i)=>value.childIds?.[i]||'')})}><option value="1">1人</option><option value="2">2人（条件付き）</option><option value="3">3人（条件付き）</option></select></label>
    {value.birthDates.map((birthDate,i)=><div className="child-condition" key={i}><label htmlFor={prefix+'-child-'+i}>{i+1}人目のお子さま<select id={prefix+'-child-'+i} value={value.childIds?.[i]||''} onChange={e=>{
      const childId=e.target.value;
      if(childId&&value.childIds?.some((id,j)=>j!==i&&id===childId)){setSelectionError('同じ登録児は二重に選択できません。別のお子さまか手入力を選んでください。');return}
      setSelectionError('');const child=savedChildren.find(c=>c.id===childId);
      onChange({...value,childIds:value.birthDates.map((_,j)=>j===i?childId:value.childIds?.[j]||''),birthDates:value.birthDates.map((d,j)=>j===i&&child?child.birthDate:d)});
    }}><option value="">手入力</option>{savedChildren.map(c=><option key={c.id} value={c.id}>{c.name}（{c.birthDate}）</option>)}</select></label><label htmlFor={prefix+'-dob-'+i}>{i+1}人目の生年月日<input id={prefix+'-dob-'+i} type="date" value={birthDate} aria-invalid={!birthDate} aria-describedby={prefix+'-help'} onChange={e=>onChange({...value,birthDates:value.birthDates.map((d,j)=>i===j?e.target.value:d),childIds:value.birthDates.map((_,j)=>i===j?'':value.childIds?.[j]||'')})}/></label></div>)}
    {selectionError&&<p role="alert" className="field-error">{selectionError}</p>}
    {!!savedChildren.length&&<p className="small">プロフィール更新後はお子さまを選び直して反映してください。生年月日を直接変えると手入力になります。</p>}
    <p id={prefix+'-help'} className={reason?'field-error':'small'} aria-live="polite">{reason||'対象：生後6か月から小学3年生の年度末まで。複数人は資格・年齢等の適合確認が必要です。'}</p>
  </fieldset>;
}
function SitterFilters({value,onChange}:{value:Filters;onChange:(value:Filters)=>void}) {
  return <fieldset className="card form"><legend>シッターの希望条件</legend>
    <p className="small">地域・資格・時給から候補を絞り込みます。</p>
    <label htmlFor="region">対応地域<select id="region" value={value.region} onChange={e=>onChange({...value,region:e.target.value})}>{['東京','千葉','茨城'].map(r=><option key={r}>{r}</option>)}</select></label>
    <label htmlFor="qualification">資格<select id="qualification" value={value.qualification} onChange={e=>onChange({...value,qualification:e.target.value})}><option value="">指定なし</option>{['保育士','幼稚園教諭','看護師'].map(q=><option key={q}>{q}</option>)}</select></label>
    <label htmlFor="rate">時給上限（1人あたり・円）<input id="rate" type="number" min="1" max="10000" value={value.maxRate} onChange={e=>onChange({...value,maxRate:e.target.value})}/></label>
    <p className="small">資格・研修・届出・初回保険の合成確認がそろったシッターのみ掲載。病児・病後児・投薬補助は受付できません。</p>
  </fieldset>;
}
function PriceBreakdown({quote,sitter=false}:{quote:Quote;sitter?:boolean}) {
  return <dl className="prices">
    <dt>基本保育料</dt><dd>{yen(quote.base??quote.service-quote.nightSurcharge)}</dd>
    <dt>夜間加算 <small>21時〜8時の該当時間のみ20%</small></dt><dd>{yen(quote.nightSurcharge)}</dd>
    <dt className="subtotal">保育料合計（交通費を除く）</dt><dd className="subtotal">{yen(quote.service)}</dd>
    <dt>交通費{quote.transport!==null?'（提案額）':''}</dt><dd>{quote.transport===null?'相談して確定':yen(quote.transport)}</dd>
    <dt className="total">総支払額</dt><dd className="total">{quote.guardianTotal===null?'未確定':yen(quote.guardianTotal)}</dd>
    {sitter&&<><dt>運営手数料（保育料の15%）</dt><dd>{yen(quote.fee)}</dd><dt>保育料の手取り目安（交通費別）</dt><dd>{yen(quote.takeHome)}</dd></>}
  </dl>;
}
function App() {
  const [own,setOwn]=useState<OwnUser|null>(null);
  const ownRef=useRef<OwnUser|null>(null);ownRef.current=own;
  const [users,setUsers]=useState<User[]>([]),[actor,setActor]=useState('guardian-demo'),[tab,setTab]=useState<Tab>('search');
  const [conditions,setConditions]=useState<Conditions>({start:dateValue(7,10),end:dateValue(7,13),birthDates:['2021-05-10']});
  const [filters,setFilters]=useState<Filters>({region:'東京',qualification:'',maxRate:'10000'});
  const [sitters,setSitters]=useState<Sitter[]>([]),[selected,setSelected]=useState<Sitter|null>(null),[searched,setSearched]=useState(false);
  const [requests,setRequests]=useState<CareRequest[]>([]),[messages,setMessages]=useState<Message[]>([]);
  const [message,setMessage]=useState('こんにちは。合成デモの通常保育について相談したいです。'),[messageOp,setMessageOp]=useState(id());
  const [conversationGuardian,setConversationGuardian]=useState('guardian-demo');
  const [transport,setTransport]=useState(''),[estimate,setEstimate]=useState<Estimate<Quote>>(()=>invalidateEstimate<Quote>());
  const [requestOp,setRequestOp]=useState(id()),[acknowledged,setAcknowledged]=useState<Record<string,boolean>>({});
  const [sending,setSending]=useState(false),[calculating,setCalculating]=useState(false),[searching,setSearching]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  const guard=useRef(new QuoteGuard()),errorRef=useRef<HTMLDivElement>(null),contextRef=useRef(''),conversationRef=useRef(''),actorRef=useRef(actor),searchEpoch=useRef(0);
  const actionOps=useRef<Record<string,string>>({}),actionGuard=useRef(new ActionGuard()),messageDraftRef=useRef(messageOp);
  messageDraftRef.current=messageOp;
  const me=users.find(u=>u.id===actor),isSitter=me?.role==='sitter';
  const children:Child[]=conditions.birthDates.map((birthDate,i)=>({name:'対象児'+(i+1)+'（合成）',birthDate,relation:'保護者の子',care:'通常保育'}));
  const payload={sitterId:selected?.id,start:asIso(conditions.start),end:asIso(conditions.end),children,serviceType:'normal',...transportInput(transport)};
  const currentKey=estimateKey(actor,payload);
  contextRef.current=currentKey; actorRef.current=actor;
  const conversationKey=actor+'|'+selected?.id+'|'+(isSitter?conversationGuardian:actor);
  conversationRef.current=conversationKey;
  const refresh=async(target=actor)=>{
    const data=await api('/api/bootstrap',target);
    if(actorRef.current===target){setUsers(data.users);setRequests(data.requests)}
  };
  useEffect(()=>{const target=actor;refresh().catch(e=>{if(actorRef.current===target)setError(e.message)});const timer=window.setInterval(()=>refresh().catch(()=>{}),15000);return()=>window.clearInterval(timer)},[actor]);
  useEffect(()=>{let live=true;const target=actor;api('/api/me',target).then(data=>{if(live&&actorRef.current===target)saveOwn(data.user)}).catch(e=>{if(live&&actorRef.current===target)setError(e.message)});return()=>{live=false}},[actor]);
  useEffect(()=>{actionGuard.current.invalidate();setSending(false)},[tab,actor]);
  useEffect(()=>{if(error)errorRef.current?.focus()},[error]);
  useEffect(()=>{
    if(!selected)return;
    const key=conversationKey;
    api('/api/messages?sitterId='+selected.id+(isSitter?'&guardianId='+conversationGuardian:''),actor)
      .then(data=>{if(conversationRef.current===key)setMessages(data.messages)})
      .catch(e=>{if(conversationRef.current===key)setError(e.message)});
  },[conversationKey]);
  const invalidate=()=>{guard.current.invalidate();setEstimate(invalidateEstimate<Quote>());setRequestOp(id());setCalculating(false)};
  const updateConditions=(next:Conditions)=>{invalidate();searchEpoch.current++;setSearching(false);setConditions(next);setSitters([]);setSearched(false);setError('');setNotice('条件を変更しました。概算と確認チェックを更新してください。')};
  const updateFilters=(next:Filters)=>{invalidate();searchEpoch.current++;setSearching(false);setFilters(next);setSitters([]);setSearched(false);setError('');setNotice('')};
  const switchActor=(next:string)=>{invalidate();searchEpoch.current++;setSearching(false);actorRef.current=next;conversationRef.current='';actionGuard.current.invalidate();setSending(false);setActor(next);ownRef.current=null;setOwn(null);setAcknowledged({});setConditions({start:dateValue(7,10),end:dateValue(7,13),birthDates:['']});setSelected(null);setMessages([]);setMessage('');setRequests([]);setSitters([]);setSearched(false);setTransport('');setTab(users.find(u=>u.id===next)?.role==='sitter'?'requests':'search');setError('');setNotice('');setMessageOp(id())};
  const openSitter=(sitter:Sitter,guardian='guardian-demo')=>{
    invalidate();setSelected(sitter);setMessages([]);setConversationGuardian(isSitter?guardian:actor);setTransport('');setTab('consult');setError('');setNotice('');setMessageOp(id());
  };
  const search=async()=>{
    setError('');setNotice('');setSitters([]);setSearched(false);
    const reason=conditionError(conditions);if(reason){setError(reason);return}
    const epoch=++searchEpoch.current;setSearching(true);
    try {
      const query=new URLSearchParams({...filters,start:payload.start,end:payload.end,children:JSON.stringify(children),serviceType:'normal'});
      const data=await api('/api/search?'+query,actor);
      if(searchEpoch.current===epoch){setSitters(data.sitters);setSearched(true)}
    }catch(e:any){if(searchEpoch.current===epoch)setError(e.message)}
    finally{if(searchEpoch.current===epoch)setSearching(false)}
  };
  const sendMessage=async()=>{
    if(!selected)return;
    const key=conversationKey,ticket=actionGuard.current.begin(key,messageOp);setError('');setSending(true);
    try {
      const data=await api('/api/messages',actor,{method:'POST',body:JSON.stringify({sitterId:selected.id,guardianId:isSitter?conversationGuardian:undefined,body:message,operationId:messageOp})});
      if(actionGuard.current.current(ticket,conversationRef.current)){
        setMessages(old=>old.some(m=>m.id===data.message.id)?old:[...old,data.message]);
        if(actionGuard.current.sameDraft(ticket,conversationRef.current,messageDraftRef.current)){setMessage('');setMessageOp(id());setNotice('相談を送信しました。チャットだけでは予約は成立しません。')}
      }
    }catch(e:any){if(actionGuard.current.sameDraft(ticket,conversationRef.current,messageDraftRef.current))setError(e.message)}
    finally{if(actionGuard.current.finish(ticket))setSending(false)}
  };
  const getQuote=async()=>{
    if(!selected)return;
    invalidate();setError('');setNotice('');
    const reason=conditionError(conditions);if(reason){setError(reason);return}
    const key=currentKey,ticket=guard.current.begin(key);setCalculating(true);
    try {
      const data=await api('/api/quotes',actor,{method:'POST',body:JSON.stringify(payload)});
      if(guard.current.isCurrent(ticket,contextRef.current)){setEstimate({...invalidateEstimate<Quote>(),quote:data.quote,quoteKey:key});setTab('request')}
    }catch(e:any){if(guard.current.isCurrent(ticket,contextRef.current))setError(e.message)}
    finally{if(guard.current.isCurrent(ticket,contextRef.current))setCalculating(false)}
  };
  const submitRequest=async()=>{
    if(!canSubmitEstimate(estimate,currentKey)){setError('最新の概算・交通費提案額・総支払額と取消条件を確認してください。');return}
    const key=currentKey,ticket=actionGuard.current.begin(currentKey);setError('');setSending(true);
    try {
      const data=await api('/api/requests',actor,{method:'POST',body:JSON.stringify({...payload,expectedRate:estimate.quote!.rate,acceptCancellation:estimate.acceptCancellation,acceptTransport:estimate.acceptTransport,operationId:requestOp})});
      if(actionGuard.current.current(ticket,contextRef.current)){setRequests(old=>old.some(r=>r.id===data.request.id)?old:[...old,data.request]);setTab('requests');setNotice('正式依頼を送信しました。シッターが条件を確認して承認すると成立します。');invalidate()}
    }catch(e:any){if(actionGuard.current.current(ticket,contextRef.current)){if(e.code==='PRICE_CHANGED')invalidate();setError(e.message)}}finally{if(actionGuard.current.finish(ticket))setSending(false)}
  };
  const respond=async(request:CareRequest,action:'approve'|'decline')=>{
    setError('');setSending(true);const target=actor,key=request.id+':'+action,ticket=actionGuard.current.begin(actor);
    const operationId=actionOps.current[key]||(actionOps.current[key]=id());
    try {
      await api('/api/requests/'+request.id+'/'+action,actor,{method:'POST',body:JSON.stringify({operationId,...(action==='approve'&&request.transportProposal?{acknowledgeTransport:acknowledged[request.id]===true}:{})})});
      if(actionGuard.current.current(ticket,actorRef.current)){setNotice(action==='approve'?'依頼条件と料金を確定し、予約が成立しました。':'依頼を辞退しました。');await refresh(target)}
    }catch(e:any){if(actionGuard.current.current(ticket,actorRef.current))setError(e.message)}finally{if(actionGuard.current.finish(ticket))setSending(false)}
  };
  const saveOwn=(user:OwnUser)=>{if(actorRef.current!==user.id||ownRef.current&&ownRef.current.id===user.id&&ownRef.current.profileRevision>user.profileRevision)return;ownRef.current=user;setOwn(user);setUsers(old=>old.map(u=>u.id===user.id?{...u,name:user.name,...(user.role==='sitter'?{rate:user.rate,region:user.region}: {})}:u))};
  const register=async(role:'guardian'|'sitter')=>{
    const name=prompt('合成用の表示名を入力してください');if(!name)return;const target=actor;
    try {const data=await api('/api/register',actor,{method:'POST',body:JSON.stringify({role,name})});if(actorRef.current!==target)return;await refresh();if(actorRef.current!==target)return;switchActor(data.user.id);setOwn(data.user);setTab('profile');setNotice(data.notice)}catch(e:any){if(actorRef.current===target)setError(e.message)}
  };
  const title=tab==='search'?(isSitter?'シッターの掲載を見る':'シッターを探す'):tab==='consult'?(selected?.name+'さんに相談'):tab==='request'?'保育料の概算を確認':tab==='requests'?(isSitter?'届いた依頼を確認':'予約・依頼を確認'):tab==='profile'?(isSitter?'自分のプロフィール':'お子さま・プロフィール'):tab==='settings'?'料金・空き時間':'合成デモに登録';
  const validEstimate=estimate.quote&&estimate.quoteKey===currentKey?estimate.quote:null;
  return <main className="shell">
    <div className="notice">ローカル合成デモです。実在の個人情報・連絡先・身分証・医療情報・決済情報を入力しないでください。</div>
    <header className="head"><div><p className="brand">おうち保育</p><p className="small">選んで、相談して、条件を確定する。</p></div><div className="actor"><label htmlFor="actor">デモ利用者を切替（認証ではありません）</label><select id="actor" value={actor} onChange={e=>switchActor(e.target.value)}>{users.map(user=><option key={user.id} value={user.id}>{user.name} / {user.role==='guardian'?'保護者':'シッター'}</option>)}</select></div></header>
    <nav className="tabs" aria-label="画面">
      {!isSitter&&<button aria-current={tab==='search'?'page':undefined} onClick={()=>setTab('search')}>シッターを探す</button>}
      <button aria-current={tab==='requests'?'page':undefined} onClick={()=>setTab('requests')}>{isSitter?'届いた依頼':'予約・依頼'}</button>
      {isSitter&&<button aria-current={tab==='settings'?'page':undefined} onClick={()=>setTab('settings')}>料金・空き時間</button>}
      <button aria-current={tab==='profile'?'page':undefined} onClick={()=>setTab('profile')}>{isSitter?'プロフィール':'お子さま・プロフィール'}</button>
      <button aria-current={tab==='account'?'page':undefined} onClick={()=>setTab('account')}>デモ登録</button>
      {selected&&<><button aria-current={tab==='consult'?'page':undefined} onClick={()=>setTab('consult')}>相談</button>{!isSitter&&<button aria-current={tab==='request'?'page':undefined} onClick={()=>setTab('request')}>概算・正式依頼</button>}</>}
    </nav>
    <h1>{title}</h1>
    {selected&&(tab==='consult'||tab==='request')&&<p className="selected-name">相談相手：{selected.name}</p>}
    {error&&<div className="error" role="alert" tabIndex={-1} ref={errorRef}>{error}</div>}
    {notice&&<p className="success" role="status">{notice}</p>}
    {tab==='search'&&!isSitter&&<>
      <form onSubmit={e=>{e.preventDefault();search()}}><div className="search-conditions"><RequestConditions prefix="search" value={conditions} onChange={updateConditions} savedChildren={own?.children}/><SitterFilters value={filters} onChange={updateFilters}/></div><div className="search-action"><button disabled={!!conditionError(conditions)||searching} type="submit">{searching?'検索中…':'この条件でシッターを探す'}</button><p className="small">人数・年齢・空き時間の条件を確認して候補を表示します。</p></div></form>
      <section aria-label="検索結果" aria-live="polite"><div className="result-heading"><h2>条件に合うシッター</h2>{searched&&<span>{sitters.length}人</span>}</div>
        {!searched&&!searching&&<p className="empty">お子さま・依頼日時とシッターの希望条件を入力して検索してください。</p>}
        {searched&&!sitters.length&&<div className="empty"><h3>この条件に合うシッターはいません</h3><p>入力した条件は有効です。日時や地域・資格・時給上限を変えて検索してください。</p></div>}
        <div className="grid">{sitters.map(sitter=><article className="card sitter" key={sitter.id}><span className="tag">合成審査確認済み</span><h3>{sitter.name}</h3><p className="price">{yen(sitter.rate)}<span> / 1時間・1人</span></p><dl className="metadata"><dt>対応地域</dt><dd>{sitter.region}</dd><dt>対応年齢</dt><dd>{ageLabel(sitter.ageMonths[0])}〜{ageLabel(sitter.ageMonths[1])}</dd><dt>資格</dt><dd>{sitter.qualifications.join('・')}</dd><dt>同時に預かれる子どもの人数</dt><dd>最大{sitter.capacity}人（条件付き）</dd></dl><p className="small">このサービスの対象：小学3年生の年度末まで。年齢・人数により個別の適合確認が必要です。</p>{(!isSitter||actor===sitter.id)&&<button onClick={()=>openSitter(sitter)}>{isSitter?'保護者との相談を開く':'このシッターに相談'}</button>}</article>)}</div>
      </section>
    </>}
    {tab==='consult'&&selected&&<section className="consult-layout"><div className="card conversation"><h2>相談メッセージ</h2><p className="small">相談だけでは予約は成立しません。日時・お子さま・合理的な往復経路の交通費実費を確認しましょう。</p>
      {isSitter&&<label>会話する保護者<select value={conversationGuardian} onChange={e=>{setMessages([]);setConversationGuardian(e.target.value);setMessageOp(id())}}>{users.filter(u=>u.role==='guardian').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>}
      <div className="chat" aria-label="相談履歴" aria-live="polite">{!messages.length&&<p className="small">まだメッセージはありません。合成の相談内容を送信できます。</p>}{messages.map(m=><div className={'bubble '+(m.authorId===actor?'mine':'')} key={m.id}>{m.body}<div className="small">{m.authorId===actor?'あなた':'相手'} / {displayTime(m.createdAt)}</div></div>)}</div>
      <form className="form" onSubmit={e=>{e.preventDefault();sendMessage()}}><label htmlFor="message">相談内容<textarea id="message" value={message} onChange={e=>{setMessage(e.target.value);const op=id();messageDraftRef.current=op;setMessageOp(op)}}/></label><button disabled={!message.trim()||sending}>相談を送信</button></form>
      </div><aside className="condition-editor" hidden={isSitter}><RequestConditions prefix="consult" value={conditions} onChange={updateConditions} savedChildren={own?.children}/><div className="card"><p className="small">条件を変更しても会話は残ります。変更後は概算・交通費・取消条件を再確認してください。</p><button onClick={getQuote} disabled={!!conditionError(conditions)||calculating}>{calculating?'計算中…':'保育料の概算を確認'}</button></div></aside></section>}
    {tab==='request'&&selected&&!isSitter&&<section className="estimate-layout"><div className="card"><h2>{validEstimate?.transport===null?'保育料の概算（交通費を除く）':'料金・交通費の提案を確認'}</h2>{validEstimate?<PriceBreakdown quote={validEstimate} sitter={isSitter}/>:<p>条件を変更しました。最新の概算を計算してください。</p>}<p className="small">税区分・実請求は含まれない合成デモの概算です。</p>
      <fieldset className="transport form"><legend>相談した交通費を提案</legend><p className="small">合理的な往復経路の実費を相談し、提案額を入力してください。無料で合意する場合のみ0円を入力します。シッターの承認で確定します。</p><label htmlFor="transport">交通費提案額（円）<input id="transport" type="number" min="0" step="1" value={transport} onChange={e=>{invalidate();setTransport(e.target.value);setError('')}} placeholder="相談後に入力"/></label><button className="secondary" onClick={getQuote} disabled={calculating||!!conditionError(conditions)}>{calculating?'計算中…':'最新の金額を計算'}</button></fieldset>
      <p className="small">取消条件：日本時間の利用開始日基準で前々日以前0%、前日50%、当日100%の保育料案です。交通費は返金不能な発生済み実費のみ。成立後の取消・精算はこのデモでは実行できません。</p>
      {!isSitter&&<div className="consents"><label><input type="checkbox" checked={estimate.acceptTransport} disabled={!validEstimate||validEstimate.transport===null} onChange={e=>setEstimate({...estimate,acceptTransport:e.target.checked})}/>交通費提案額{validEstimate?.transport!==null&&validEstimate?yen(validEstimate.transport):'（未確定）'}と総支払額{validEstimate?.guardianTotal!==null&&validEstimate?yen(validEstimate.guardianTotal):'（未確定）'}を確認しました</label><label><input type="checkbox" checked={estimate.acceptCancellation} disabled={!validEstimate} onChange={e=>setEstimate({...estimate,acceptCancellation:e.target.checked})}/>ローカルデモの取消条件に同意します</label><button onClick={submitRequest} disabled={!canSubmitEstimate(estimate,currentKey)||sending}>正式依頼を送信</button></div>}
      </div><aside className="condition-editor"><RequestConditions prefix="estimate" value={conditions} onChange={updateConditions} savedChildren={own?.children}/><div className="card"><h2>依頼先</h2><p>{selected.name} / 通常保育</p><button className="secondary" onClick={()=>setTab('consult')}>相談に戻る</button></div></aside></section>}
    {tab==='requests'&&<section className="card"><h2>{isSitter?'届いた正式依頼':'予約・正式依頼'}</h2><p className="small">承認待ちは枠を占有しません。期限・空き時間・移動余裕を承認時に再確認します。</p><div className="list">{requests.map(request=><article className={'request '+request.status} key={request.id}><h3>{request.status==='pending'?'承認待ち':request.status==='confirmed'?'成立':request.status==='declined'?'辞退':'失効'}</h3><p>相手：{users.find(u=>u.id===(isSitter?request.guardianId:request.sitterId))?.name}</p><p>{displayTime(request.start)} 〜 {displayTime(request.end)}</p><p>お子さま：{request.children?.map((child,i)=>(i+1)+'人目 '+child.birthDate+'生まれ').join('、')||'保存済みの条件'}</p><PriceBreakdown quote={request.quote} sitter={isSitter}/><p className="small">承認期限：{displayTime(request.expiresAt)}</p>{isSitter&&<button className="secondary" onClick={()=>{const sitter=users.find(u=>u.id===actor);if(sitter)openSitter(sitter as Sitter,request.guardianId)}}>この保護者との相談を開く</button>}{isSitter&&request.status==='pending'&&<div className="consents">{request.transportProposal&&<label><input type="checkbox" checked={acknowledged[request.id]||false} onChange={e=>setAcknowledged({...acknowledged,[request.id]:e.target.checked})}/>日時・お子さま・交通費提案額{yen(request.quote.transport!)}を含む依頼条件を確認しました</label>}<div className="actions"><button onClick={()=>respond(request,'approve')} disabled={sending||!!request.transportProposal&&!acknowledged[request.id]}>依頼を承認して成立</button><button className="secondary" onClick={()=>respond(request,'decline')} disabled={sending}>辞退</button></div></div>}</article>)}{!requests.length&&<p className="empty">まだ予約・正式依頼はありません。</p>}</div></section>}
    {tab==='profile'&&own&&<ProfilePanel key={actor} user={own} onSaved={saveOwn}/>}
    {tab==='settings'&&isSitter&&own&&<SettingsEditor key={actor} user={own} onSaved={saveOwn}/>}
    {isSitter&&(tab==='requests'||tab==='profile')&&<section className="card"><h2>自分の掲載プレビュー・相談</h2><p>{own?.name} / {own?.region} / {own?.rate?yen(own.rate):''}（1人・1時間）</p><p>{own?.listingReady?'合成審査確認済み・掲載可':'合成確認待ち・掲載と受付はできません'}</p><button onClick={()=>{const sitter=users.find(u=>u.id===actor);if(sitter)openSitter(sitter as Sitter)}}>保護者との相談を開く</button></section>}
    {tab==='account'&&<section className="grid"><div className="card"><h2>保護者の合成登録</h2><p>実情報なしで表示名だけを登録します。</p><button onClick={()=>register('guardian')}>合成保護者を登録</button></div><div className="card"><h2>シッターの合成登録</h2><p>資格・研修・届出・初回保険の合成確認待ちとして登録します。自己申告で掲載や受付はできません。</p><button onClick={()=>register('sitter')}>合成シッターを登録</button></div></section>}
    <footer className="footer">ローカル合成デモ ・ 本人確認・メール・決済・病児対応なし</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
