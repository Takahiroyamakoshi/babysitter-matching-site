// A response belongs to both its conditions and the calculation attempt.
export function estimateKey(actor, payload) {
  return JSON.stringify({actor, ...payload});
}
export function invalidateEstimate() {
  return {quote:null, quoteKey:'', acceptCancellation:false, acceptTransport:false};
}
export function canSubmitEstimate(state, currentKey) {
  return !!state.quote && state.quoteKey===currentKey && state.quote.transport!==null &&
    state.quote.guardianTotal!==null && state.acceptCancellation && state.acceptTransport;
}
export class QuoteGuard {
  epoch=0;
  invalidate() { this.epoch++; }
  begin(key) { return {key, epoch:++this.epoch}; }
  isCurrent(ticket, key) { return ticket.epoch===this.epoch && ticket.key===key; }
}
export function transportInput(value) {
  if(value.trim()==='')return {};
  return {transportAmount:Number(value)};
}
