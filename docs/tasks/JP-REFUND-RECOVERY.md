# Task: JP-REFUND-RECOVERY
- purpose: 日本のStripe Connectでシッター銀行入金済み・Stripe残高ゼロの場合の返金原資と本人からの回収ルートを一次資料で調査し、実行可能性を区別して提案する。
- authorization: ユーザー「先に調べて提案してほしい」
- scope: 公開一次資料・ローカル文書。外部連絡/契約/アカウント調査/資金操作/実情報/実装なし。
- requirements: 要件v0.46、第29章D1、TECH-PAYMENTS v0.2と追加合意
- state: complete
- state_version: 5
- owner: parent
- assigned_agent: jp_refund_research
- failed_submissions: 1
- usage: 不明
- acceptance: pending返金と負残高の区別、日本とConnect構成別の補充/回収/責任、費用・原本情報の経路、継続売上なし/退会時、現金/カード/運営口座経由を含む採否と根拠、未確認の正式確認質問、独立監査。
- prior_context: LOCAL-LIFECYCLEは別タスクで完了。既存5文書に返金方針の未コミット更新があるため保持する。
- next_check: 一次資料調査結果の受領

- independent_reviewer: jp_refund_review (research proposal audit; final document hash required)

- research_result: docs/research/JP-REFUND-RECOVERY.md v0.1 (SHA256 cb959bac96f33afcc825f60be49b7a4c8bfbc48e38da7e4a1393d11eda015115)
- finding: Connected self-funding exists; Japan/current account eligibility and fee availability timing are not confirmed. Platform self-funding is a separate advance route.

- review_A01: Sitter-to-operator cash recovery must be distinguished from parent cash refund; correct source applicability. v0.1 submission counted once.

## Acceptance / reviews
- 最終調査: JP-REFUND-RECOVERY v0.2、SHA256 0ff835cb218c1174a8a6950edfeb272870ce8efdbbd8aeccea1580c42a1e38c8。
- 独立監査: docs/research/JP-REFUND-RECOVERY-AUDIT.md、A01解消。公開一次資料に基づく調査・提案の監査合格。
- A01: シッター→運営の現金回収と、カード利用保護者への現金返金を分離。v0.1提出失敗は1回だけ計上。
- 推奨: 本人銀行→本人Stripe残高→元カード返金のJP適用を最優先確認。代替経路・費用/責任/原本情報・未送信質問9項目を明記。
- 未確定: JP本人補充適格性/名義、feeのavailable計上、回収不能・原資不足/立替、正式契約と資金実証。運営立替や回収方式は未承認。
- 以前の返金費用合意は要件v0.46へ記録済み。今回調査の提案を採用済みにしない。
- 確認: 相対リンク欠落なし、文書差分/UTF8/静的形式、独立出典確認。製品コード/外部連絡/資金/アカウント操作なし。
- environment/product: 既存LOCAL-LIFECYCLE完了と製品未完了の区別を維持。製品試験の不要な再実施なし。
- next_action: 調査結果と採用条件をユーザーへ提示。正式確認には対象口座構成/業種/通貨/送金名義/資金時点を指定する。
