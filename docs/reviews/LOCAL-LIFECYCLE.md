# Artifact review — local-lifecycle S03

- case/task_id: local-lifecycle / LL01–LL09
- target_commit_or_document_revision: 865139aa7a7e8bd4a7071771fb63eda35859ad27
- source_commit: e8690718e1eee4a721d0df5ea66406cfc50b9ae5
- tree: 0e6dc2fb46c6f97d7db74ff146f075ff7d824057
- revision_record: evidence/local-lifecycle/S03-verification/revision.json
- status: complete
- verdict: PASS within the approved local synthetic increment
- unresolved_blocking_findings: 0
- reviewer: independent artifact reviewer; no children, tracked edits, commits or external changes.
- before_verify: PASS 2026-10-17T09:57:09.190434Z, observed exact head/tree.
- after_verify: PASS 2026-10-17T09:58:50.601227Z, verify-S03-after.json, same head/tree and clean worktree.
- usage: unknown

## Closed findings

F01 (BC04 explicit consent missing conditionHash) is closed. S02 adds append-only consent records with actor/action, report identity/version, observed booking revision, operation ID, timestamp, saved quote/rule and canonical condition snapshot hash. Report and settlement link the consent. The independent verifier exercised atomic failure/retry, replay/restart/concurrent exact retry, stale report rejection, corrections and historical immutability, and timeout-to-explicit upgrade. Five snapshots/hashes were independently reconstructed with Python. The source structure matches those observations; profiles are not used to reconstruct historical agreement.

F02 (sitter proceeds missing in booking/report detail) is closed. S03 src/lifecycle.tsx:6 and :45 adds optional saved fee/takeHome fields and sitter-only rows. Display reads persisted values directly, labels the 15% fee and proceeds excluding transport, and retains unknown legacy values instead of recomputing. Final parent CUA and reviewer image inspection confirm fee990, proceeds5610, transport500, total7100 at375px and1280px; guardian view omits sitter fee/proceeds and retains total7100. Original finding and S02 non-pass remain in REVIEW-S02.md.

## Evidence mapping

| Acceptance | Review conclusion and evidence |
|---|---|
| LL01 | PASS: server-side participant/role checks precede replay; field allowlists prevent supplied actor/amount/notification/approval flags; recipient-only notices; new consent projection retains participant ACL. Independent S01 ACL and S02 focused consent evidence. |
| LL02 | PASS: saved booking/request snapshots and detached original operation results retained; optional new collections allow schema1 reads. Missing legacy values stay unknown; profile/rate edits do not change settled quote. Independent S01 legacy/full API flow/restart; S02 saved snapshot/hash checks. |
| LL03 | PASS: scheduled start, ordered transitions, expected revision, operation fingerprint and original interval protection; mutation clone/persist-before-swap prevents partial accepted state. S01 order, slot and fault scenarios plus source review. |
| LL04 | PASS: persistent Web/outbox with unique keys and durable leases; exact missing-report deadline, no automatic amount from missing report; only Web plus accepted mail establishes clock, partial failures retry. Independent S01 reminder/notification and delayed worker evidence. |
| LL05 | PASS: exact notification+24h gate, corrected version origin, old response isolation, permanent failure invalidates automatic ready and preserves explicit ready. S01 boundary/notification plus S02 explicit-upgrade scenarios. |
| LL06 | PASS: dispute holds pending ready; explicit approval requirement remains across versions/time; resubmission does not resolve dispute; only current consent resolves. Independent long-delay and stale-version tests; parent S01 48h flow; S03 report3 approval. |
| LL07 | PASS: one Store writer sequences approval/dispute/job, at most one active ready; accepted dispute leaves no active ready; held histories retained. S01 twenty-operation groups and S02 exact-retry/upgrade checks; no external processing/success fabricated. |
| LL08 | PASS within defined local semantics: API atomic failures/retry/reopen, pending-job restart; CUA real connection failure retains reason and has no false success, same-content retry succeeds once, persisted state survives restart, different actor has no leaked details. Explicit current-state reload preserves component draft. |
| LL09 | PASS: parent S01 full search/chat/request/accept/start/end/report/notice/approve/dispute/chat/correction flow at375/1280; S03 corrected amounts, guardian separation and report3 explicit approval. Reviewer viewed S02 error image and all three final sitter-mobile/sitter-desktop/guardian-mobile images; Japanese/amount labels are visible and no amount clipping is observed. |

## Revision and carry-forward basis

1. Initial production source a5aab6a9d3ea9e7f1150acaaf5122b4c445c9340 was independently verified at358a34da157223da98012839d030f2a424db810c. VERIFICATION-S01.md records13 groups,12 pass and F01 fail, not an overall PASS.
2. S02 source f64e6631550b6b67641f968bda9a9ae8f65b9189 was fixed at29e732b0279c54c274f4d1310190b33fa6d8b3ae. The production delta from S01 is consent logic in lifecycle-domain.mjs only. Independent VERIFICATION-S02.md records3 focused groups plus5 independently recomputed hashes, all pass; prior12 groups carry with the unchanged timer/mail/reservation logic and targeted changed-path coverage.
3. S03 source e8690718e1eee4a721d0df5ea66406cfc50b9ae5 and final target above change only the lifecycle quote type and two role-specific display rows in production. Domain/server/routes/dependencies are identical to S02. Task/status/implementation-document changes do not alter behavior. S02 API verdict therefore carries; parent rebuilt/reloaded S03 UI and supplied new visual/interaction evidence.
4. S02 implementation suite log evidence/local-lifecycle/S02/tests.txt independently read by reviewer:44 tests,44 pass,0 fail. This remains implementer evidence, not a reviewer rerun. S03 typecheck/build PASS is recorded by the implementer/parent. No broad repeated suite is needed for the localized display delta.

## Evidence references

- evidence/local-lifecycle/S03-verification/revision.json
- evidence/local-lifecycle/artifact-review/verify-S03-after.json
- evidence/local-lifecycle/artifact-review/REVIEW-S02.md
- evidence/local-lifecycle/independent/VERIFICATION-S01.md and run-S01/run-S02/run-S03 scenario stores and HTTP logs
- evidence/local-lifecycle/independent/VERIFICATION-S02.md, verify-S02-after.json, run-S04-consent/results.json/http-log.json/independent-python-hash.json and final stores
- evidence/local-lifecycle/browser-S01/cua-report.md and screenshots
- evidence/local-lifecycle/browser-S02/cua-report.md, network-error.jpg and network-error.txt
- evidence/local-lifecycle/browser-S03/cua-report.md, lifecycle-final-sitter-mobile.jpg, lifecycle-final-sitter-desktop.jpg, lifecycle-final-guardian-mobile.jpg and saved DOM/state files
- docs/verification/LOCAL-LIFECYCLE-IMPLEMENTATION.md

## Limits and next action

Deliberately delayed actor-response injection was not performed; source review verifies actor/tab keyed unmount and live guards on async response paths. No claim of exhaustive browser/WCAG coverage is made. Component drafts persist through polling/error/current-state refresh, not full page reload/navigation; persisted server state survives restart. This matches the documented bounded semantics rather than claiming durable unsent drafts.

This verdict covers the approved LL01–09 local synthetic increment only. G10/G16/G17b as whole tasks, real authentication/database/mail/payment, unimplemented operations/support, amount-changing extensions, D1–D4 and public release remain open. No payment or email was executed. PASS does not authorize push, PR, merge or deployment.

Parent may record this bounded increment complete and attach these exact-version evidence references. Any later HEAD change, including documentation-only completion bookkeeping, requires a new capture and explicit delta-based carry-forward under runtime-checks; do not relabel this exact-head verification as a different head.
