# Task: TECH-SELECTION
- purpose: 技術・言語・DB・ホスティング・認証・保存・通知・決済の推奨構成と代替、費用、採用条件をまとめる。
- requirements: REQUIREMENTS.md v0.45 第24/26/29章、IMPLEMENTATION-CHECKLIST G01/G03/G05
- authorization: 技術構成比較案を作る提案にユーザー「OK、じゃあ頼むぜ。」
- scope: 公式資料の調査、ローカル文書作成・静的検証・独立設計監査。外部契約/支出/プロジェクト作成/送信/実決済/実情報取得/公開なし。
- state: complete
- state_version: 4
- owner: parent
- assigned_agents: tech_infra / tech_payments / tech_design
- cycle: initial
- failed_submissions: 0
- usage: 不明
- acceptance: 全体要件への適合・月5000円ソフト+1000円AI目標・契約上未確認の分離・具体的推奨・実装移行順・独立監査。
- prior_progress: 全体計画と現状棚卸しは完成、製品本番構成は未確定。
- next_check: 比較案と調査結果の受領

- progress: TECH-STACK initial design saved; payments research v0.1 complete; infrastructure research finalizing.
- assigned_reviewer: tech_review

- intervention: Clarify Stripe-managed risk and embedded alternative; do not assume platform loss responsibility merely to use Express.
- payment_research_followup: bounded primary-source addendum requested; no external state changes.

## Acceptance / reviews
- 技術選定設計: PASS。docs/design/TECH-STACK-AUDIT.md、TS-A01〜05解消。
- 成果物: TECH-STACK v1.0、TECH-INFRA v1.0、TECH-PAYMENTS v0.2。
- 推奨: React/Vite/TypeScript + Cloudflare静的配信 + Supabase Pro/Postgres/Auth/Storage/Edge/Cron + SES。決済はStripe Connect条件付き優先確認、AIはOpenAIテキスト評価候補。
- 仮定FX150円/10%加算でソフト月4464〜4879円、AI別上限1000円。実見積り/実測ではない。
- 静的リンク/文書形式/費用算術/公式出典の独立照合。製品コード変更・全試験再実施・外部状態変更なし。
- 未完了: G01全業務契約、G03原子承認/権限/画像/復旧等T01〜10実証、G05契約/損失/費用、日本適合、D1〜D4と公開。
- next_action: 具体案を提示し、既許可のローカル設計と実証へ展開。実契約/支出/送信/実資金/実情報/公開は未承認。
- environment_note: WSLにSupabase CLIとDocker wrapper、Windowsにdocker.exeの存在確認のみ。daemon/CLI版・接続先/実動作は未確認。
- usage_and_source: 不明
