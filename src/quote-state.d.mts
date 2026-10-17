export type Estimate<Q>={quote:Q|null;quoteKey:string;acceptCancellation:boolean;acceptTransport:boolean};
export function estimateKey(actor:string,payload:object):string;
export function invalidateEstimate<Q>():Estimate<Q>;
export function canSubmitEstimate(state:Estimate<{transport:number|null;guardianTotal:number|null}>,currentKey:string):boolean;
export class QuoteGuard {
  invalidate():void;
  begin(key:string):{key:string;epoch:number};
  isCurrent(ticket:{key:string;epoch:number},key:string):boolean;
}
export function transportInput(value:string):{transportAmount?:number};
