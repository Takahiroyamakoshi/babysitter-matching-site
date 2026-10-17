# NEXT-CORE independent design and technical plan audit
- audit_revision: 0.1
- date: 2026-10-17
- reviewer_role: independent plan-reviewer
- case/task_id: initial-local-mvp / next-core
- design_gate: PASS
- technical_plan_gate: PASS
- status: complete
- source_baseline: 1b8ae0d4e40d31e69a3604491288fa5cbd065c0e
- target_design: docs/design/NEXT-CORE.md v0.1
- target_plan: docs/tasks/NEXT-CORE.md Technical plan v0.1 / parent state_version 2
- must_fix: none

## Scope and authority
docs/PROJECT.md continued-local authorization and the parent assignment cover synthetic-only NC01-NC09. External operations, production authentication, actual personal information, payment, destructive resets and entity deletion remain excluded. PASS permits this bounded implementation; it is not artifact acceptance, production approval or legal conformity. The reviewer owns only this audit record.

## Design audit
| Area | Evidence and judgment |
|---|---|
| Requirement fit | REQUIREMENTS v0.45 chapters 21/26/29/30 support own profiles, weekly availability/date exceptions, privacy separation, concurrency and the retained UX. Explicitly deferred favorites, inbox, travel-buffer editing and wider marketplace flows do not block this increment. |
| Ownership and allowlists | NC06 derives self from actor, defines child ownership and role failures, and rejects privilege-bearing/unrelated fields. New sitter review flags and available stay non-editable. GET /me and bootstrap projection remove other guardians' children while preserving party-scoped request snapshots. The demo actor switch is explicitly synthetic/local. |
| Atomicity and revision | NC09 fits Store.mutate (server.mjs:146): candidate clone, serial queue, persist before state/result publication. Data, revision and operation result share one commit boundary. Shared profileRevision serializes profile/child/settings updates; successful retry precedes revision conflict checks. |
| Price and snapshots | NC08 closes server.mjs:184-189 stale-display behavior with expectedRate required for fresh requests and matched against current rate inside the transaction. Both increases and decreases require re-estimate; all price calculation stays server-side. Pending/confirmed quote, children, transport and rule snapshots survive profile/settings edits. Approval keeps the saved quote as at server.mjs:196. |
| Legacy replay | NC08 preserves current request and transport-era approval fingerprints. Known successful operations return before new expectedRate gates. The schema1 legacy tests at server.test.mjs:159 onward provide a concrete extension point. No migration/reset is required. |
| Availability/JST | NC07 specifies Sunday index 0, seven entries, closed days, date overrides, legacy fallback and integer quarter hours. Next-day 00:00 is previous-day end 1440; other cross-day joining is excluded. Search/create/approve share the predicate and approval checks current settings inside Store.mutate. Confirmed bookings remain unchanged. |
| UI state | NC01-NC05/09 retain consultation/transport paths and role navigation. Saved-child selection is explicit; duplicate selection is rejected; manual DOB changes detach selection; profile edits do not silently mutate request drafts. Dirty forms, actor changes, stale responses, conflicts, retry IDs and PRICE_CHANGED recovery are specified. |

## Technical plan audit
N1-N5 have explicit dependencies and observable acceptance criteria. The NC01-NC09 map covers each requirement. No new service or dependency is required.
- N1: ownership/allowlist/privacy, stable IDs, revision conflict, restart, failed persistence and operation replay.
- N2: current availability, stale expectedRate without request creation, preserved snapshots, schema1 legacy replay and existing booking guards.
- N3: role navigation, saved-child/manual selection, dirty-form/stale-response handling, price recovery and accepted layout/transport behavior.
- N4: one fixed source revision for typecheck, build, meaningful domain/API tests and parent CUA at 375px/1280px. N5: independent artifact review of that revision.
- Concrete instances of already planned NC07 boundary checks should include Japan-date rollover/Sunday, next-day 00:00 versus 00:15, exception/closed/weekly return and legacy defaults. These are existing requirement checks, not additional features.

## Findings and unverified work
No must-fix design or plan blocker. Current bootstrap child disclosure and missing profile/settings APIs are planned N1 changes, not claims of implemented behavior. Requirements, design, plan and relevant source/test structure were inspected. No implementation tests or browser were run by this reviewer. N4 and N5 remain required.

## Revision record (SHA-256)
| Artifact | Hash |
|---|---|
| docs/design/NEXT-CORE.md | 1433d50fd3db4c274f52deb30edf55293da04c909813cda0e1e6bba93943cbb4 |
| docs/tasks/NEXT-CORE.md, whole file at parent v2 | 9da56a3fbba1830c9e0bc989d5872ba3b19e99747e4aec56927565884b9b0137 |
| docs/design/REQUIREMENTS.md | 86e7b9e467f58c8f20a8c0aeaa53c77fc2ceebd02684cf89edc13f57f9a568bd |
| server.mjs | 7d372255d370ceec192f5a5aa3060759b4684f2f85c018045bb19e00d713263d |
| src/main.tsx | daac3845cf24b834d6814126a6f98bfedee1ef487119cd4611d653f2246d4736 |
| server.test.mjs | cfba00e713d4a59f636c8e5c504242135600cd043e00190715bdcedef62bdc71 |

Parent lifecycle metadata may change after PASS. The gate applies to audited design and substantive Technical plan v0.1 content; substantive revisions require impact review.

## Result
- case/task_id: initial-local-mvp / next-core
- target_commit_or_document_revision: baseline 1b8ae0d; design v0.1; Technical plan v0.1 / parent v2
- revision_record: table above; audit v0.1
- status: complete
- summary: Design PASS; technical plan PASS; no must-fix.
- unresolved: Implementation, tests, browser verification and independent artifact review remain unperformed.
- artifact_review_evidence_references: source references and hashes above are planning evidence only.
- next_action: Parent may dispatch N1-N3, then execute N4 and obtain N5.
- usage: 不明