const fail=(code,message,status=422)=>{throw Object.assign(new Error(message),{status,code})};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function allowFields(input,fields){
 if(!object(input)||Object.keys(input).some(k=>!fields.includes(k)))fail('INVALID_FIELDS','許可されない項目が含まれています。');
}
export function syntheticName(value){
 if(typeof value!=='string')fail('INVALID_NAME','合成の呼び名は1〜40字で入力してください。');
 const name=value.trim().replace(/(?:（合成）)+$/u,'').trim();
 if(!name||name.length>40)fail('INVALID_NAME','合成の呼び名は1〜40字で入力してください。');
 return name+'（合成）';
}
export function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;
}
export function childFields(input,clock){
 const today=new Date(+clock()+9*3600000).toISOString().slice(0,10);
 if(!validDate(input.birthDate)||input.birthDate<'1900-01-01'||input.birthDate>today)fail('INVALID_BIRTH_DATE','生年月日は1900年以降、日本時間の今日以前の実在日を指定してください。');
 return {name:syntheticName(input.name),birthDate:input.birthDate};
}
export function scheduleFields(value){
 allowFields(value,['weekly','exceptions']);
 if(!Array.isArray(value.weekly)||value.weekly.length!==7||!object(value.exceptions)||Object.keys(value.exceptions).length>60)fail('INVALID_SCHEDULE','週7曜日と最大60日の例外を指定してください。');
 const entry=e=>{
 if(e===null)return null;
 allowFields(e,['startMinute','endMinute']);
 if(!Number.isInteger(e.startMinute)||!Number.isInteger(e.endMinute)||e.startMinute%15||e.endMinute%15||e.startMinute<0||e.startMinute>=e.endMinute||e.endMinute>1440)fail('INVALID_SCHEDULE','受付時間は同じ日の15分刻み、開始より後の終了を指定してください。');
 return {startMinute:e.startMinute,endMinute:e.endMinute};
 };
 const exceptions={};
 for(const [date,e]of Object.entries(value.exceptions)){if(!validDate(date))fail('INVALID_SCHEDULE','例外日は実在日を指定してください。');exceptions[date]=entry(e)}
 return {weekly:Array.from(value.weekly,entry),exceptions};
}
export function effectiveSchedule(user){
 return user.availabilitySchedule||{weekly:Array.from({length:7},()=>user.availability||{startMinute:0,endMinute:1440}),exceptions:{}};
}
export function withinAvailability(sitter,start,end){
 const a=new Date(+new Date(start)+9*3600000),b=new Date(+new Date(end)+9*3600000),schedule=effectiveSchedule(sitter),day=a.toISOString().slice(0,10);
 const open=Object.hasOwn(schedule.exceptions,day)?schedule.exceptions[day]:schedule.weekly[a.getUTCDay()];
 if(!open)return false;
 const minute=a.getUTCHours()*60+a.getUTCMinutes(),duration=(b-a)/60000;
 return duration>0&&minute>=open.startMinute&&minute+duration<=open.endMinute;
}
export function revisionCheck(user,input){
 if(!Number.isInteger(input.expectedRevision)||input.expectedRevision<0)fail('INVALID_REVISION','更新版は0以上の整数で指定してください。');
 if(input.expectedRevision!==(user.profileRevision||0))fail('PROFILE_CONFLICT','別の更新が保存されました。入力を保持したまま最新情報を読み直してください。',409);
}
export function ownUser(user,listingReady){
 const common={id:user.id,role:user.role,name:user.name,region:user.region,profileRevision:user.profileRevision||0};
 return user.role==='guardian'?{...common,children:user.children||[]}:{...common,rate:user.rate,availabilitySchedule:effectiveSchedule(user),listingReady};
}
