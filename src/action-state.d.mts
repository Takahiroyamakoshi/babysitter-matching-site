export type ActionTicket={id:number;context:string;draft:string};
export class ActionGuard{
 begin(context:string,draft?:string):ActionTicket;
 current(ticket:ActionTicket,context:string):boolean;
 sameDraft(ticket:ActionTicket,context:string,draft:string):boolean;
 finish(ticket:ActionTicket):boolean;
 invalidate():void;
}
