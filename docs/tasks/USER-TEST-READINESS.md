# User-test readiness and UI/UX handoff
- id: user-test-readiness
- state: planned
- state_version: 1
- owner: parent
- authorization: 2026-10-17 user approved implementation-first UX process and Vercel skill installation; requests a review invitation only once the product is usable for users.
- dependencies: Integrated implementation of the agreed initial user-facing scope in docs/IMPLEMENTATION-CHECKLIST.md and docs/design/PRODUCT-COMPLETION.md.
- current_readiness: Not ready; local-lifecycle is one partial increment, not completion of the initial product experience.

## Handoff gate
1. Guardian, sitter and relevant operator tasks in the agreed initial scope form coherent end-to-end flows. Conditional/later features remain explicitly scoped; do not silently reduce required functionality.
2. Ordinary navigation, input, save/failure/retry, permission boundaries and restoration are internally verified on the target revision; independent artifact review has no blocking findings.
3. Users can identify current status, important amounts, required action and next step without developer explanations. Blocking errors, dead-end navigation and misleading success/payment claims are resolved before invitation.
4. Desktop and phone layouts are usable. Apply installed Vercel web-design-guidelines to UI code and product-design:audit to the actual flow; record evidence and remaining limits. AI audits supplement actual user testing.
5. Provide an accessible working preview and representative tasks with synthetic data, scope and limitations. Any unconnected external service is clearly labeled; readiness for user testing is not production release or real payment authorization.

## User testing and refinement
- Give goals, not click-by-click instructions: find a reservation needing action; confirm total/proceeds; complete an ordinary booking flow; raise and resolve a report question.
- Observe wrong turns, hesitation, missed information, errors and completion; gather user feedback.
- Prioritize current status, important amounts and primary action, then refine information placement/details/history from observations. Re-test changed flows.
- UI/UX is refined iteratively; do not declare final usability based solely on automated tests.

## Communication
At the gate, explicitly tell the user:
「ユーザーが一連の操作を試せる状態まで実装・内部レビューが完了しました。レビューをお願いします。」
Attach preview, tasks, known limits and feedback points. Internal progress reports may continue; they are not review requests.
This record does not create a scheduled/background run or expand external/destructive/production permissions.

## Skill installation
- Vercel official repository: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
- Installed local path: C:/Users/PC_User/.codex/skills/web-design-guidelines
- Installer: Codex skill-installer helper, successful on2026-10-17; next-turn availability.
- SKILL.md author vercel/version1.0.0/SHA256 f4647ca866a3accf763777f83e7682954f0187cd6bea7eea0399796652414e8f.
- No UI source changes or installation of other skills in this task.
