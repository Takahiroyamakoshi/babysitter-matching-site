import {useEffect,useRef,useState} from 'react';
export type SavedChild={id:string;name:string;birthDate:string};
export type Entry={startMinute:number;endMinute:number}|null;
export type Schedule={weekly:Entry[];exceptions:Record<string,Entry>};
export type OwnUser={id:string;role:'guardian'|'sitter';name:string;region:string;profileRevision:number;children?:SavedChild[];rate?:number;availabilitySchedule?:Schedule;listingReady?:boolean};
export async function api(path:string,actor:string,opts:RequestInit={}){
 let response:Response;
 try{response=await fetch(path,{...opts,headers:{'content-type':'application/json','x-demo-actor':actor,...opts.headers}})}
 catch{throw new Error('通信に失敗しました。入力を保持しています。同じ内容で再試行できます。')}
 const data=await response.json();
 if(!response.ok)throw Object.assign(new Error(data.message||'処理できませんでした。'),{code:data.code});
 return data;
}
function useSave(user:OwnUser,path:string,method:string,onSaved:(user:OwnUser)=>void){
 const revision=user.profileRevision;
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const mounted=useRef(true),pending=useRef(false),attempt=useRef<{key:string;operationId:string}|undefined>(undefined);
 useEffect(()=>()=>{mounted.current=false},[]);
 const save=async(input:object)=>{
 if(pending.current)return;
 const value={...input,expectedRevision:revision},key=JSON.stringify(value);
 if(attempt.current?.key!==key)attempt.current={key,operationId:crypto.randomUUID()};
 pending.current=true;setBusy(true);setError('');setNotice('');
 try{const data=await api(path,user.id,{method,body:JSON.stringify({...value,operationId:attempt.current.operationId})});
 if(mounted.current){attempt.current=undefined;onSaved(data.user);setNotice('保存しました。')}}
 catch(e:any){if(mounted.current)setError(e.message)}
 finally{pending.current=false;if(mounted.current)setBusy(false)}
 };
 const reload=async()=>{
 if(pending.current)return;pending.current=true;setBusy(true);setError('');setNotice('');
 try{const data=await api('/api/me',user.id);if(mounted.current){attempt.current=undefined;onSaved(data.user);setNotice('最新の保存版を確認しました。編集中の入力を保持しています。内容を確認して保存してください。')}}
 catch(e:any){if(mounted.current)setError(e.message)}
 finally{pending.current=false;if(mounted.current)setBusy(false)}
 };
 const edited=()=>{attempt.current=undefined;setError('');setNotice('')};
 return {busy,save,edited,status:<>{error&&<div role="alert" className="error">{error}<button type="button" className="secondary" disabled={busy} onClick={reload}>最新情報を確認して入力を保持</button></div>}{notice&&<p role="status" className="success">{notice}</p>}</>};
}
function ProfileEditor({user,onSaved}:{user:OwnUser;onSaved:(u:OwnUser)=>void}){
 const [name,setName]=useState(user.name.replace(/(?:（合成）)+$/u,'')),[region,setRegion]=useState(user.region);
 const action=useSave(user,'/api/me','PATCH',onSaved);
 return <form className="card form" onChange={action.edited} onSubmit={e=>{e.preventDefault();action.save({name,region})}}><h2>自分のプロフィール</h2><fieldset disabled={action.busy} className="editor-fields"><label>合成の表示名<input value={name} maxLength={40} required onChange={e=>setName(e.target.value)}/></label><label>地域<select value={region} onChange={e=>setRegion(e.target.value)}>{['東京','千葉','茨城'].map(r=><option key={r}>{r}</option>)}</select></label><button>{action.busy?'保存中…':'プロフィールを保存'}</button></fieldset>{action.status}</form>;
}
function ChildEditor({user,child,onSaved}:{user:OwnUser;child?:SavedChild;onSaved:(u:OwnUser)=>void}){
 const [name,setName]=useState(child?.name.replace(/(?:（合成）)+$/u,'')||''),[birthDate,setDate]=useState(child?.birthDate||'');
 const action=useSave(user,'/api/me/children'+(child?'/'+child.id:''),child?'PATCH':'POST',onSaved);
 return <form className="card form" onChange={action.edited} onSubmit={e=>{e.preventDefault();action.save({name,birthDate})}}><h3>{child?child.name:'お子さまを追加'}</h3><fieldset disabled={action.busy} className="editor-fields"><label>合成の呼び名<input value={name} maxLength={40} required onChange={e=>setName(e.target.value)}/></label><label>生年月日<input type="date" min="1900-01-01" required value={birthDate} onChange={e=>setDate(e.target.value)}/></label><button>{action.busy?'保存中…':child?'お子さまを保存':'お子さまを追加して保存'}</button></fieldset>{action.status}</form>;
}
const minutes=Array.from({length:97},(_,i)=>i*15);
const time=(v:number)=>String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0');
function SlotEditor({label,value,onChange}:{label:string;value:Entry;onChange:(v:Entry)=>void}){
 return <div className="availability-slot"><label>{label}の受付<select value={value?'open':'closed'} onChange={e=>onChange(e.target.value==='closed'?null:{startMinute:480,endMinute:1320})}><option value="open">受付する</option><option value="closed">休み</option></select></label>{value&&<><label>{label}の開始<select value={value.startMinute} onChange={e=>onChange({...value,startMinute:Number(e.target.value)})}>{minutes.slice(0,-1).map(m=><option key={m} value={m}>{time(m)}</option>)}</select></label><label>{label}の終了<select value={value.endMinute} onChange={e=>onChange({...value,endMinute:Number(e.target.value)})}>{minutes.slice(1).map(m=><option key={m} value={m}>{time(m)}</option>)}</select></label></>}</div>;
}
export function SettingsEditor({user,onSaved}:{user:OwnUser;onSaved:(u:OwnUser)=>void}){
 const [rate,setRate]=useState(String(user.rate)),[schedule,setSchedule]=useState<Schedule>(()=>structuredClone(user.availabilitySchedule!)),[date,setDate]=useState(''),[dateError,setDateError]=useState('');
 const action=useSave(user,'/api/me/sitter-settings','PATCH',onSaved);
 const setException=(day:string,value:Entry)=>{action.edited();setSchedule({...schedule,exceptions:{...schedule.exceptions,[day]:value}})};
 return <form className="card form" onChange={action.edited} onSubmit={e=>{e.preventDefault();action.save({rate:Number(rate),availabilitySchedule:schedule})}}><h2>料金・空き時間</h2><p className="small">{user.listingReady?'合成審査確認済み・掲載可':'合成確認待ち・掲載と受付はできません'}</p><p>変更は新しい依頼と承認時の受付判定に反映します。送信済みの料金と成立予約の日時・状態・金額は変わりません。</p><fieldset disabled={action.busy} className="editor-fields"><label>時給（1人・1時間、円）<input type="number" min="1" max="10000" step="1" required value={rate} onChange={e=>setRate(e.target.value)}/></label><h3>毎週の受付時間</h3><p className="small">日本時間、各日1枠・15分刻み。24:00は翌日0時です。翌日へ跨ぐ複数枠は別対応となります。</p>{schedule.weekly.map((entry,i)=><SlotEditor key={i} label={['日曜','月曜','火曜','水曜','木曜','金曜','土曜'][i]} value={entry} onChange={value=>setSchedule({...schedule,weekly:schedule.weekly.map((v,j)=>j===i?value:v)})}/>)}<h3>日付ごとの例外（週次より優先）</h3><label>例外日<input type="date" value={date} onChange={e=>{setDate(e.target.value);setDateError('')}}/></label><button type="button" className="secondary" onClick={()=>{if(!date||Object.hasOwn(schedule.exceptions,date)){setDateError('新しい実在日を選択してください。同じ日の例外は1つです。');return}setException(date,null);setDate('')}}>例外日を追加</button>{dateError&&<p role="alert" className="field-error">{dateError}</p>}{Object.entries(schedule.exceptions).sort().map(([day,value])=><div className="exception" key={day}><SlotEditor label={day} value={value} onChange={v=>setException(day,v)}/><button type="button" className="secondary" onClick={()=>{action.edited();const exceptions={...schedule.exceptions};delete exceptions[day];setSchedule({...schedule,exceptions})}}>週次を使う（{day}）</button></div>)}<button>{action.busy?'保存中…':'料金・空き時間を保存'}</button></fieldset>{action.status}</form>;
}
export function ProfilePanel({user,onSaved}:{user:OwnUser;onSaved:(u:OwnUser)=>void}){
 return <section className="profile-layout"><ProfileEditor user={user} onSaved={onSaved}/>{user.role==='guardian'&&<section><h2>登録したお子さま</h2><p>合成児は最大12人保存できます。依頼できる人数と年齢は利用日の条件で確認します。プロフィールを保存しても編集中の依頼は変わりません。依頼条件で選び直して反映してください。</p><div className="grid">{user.children?.map(child=><ChildEditor key={child.id} user={user} child={child} onSaved={onSaved}/>)}{(user.children?.length||0)<12&&<ChildEditor key={'add-'+user.children?.length} user={user} onSaved={onSaved}/>}</div></section>}</section>;
}
