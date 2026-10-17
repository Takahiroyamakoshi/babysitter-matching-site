# Local lifecycle implementation — S01 / S02

- task: local-lifecycle / LL01–LL09
- implementer outcome: implementation and unit/API checks complete; independent verification, browser evidence and artifact review pending. This is not product-wide completion.
- initial S01 source revision: use `evidence/local-lifecycle/S01/revision.json`, captured from Git after this document and source are committed. No manually inferred SHA.
- audit inputs: BUSINESS-CONTRACTS.md / LOCAL-LIFECYCLE-PLAN.md; BUSINESS-CONTRACTS-AUDIT.md PASS, A01/A02 included.
- external operations: none. No push, PR, merge, real mail, payment, production data, reset or deletion.

## Changes and checks

`lifecycle-domain.mjs` adds authorized booking commands, revision/operation replay, immutable reports, disputes, notification Web/outbox, synthetic adapter leases/retry, and one settlement entry per report version. Store mutations persist state/history/outbox/operation together. The worker records claims before adapter calls and reconciles results by attempt token and report version. A permanent mail failure invalidates automatic timeout ready; explicit consent remains valid, including consent given after automatic ready. A corrected report holds old ready and restarts notification timing. Dispute-required consent stays sticky across later versions.

`server.mjs` exposes participant booking detail/mutations and recipient-only notification reads. Bootstrap returns only the actor's lifecycle data and clock label. All reserving statuses keep the original booking interval plus travel buffer. Legacy operation results/fingerprints stay intact; newly stored operation results are detached snapshots. Missing legacy child data uses only persisted booking/request information and never current profiles.

`src/lifecycle.tsx` connects both roles, saved amount/children/rule, server timestamps, report corrections/history, notices/unread/read, explicit approval, dispute, consultation and settlement status. Polling retains drafts. Failed operations retain the complete original request (including revision and operationId); explicit reload clears attempts for a new confirmation while retaining text. Actor changes unmount the actor-specific panel, preventing late results from updating the next actor.

| acceptance | implementer evidence |
|---|---|
| LL01 | API role/third-party/field allowlist/self-approval rejection and recipient ACL tests PASS |
| LL02 | Missing legacy snapshots/request-only fallback and fixed saved amount test PASS; existing schema1 replay/restart regression PASS |
| LL03 | Ordered start/end, scheduled-start gate, immutable same-ID replay/stale revision, 20 concurrent starts and original-slot protection across every new status PASS |
| LL04 | Web+mail origin, exact unreported deadline, unique reminder, late-report suppression and unknown retry/lease PASS |
| LL05 | 24h−1ms/exact boundary, corrected origin/old delayed result, permanent failure/retry, explicit consent vs delayed failure (A01) PASS |
| LL06 | Dispute holds ready, remains unresolved through repeated corrections and 200 days, current-version explicit approval resolves PASS |
| LL07 | 20 concurrent approvals/disputes/jobs, at most one active ready, held history retained and same-version reapproval PASS |
| LL08 | Atomic failed start/report mutation, retry and restart preserving reports/dispute/notification/operations PASS; UI handling implemented, browser observation pending |
| LL09 | UI implemented; independent 375px/1280px browser verification and visual Japanese-font evidence are parent's pending work |

## Commands and results

- WSL Ubuntu `/home/takahiro/.local/bin/node --test server.test.mjs quote-state.test.mjs next-core.test.mjs lifecycle.test.mjs`: 42/42 PASS (16 lifecycle + 26 regression), output `evidence/local-lifecycle/S01/tests.txt`.
- Windows Node `C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe node_modules/typescript/bin/tsc --noEmit`: PASS, exit 0.
- Same Windows Node `node_modules/vite/bin/vite.js build`: PASS, Vite 8.3.4, 19 modules; CSS 7.65 kB / JS 267.36 kB. Existing Windows dependencies reused, no package installation.
- WSL `npm run typecheck` was unsuitable for the existing Windows native dependency tree (`tsc: Permission denied`; direct Node found missing Linux TypeScript package). Windows Node via README's cmd pushd route succeeded. No validation criterion was reduced.

## Reproduction / handoff

README's new section gives a fresh isolated `evidence/local-lifecycle/browser-S01/store.json` and file clock launch on `http://127.0.0.1:8796`. Initial clock is 2026-10-20 09:00 JST. Create a normal booking for Oct 20 10:00–13:00 JST with transport 500, approve as Aya, advance clock to 10:00, open 成立予約・実績, start/end/report. After worker acceptance, switch guardian, open お知らせ→related booking. Cover approve; then dispute→chat→sitter correction→advance days without ready→guardian explicit approval. For a separate normal automatic path create another nonconflicting booking and advance exactly notification+24h. No fixed waiting or external connections required. The parent may create a different new browser directory if this one already exists; do not reset stores.

Remaining boundaries: synthetic actor header is not production authentication; file-store single writer is not a production database; synthetic adapter acceptance is not actual delivery. No operations/support UI, amount-changing extensions, payment processing, real notifications, final D1–D4 decisions or public deployment are implemented. Drafts are component-local and persist across polling/error/reload-current-state, not across a full browser page reload or leaving that component. Persisted server state survives browser/server restart.


## S02 — explicit consent binding correction

Independent verification found BC04 was incomplete: the S01 `report.approval` stored only actor/time and could not attest to the accepted conditions (`evidence/local-lifecycle/independent/run-S02/explicit-consent-state.json`). The S01 self-tests did not cover this contractual requirement. No policy or acceptance criterion changed.

The minimal correction adds an append-only `consents` collection. Every new explicit report approval records `actorId`, `action=approve_report`, report `subjectId/revision`, observed `bookingRevision`, `operationId`, `acceptedAt`, saved `quote/ruleVersion`, and `conditionSnapshot`. The snapshot binds the persisted booking participants/date/children/service/transport and the submitted report identity/version/text/actual times to that quote/rule. `conditionHash` is SHA-256 of recursively key-sorted JSON for the persisted snapshot. JSON normalization matches on-disk representation, and missing legacy fields remain null; current profiles are not consulted.

The report approval and settlement point to the latest explicit `consentId`. A later explicit approval of the same version appends a new consent and updates the current reference/time without mutating earlier records. A correction keeps old consent/history, holds the old settlement, and requires consent for the new report. An original operation replay returns its original snapshot and creates no new consent. Old successful operations and historical `{actor,at}` approvals are not backfilled or rewritten.

Two focused tests cover independent hash recomputation, snapshot/actor/revision/action binding, immutable earlier records, current-profile changes, stale-version rejection, corrected-version consent, latest explicit action linkage, same-ID replay, atomic save failure and restart identity. Full existing suite: **44/44 PASS** (18 lifecycle + 26 regression), output `evidence/local-lifecycle/S02/tests.txt`.

Changed production code is only `lifecycle-domain.mjs` (Node server domain); `src/`, server routes, dependency tree and browser assets are unchanged. Previous typecheck/build and browser results may be carried forward on that explicit diff basis; independent review and the parent's new consent/failed-draft browser observations remain required. S02 source is fixed by `evidence/local-lifecycle/S02/revision.json` after commit; do not infer a SHA from this prose.
