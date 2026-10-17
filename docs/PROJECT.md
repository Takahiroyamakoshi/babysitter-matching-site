# Project
- case_id: initial-local-mvp
- purpose: 通常の登録・検索・チャット・正式依頼・承認をローカルの合成データで検証できるアプリを作る。
- repository: /home/takahiro/project/babysitter-matching（開始時Git未初期化）
- environment: Windows + WSL Ubuntu。ループバック限定、合成データ。
- design_references: docs/design/REQUIREMENTS.md v0.44; docs/design/IMPLEMENTATION.md
- execution_request: 2026-10-17 通常機能の実装開始についてユーザーから「お願い」。細部の設計は委任済み。
- allowed_operations: 当該ワークスペースのコード・文書作成、ローカル実行・検証、必要な無償開発依存の導入、ローカルGit初期化・コミット。外部契約・本番公開・メール実送信・決済実行・実個人情報の取得は対象外。
- allowed_test_data: 合成利用者・合成資格条件・合成予約のみ。
- production_trigger_on_merge: リモート未設定。マージ・公開は未実施。
- human_plan_check: 登録・検索・チャット・予約から開始する方針を提示し、ユーザーが実行依頼済み。実装範囲が広がる場合は確認する。
- user_decisions: 運営AI詳細は後続。病児・投薬補助は受付無効。最大3人は条件付き。

## Continued local implementation authorization (2026-10-17)
User requested continued implementation after the accepted quarter-hour correction. Ordinary design decisions remain delegated. Next bounded increment is role navigation, own synthetic profile/children management and sitter rate/availability management, integrated with existing search/request/approval. Planning/design and independent audit precede source changes. Existing production/external/destructive boundaries remain. See docs/tasks/NEXT-CORE.md and docs/design/NEXT-CORE.md. No additional confirmation is required for this authorized ordinary local increment.

## Product completion planning (2026-10-17)
The product goal is a platform that maximizes sitter income and supports the full guardian, sitter and operator service lifecycle. The original purpose above describes only the first local increment, not the finished product.
User requested defining the finished state and deriving all implementation tasks before adding more features. The integrated entry point is docs/IMPLEMENTATION-CHECKLIST.md; completion criteria are docs/design/PRODUCT-COMPLETION.md. Requirements v0.45 remain authoritative for business policy. Existing local demos do not meet release readiness.
The present step is to prepare these documents, map existing evidence, audit the integrated plan independently, and present it before further features. Earlier authorization for ordinary local implementation remains in force; this planning step does not revoke it or require repeated approval for routine tasks. The integrated initial plan must be made concrete and reviewable before implementation proceeds from it. External contracts, production publication, real payments, emails and personal data remain outside the present execution scope.
