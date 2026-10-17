# Local lifecycle verification
- scope: LL01–LL09, normal one-off synthetic local bookings only.
- source: e8690718e1eee4a721d0df5ea66406cfc50b9ae5.
- final verified/reviewed target: 865139aa7a7e8bd4a7071771fb63eda35859ad27.
- exact record: evidence/local-lifecycle/S03-verification/revision.json.
- outcome: scoped independent API/domain, parent CUA, integrated smoke and artifact review PASS.
- final documentation record: evidence/local-lifecycle/final/revision.json; product unchanged after above target, carry-forward review recorded separately.
- design/plan: [contract audit](../design/BUSINESS-CONTRACTS-AUDIT.md), [task](../tasks/LOCAL-LIFECYCLE-PLAN.md), [implementation](LOCAL-LIFECYCLE-IMPLEMENTATION.md), [artifact review](../reviews/LOCAL-LIFECYCLE.md).

## Conditions and evidence
| Acceptance | Observation / result |
|---|---|
| LL01 | Party-only details and role commands; third party/wrong role/field override/self approval rejected. Independent API PASS |
| LL02 | Old schema1/missing snapshot read without profile reconstruction; saved quote/child/rule preserved through profile edits/retry/restart. Independent API PASS |
| LL03 | Scheduled-start/order/revision/ID checks; atomic failed saves; original booking interval and buffer preserved across statuses. Independent API PASS |
| LL04 | Unreported exact24h reminder uniqueness; partial/temporary/unknown notification and restart; no auto timing without both channels. Independent API PASS |
| LL05 | Exact24h, correction origin, stale delayed result/permanent failure vs explicit consent distinction. Independent API PASS |
| LL06 | Dispute holds automatic ready; repeated corrections/time alone cannot resolve; latest explicit approval required. Independent API and parent48h CUA PASS |
| LL07 |20 mixed approval/dispute/job/retry calls, at most one active ready, held history; immutable condition-bound consent snapshots/replays. Independent API PASS |
| LL08 | Atomic fault/retry/restart; actual browser communication failure retains draft/no false success/same-content retry; different guardian shows no prior details. PASS in tested scope |
| LL09 | Parent IAB CUA1280x900/375x900: search/chat/estimate/request/accept/start/end/report/bell/approval/dispute/chat/correction/latest explicit approval/ready. Sitter fee/proceeds and guardian total verified, Japanese readable, no horizontal overflow. PASS |

## Separate evidence units
- Implementer:44/44 automated tests (26 regression+18 lifecycle), evidence/local-lifecycle/S02/tests.txt. S03 only adds role-specific snapshot display/types; no arithmetic or API/domain changes.
- Typecheck/build: S03 PASS using existing Windows Node dependencies; no install. WSL Node tests PASS. See implementation report for exact commands and native dependency constraint.
- Independent S01:13 scenario groups,12 PASS/1 FAIL (F01 absent consent hash); evidence/local-lifecycle/independent/VERIFICATION-S01.md. Original failure retained.
- Independent S02:3 focused groups PASS;5 consent snapshot hashes independently recomputed in Python; failed-save/replay/correction/restart checked. Prior12 passed groups carried by exact source impact review; VERIFICATION-S02.md.
- Independent S03: exact server/domain/profile hashes unchanged from S02, integrated isolated HTTP smoke1/1 PASS including saved amounts/ownership/lifecycle/consent. VERIFICATION-S03.md.
- Parent CUA: evidence/local-lifecycle/browser-S01/cua-report.md, browser-S02/cua-report.md, browser-S03/cua-report.md with screenshots/DOM. S01 flow, S02 real network failure/retry/restart/switch, S03 role-specific display and latest approval.
- Final source artifact review: evidence/local-lifecycle/artifact-review/REVIEW-S03.md PASS; F01 and F02 resolved, blockers0.
- These counts describe different units and are not added into a product-wide pass count.

## Limits and remaining work
Synthetic actors are not production authentication; synthetic mail acceptance is not actual delivery; ready is not charged/paid/payout. No real personal data, payments, email, external contracts, push/PR/merge or deployment.
D1–D4 and all R/P gates remain. G10/G16/G17b whole tasks remain partial. Amount-changing extensions/shortening/expenses, operator resolution, other services and production database are not completed.
Deliberate delayed actor-response injection, full WCAG and all browsers are untested; source unmount/live guard reviewed. Component drafts survive polling/error/reload-current-state, not a full page reload or navigation away.
Existing data was not reset/deleted. Parent reused persisted synthetic state via a new copied store after the initial shell interrupt left a stale lock; original store/lock retained. Later graceful SIGTERM and same-store restart succeeded.
Local user preview: http://127.0.0.1:8796, isolated evidence/local-lifecycle/browser-S02/store.json and visible synthetic clock.
