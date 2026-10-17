# Quarter-hour input artifact review

- task: time-input / S01
- verdict: PASS
- base: eeb5bc4d413e5025f6a527e8da5e0a9bd68214ab
- reviewed_source_commit: ad05ad16008ae03bbe36eb3591eb7532d988884d
- reviewed_source_tree: 0857a30a7fa1dcd7bfd0ffbcc0a71382eaa968b8
- revision_record: evidence/time-input/S01/revision.json
- independent revision verification: PASS at 2026-10-17T04:59:29.826836Z and 2026-10-17T05:01:07.461328Z.
- browser postcheck: evidence/time-input/S01/browser-postcheck.json, PASS at 2026-10-17T05:00:48.184489Z.

No blocking defects found in the bounded source diff and supplied runtime evidence. The reviewer inspected the actual source, saved DOM results, and all three relevant screenshots independently; browser interaction was performed by the parent.

| Acceptance | Review evidence |
|---|---|
| Quarter-hour selection on search, consult, and estimate | Shared RequestConditions renders native date inputs and time selects. The source generates all 96 distinct values from 00:00 through 23:45; options.json records 96 valid options for both endpoints on all three screens. No free minute field remains. |
| Preserve the other half of the datetime | Date changes retain time and time changes retain date. 01-search-desktop.png, 03-consult-desktop.png and 05-estimate-mobile.png show 2026-10-24 with 10:15/13:15. 04-incomplete-date.txt shows a cleared date retaining 10:15, with recalculation disabled; the parent verification records successful date restoration. |
| Validation and Japan time | Existing +09:00 serialization and minimum-three-hour/15-minute guards remain. The added finite-date guard rejects incomplete internal strings. 02-minimum-time.txt records the two-hour error and disabled search. API validation code is unchanged. |
| Invalidate stale estimates and consent | Both date/time controls call the existing updateConditions invalidation path. 06-time-change-invalidates.txt shows end time 13:30 with the old quote removed, consent unchecked/disabled, and submission disabled. Existing quote-state regression output covers invalidation and late-response rejection. |
| Labels and errors | Every date/time input has an explicit, unique screen-prefixed label, aria-invalid and help reference. Help remains aria-live polite. Saved DOM exposes the expected accessible names and native combobox roles. |
| Narrow layout | Independently viewed 01-search-desktop.png, 03-consult-desktop.png and 05-estimate-mobile.png: date text, time and Japanese labels remain readable. options.json records viewport and scrollWidth both 375px, date width 193px and time width 100px. |
| Build and regression evidence | checks.log preserves actual successful TypeScript, Vite build and 17/17 test outputs. implementation.json records commands and initial environment failures. No unnecessary full rerun was requested. |

Evidence is under evidence/time-input/S01/ and is excluded from Git. Parent verification details are in docs/verification/TIME-INPUT.md.

Limitations: this is the local synthetic demo and a bounded input correction review. Cross-browser/device coverage and a complete assistive-technology/WCAG audit were not performed. Japan-time serialization and API validation retention were checked in source; this review does not claim a new timezone-matrix or production test. The first programmatic empty-date fill did not emit the application event; the actual Backspace interaction and resulting DOM were used for the incomplete-date verdict.

Reconfirmation: this verdict names the source commit above. A later documentation commit requires a fresh captured revision and independent confirmation that the intervening diff is documentation-only before carrying this evidence forward. Product changes require review of the changed scope and relevant checks.