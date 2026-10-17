# NEXT-CORE independent artifact review

- case/task_id: initial-local-mvp / next-core / N5
- review_revision: 1.0, 2026-10-17
- reviewer_role: independent artifact-reviewer
- verdict: PASS
- status: complete
- must_fix: none remaining
- target_commit: 483a43c5dacf39ebdd27bef58eb25e51b6c64fb6
- target_tree: 9ffbdbb6d2dda93026813dfa20aef09f16289680
- base_commit: 1b8ae0d4e40d31e69a3604491288fa5cbd065c0e
- requirements: docs/design/NEXT-CORE.md v0.1; docs/tasks/NEXT-CORE.md Technical plan v0.1; independent design/plan PASS in docs/design/NEXT-CORE-AUDIT.md.

## Revision and evidence integrity

The reviewer inspected source and actual evidence without changing product code, running browser automation or performing external operations. Source capture: evidence/next-core/S02/revision.json. Independent reviewer verify passed at 05:28:54Z (evidence/next-core/artifact/s02-precheck.json). Parent browser postcheck passed at 05:30:34Z on the same full SHA/tree (evidence/next-core/S02/browser-postcheck.json). This report is written after that postcheck as authorized by the parent.

S01 source 93660420a0e6c894de3e1438782258340aa067a0 was independently inspected and verified. S02 changes product code only in the registration form/state in src/main.tsx; other changes are records/README. Git comparison independently confirmed server.mjs, profile-domain.mjs, src/profile.tsx, src/action-state.mjs and src/quote-state.mjs unchanged. The hashes in evidence/next-core/S02/api-source-hashes.json support carrying independent API results. Carried S01 browser observations apply only to unchanged profile, settings, search, price and acceptance paths. S01 overall acceptance is not carried: registration was unverified because the IAB native prompt could not be operated. S02 replaces it with an inline form and supplies a new end-to-end run.

S02 evidence/next-core/S02/checks.log records typecheck/build and 26 tests passing, no failures. The standard package test command includes next-core.test.mjs. Existing tests were not weakened; server test edits only supply newly required expectedRate for fresh requests.

## Requirement judgment

| Requirement | Judgment and decisive evidence |
|---|---|
| NC01 role navigation/registration | PASS. Role-specific navigation, cleared actor context and sitter consultation entry points. S02 registration has synchronous pending exclusion, disabled fields and actor/view/draft tickets. Parent records16-21 show both new roles immediately editing, and new guardian search/chat/request/approval/reload. |
| NC02 own profile | PASS. Actor-derived /me, name/region validation, revision checks and successful display update. Real two-tab conflict preserves input and explicit reread/retry succeeds (02-profile-conflict.txt). Bootstrap polling does not overwrite local form drafts. |
| NC03 saved children | PASS. Stable server IDs, owner checks, valid dates, newborn storage, max12 and restart independently tested. Add/edit UI has no deletion. Profile edits do not rewrite request children. |
| NC04 child selection | PASS. Shared input supports manual/own-child selection, rejects duplicate selection with a reason, detaches on DOB edit and invalidates estimate/consents. Browser03/04/12 and S02 17/18 confirm behavior. A rejected duplicate keeps the previously valid row; it does not disable an otherwise valid search. |
| NC05 sitter settings | PASS. Seven weekdays, date overrides and weekly restoration connected to owner API. Edits cannot alter review permissions. Independent API and S02 new-sitter UI show saved settings while listing remains pending. |
| NC06 ownership/privacy | PASS. Actor-derived self reads, per-child ownership and allowlists reject cross-owner IDs, wrong roles and privilege fields. Bootstrap excludes guardian children/internal review fields. Loopback/Host/Origin and participant checks remain. |
| NC07 availability | PASS. Shared search/create/approve predicate handles JST, exception priority, quarter hours, end24 and legacy defaults. Approval checks current settings inside Store.mutate. Independent tests and browser08-11 prove closure rejection, reopening and confirmed bookings unchanged after closure. |
| NC08 price/snapshot/legacy | PASS. Fresh expectedRate validation follows successful-operation lookup; price remains server-calculated. PRICE_CHANGED keeps context and revokes estimate/consents. Browser06-12 shows stale2200 rejected after2400, later2600 retaining saved7200 care/500 transport, and DOB edits preserving old requests. S02 confirms7800 plus explicit zero transport through approval/reload. Legacy schema1 fixtures retain old request/approval replays and pending quote values. |
| NC09 atomicity/retry/stale UI | PASS. Candidate publication follows persistence; profile operation results are cloned. Revision/data/operation roll back together on failure. Same-ID replay remains original after edits/restart. Busy ownership is separate from draft/result validity; actor/view exit and changed/restored draft IDs invalidate old actions. Profile fields disable while pending and ignore unmounted responses. |

## Independent API evidence

All 11 API/domain groups have passing evidence: ownership/privacy; child/date limits; revision races/retry/rollback; profile/settings restart; immutable original results/max-name roundtrip; JST/availability/legacy defaults; search/create/approve; frozen price/children; two actual schema1 fixture groups; retained eligibility/medical/duration/buffer/concurrent approval.

Raw records: evidence/next-core/independent/final-9366042-20261017T0523/run.log (10 PASS, one oracle failure), corrected-9366042-20261017T0525/run.log (remaining group PASS), and matching precheck.json/postcheck.json in both directories. The initial pretransport restart assertion compared an in-memory undefined property against its intentionally omitted JSON representation. The corrected assertion compares the saved state's JSON representation. Exact old quotes and replay-result comparisons remain. This is a justified oracle correction, not a product defect hidden or an acceptance requirement relaxed; raw failure is preserved.

## Browser evidence and visual inspection

evidence/next-core/parent/browser-results.json maps observations to source/requirements. Parent used CUA against isolated synthetic loopback server8792. The reviewer independently opened 14-settings-mobile.png, 15-profile-mobile.png, 19-S02-new-confirmed.png and 21-S02-profile-desktop.png: Japanese text, role navigation, labels, settings/profile layout and confirmed totals are readable. The 375px checks use images14/15 and parent's width observation. Image13 is desktop despite its filename and is excluded as mobile evidence. Records16/20 show new sitter pending after save and guardian confirmed7800 without displayed platform fee.

## Resolved findings and limits

Pre-submission review identified mutable original profile-operation results, maximum-length name roundtrip failure, stuck busy state after draft changes, late message response clearing new text, and late quote/registration responses after view exit. Corrections and regression checks were inspected. S01 registration acceptance was incomplete; S02 closes it with the inline form and actual new-account flow. No must-fix remains for NC01-NC09.

Forced browser network loss/delayed-response interception was not simulated. These paths rely on inspected guards, unit tests and independent atomic/retry/concurrency API checks, supplemented by actual UI revision-conflict recovery; they are not claimed as browser observations. No exhaustive WCAG/all-browser audit, production auth, real PII, payment, email or deployment was verified. These limits do not block this local synthetic increment. Wider marketplace features remain outside scope.

## Handoff and recheck conditions

Parent may reconcile lifecycle records. Source changes require affected checks and updated capture. A documentation-only final commit needs a new capture and explicit source-unchanged carry-forward record. This PASS is tied to the SHA above, not an unexamined future head.

## Result

- case/task_id: initial-local-mvp / next-core / N5
- target_commit_or_document_revision: 483a43c5dacf39ebdd27bef58eb25e51b6c64fb6; design/technical plan v0.1
- revision_record: evidence/next-core/S02/revision.json; artifact/s02-precheck.json; S02/browser-postcheck.json
- status: complete
- summary: Independent artifact review PASS for NC01-NC09; no remaining must-fix.
- unresolved: No blocking findings; browser fault injection and exhaustive accessibility/cross-browser checks unperformed as described.
- artifact_review_evidence_references: source comparison, automated logs, independent API raw outcomes, parent CUA references above.
- next_action: Parent completes lifecycle records and captures documentation commit with source-unchanged carry-forward.
- usage: 不明
