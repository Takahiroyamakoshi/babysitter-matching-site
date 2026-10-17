// Context validity and busy ownership are separate: changing a draft can reject
// an old result without leaving the original action's busy state stuck forever.
export class ActionGuard {
 constructor(){this.sequence=0;this.active=0;}
 begin(context,draft=''){const ticket={id:++this.sequence,context,draft};this.active=ticket.id;return ticket;}
 current(ticket,context){return this.active===ticket.id&&ticket.context===context;}
 sameDraft(ticket,context,draft){return this.current(ticket,context)&&ticket.draft===draft;}
 finish(ticket){if(this.active!==ticket.id)return false;this.active=0;return true;}
 invalidate(){this.sequence++;this.active=0;}
}
