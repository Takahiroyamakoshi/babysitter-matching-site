# Verification
- requirement_id: L01-L08; specification_revision: REQUIREMENTS.md v0.44 / IMPLEMENTATION.md v0.2 / INITIAL-MVP.md; target_commit: e5d1ac04235c31943803ecdcf5b5f7d4722ae52d; revision_record: evidence/initial-local-mvp/S03/merged-config-revision.json; stage: whole-product（初回ローカル増分）; verdict: pass

## 版の照合
S03 製品版は `99d087a3d0a67709ca101967fd11dd0b2dc2e554`、検証引渡し版は `527a2247cb0c93cfd192a84bbee52794eb7147aa`。検証中の agent 設定だけの遷移で旧 revision record の HEAD 不一致を検出して停止した。親が製品ソース、server、tests、package/lock、Vite、index、README、tsconfig の差分なしを確認し、現 HEAD は新 record と完全 SHA/tree が一致したため S03 証拠を持ち越した。S02→S03 の製品差分は `src/main.tsx` の同意リセットと会話分離だけで、server/API は不変。

| ID | 実際の確認 | 判定 | 主な証拠 |
|---|---|---|---|
| L01 | デスクトップ／375pxで合成保護者を登録。新規シッターの自己昇格不可。資格・研修・届出・初回保険を各1項目未確認にして検索非掲載・依頼拒否。 | pass | `S03/desktop-full-flow.json`、`S03/mobile-full-flow.json`、`S03/missing-boundaries.json`、`api-rules.json` |
| L02 | 地域・資格・時給上限検索、2/3人可、4人不可、生後6か月、小3年度末、1歳境界、乳児資格。 | pass | `S03/desktop-full-flow.json`、`api-rules.json`、`S03/missing-boundaries.json` |
| L03 | 新規保護者の相談と実保護者への返信、第三者分離、operation id 再送、遅延した旧会話応答の隔離。 | pass | `S03/desktop-full-flow.json`、`S03/mobile-full-flow.json`、`S03/conversation-isolation.json`、`api-rules.json` |
| L04 | 昼間・21時・8時・日跨ぎ・端数・交通費・15%、取消率表示、条件変更後の同意解除と再同意。 | pass | `request-boundaries.json`、`S03/consent-reset.json`、`S03/desktop-04-pending-request.png` |
| L05 | 対象シッター承認、24h／開始時刻期限、同時承認1件、移動29分不可／30分可、承認再送、価格スナップショット、辞退 UI。 | pass | `request-boundaries.json`、`S02/api-regressions.json`、`S03/missing-boundaries.json`、`S03/desktop-05-confirmed.png`、`S03/desktop-06-declined.png` |
| L06 | 病児・病後児・投薬を拒否し、保存済み medical=true も承認時に拒否。未知変更 API も拒否。 | pass | `request-boundaries.json`、`S02/api-regressions.json` |
| L07 | 保存失敗時の状態維持、破損停止、二重 writer 拒否。隔離 CLI を Ctrl+C 停止・再起動し登録・相談・成立予約・idempotency を復元。 | pass | `persistence.json`、`S02/cli-before.json`、`S02/cli-restart.json` |
| L08 | loopback、Host/Origin、JSON、未知 actor、1280px/375px日本語可読。応答消失後も入力保持し再試行後の保存は1件。 | pass | `api-rules.json`、`S03/response-loss-retry.json`、`S03/mobile-full-flow.json`、画面証拠一式 |

`tsc --noEmit`、Vite build、`node --test server.test.mjs` は pass（8/8）。Edge 1280x1000 と 375x812 で新規登録→検索→相談→返信→見積り→同意→正式依頼→承認を完了し、デスクトップでは辞退も確認した。証拠は `evidence/initial-verification/S03/`。
`/favicon.ico` 未配置により静的取得だけが500となる単発 console を `S03/favicon-console-observation.json` に記録した。API失敗・画面例外・主要機能への影響はなく、モバイル全動線と回帰試験は error 0 のため軽微な残件とした。
対象はローカル合成デモの初回増分。本番認証、実個人情報、書類実審査、決済、メール、事故運営、クラウド配備、病児・投薬等は未実装かつ受付禁止であり、本番適合・公開の合格ではない。
