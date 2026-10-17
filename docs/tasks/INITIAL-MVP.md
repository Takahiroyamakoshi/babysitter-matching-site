# Task
- id: initial-local-mvp
- purpose / scope: 合成データによる登録・検索・チャット・通常保育の正式依頼と承認。製品全体や公開の完了ではない。
- requirement_ids: S01-S06, S08, Q01-Q05; 第5/6/7/10/11/21/26/29章。IDがない規則は下記 L01-L08 に対応づける。
- dependencies: REQUIREMENTS.md v0.44; IMPLEMENTATION.md v0.2 の独立設計・計画レビュー
- acceptance_and_verification: 下記の受入表・作業順を満たす。ソース版と試験・画面証拠を一致させる。
- assigned_agent: harness_implementer (initial_implementation), then independent verification and artifact review
- state: complete
- state_version: 8
- updated_at_utc: 2026-10-17
- revision_record: 文書 v0.2。コード未作成・未検証。
- cycle: initial
- failed_submissions: 2
- additional_used: false
- pr / head / base / tested_revision: 開始時 Git 未初期化、リモートなし。親の初期化後に実測値を記入。
- plan_approval_reference: docs/PROJECT.md execution_request / human_plan_check。ユーザーの「お願い」で本範囲の開始承認済み。独立レビュー未完了。

## 要件と受入・検証
| ID / 根拠 | 完了条件 | 確認方法 |
|---|---|---|
| L01 / S01,S08,第21章 | モバイル・デスクトップで保護者／シッターの合成登録を完了。新規シッターは確認待ちで検索・受付不能。デモ表記と本人確認でない説明。 | 実ブラウザーで両登録・再読込、新規シッター非掲載、資格/必要研修/届出/初回保険の各未確認で掲載・受付拒否、APIで確認済みフラグ改ざん拒否。 |
| L02 / S02,S04-S06,Q01-Q05,第5/11章 | 地域・日時・年齢・人数・資格・料金・空き枠で検索。合成条件を満たす2人／3人は利用可、4人・未確認条件は不可。乳児資格・幼稚園教諭研修・範囲外年齢を拒否。 | 規則単体/API試験と代表検索を画面確認。利用日、6か月・1歳・小3年度末の境界を固定時計/日付で確認。 |
| L03 / S03,第6章 | 選んだシッターとテキスト相談し両者から確認。第三者の会話を API で取得・送信不可。返信だけで予約成立しない。 | 二役切替で送受信、第三 actor の API、二重送信 operation id の試験。 |
| L04 / 第6/7/21/29章 | 未来・15分刻み・最低3時間の見積りを確認し明示同意して正式依頼。サーバー算出額と条件スナップショット。 | 不正単価／人数／日時／合計を API へ送り拒否またはサーバー正値使用を確認。昼間・21時・8時・日跨ぎ・端数・交通費・15%を単体試験。 |
| L05 / 第6/26/29章 | 受信シッターだけが承認し成立。期限 min(24h,開始) は境界以上で失効。承認待ちは枠を占有せず、成立枠と移動30分は競合を拒否。 | 開始まで24h未満／超・期限直前／ちょうど／直後、承認二重実行、異なる保護者からの同時重複承認で成立1件、移動29分不可/30分可の API 試験。 |
| L06 / S07,第10/11章 | 病児・病後児・投薬、未実装サービス、未確認人数条件をサーバーで受付不能。 | 検索・見積り・作成・承認への直接 API、通常保育+医療フラグ、条件未確認 fixture、クライアント許可フラグ改ざんを試験。変更 API が受付可能になっていないことを確認。 |
| L07 / 第26章,設計v0.2 | 保存成功後のみ成功表示。登録/チャット/予約が再読込・再起動で存続。保存失敗・破損は既存データ維持、黙って初期化しない。 | 一時保存領域の API 試験で書込み失敗注入、再試行 idempotency、再起動復元、破損起動停止、同保存先の二重起動拒否を確認。 |
| L08 / 第26章,設計v0.2 | loopback のみ、未知 Host/Origin の変更を拒否。画面はラベル・キーボード・入力保持・再試行・失効/競合説明を備える。 | listener 確認、別 Origin API、ブラウザーの送信失敗・下書き保持、375px/1280pxで主要動線、console/runtime error確認。 |

## 実装順と責任
1. **T1 実行基盤**（実装担当）: package/lockfile、React/TypeScript/Vite、Node API、直接 JS エントリ起動、型検査・build・test コマンド。依存導入と最小画面・API 起動を先に確認。必要なら許可範囲でローカル Git 初期化。取得や UNC 起動の失敗は実測エラーを親へ返す。
2. **T2 ドメインと保存**（実装担当、T1依存）: L02/L04-L07 の規則、fixture・actor・状態、原子的保存と直列化、operation id。固定時計と失敗注入で重要境界を単体/API試験。これを UI の正とする。
3. **T3 画面の縦断接続**（実装担当、T2依存）: L01-L05/L08 を日本語 UI に接続。登録→検索→相談→依頼→承認→一覧まで完了。保存失敗で入力を保持し、受付不可の理由を表示。
4. **T4 実動作検証**（独立検証担当、T3依存）: 対象ソース版を記録し build/typecheck/test 結果と実ブラウザー操作を確認。既存 Chrome/Edge 等を調査して実画面を使用。主要動線と失敗時の証拠を保存する。ブラウザー不在なら未検証として親へ返す。
5. **T5 成果物レビュー**（独立レビュー担当、T4依存）: 同じ版の差分と証拠を受入表に照合。重大指摘は実装修正後に該当条件を再検証。親が完成状況をまとめる。リモート・PR・本番公開は本タスクに含めない。

コードと起動手順は実装担当の責任範囲。検証担当は証拠、レビュー担当は判定を所有する。他担当の編集を巻き戻さない。設計変更は親へ返し、受入条件を合格のために緩めない。

## Trials
- initial-plan-v0.1: 文書作成とレビュー指摘の参照章・審査条件修正。独立レビュー待ち、失敗計上なし。

## Current / resume
- last_verified_progress: 要件 v0.44、PROJECT.md、planner role / policy / TASK / RESULT と関連 Skill を読了。実装設計 v0.1 と本計画を作成。
- remaining: 独立レビュー、T1-T5、起動手順・証拠・既知制約の引渡し。
- child_or_process_state: planner が子やアプリを起動していない。
- uncertain_external_operations: なし。依存取得の互換性は実装時に検証。
- next_check: 親経由で独立設計・計画レビュー。承認後、確定資料だけを入力に実装開始。
- usage_and_source: 不明

## Acceptance / reviews
- 文書 v0.2: 未審査。コード・動作の合格条件はまだ一つも達成と報告しない。
- 後続の本番認証、制度適合、決済、運営詳細、公開は今回の合格に含まない。

## Interventions / timing
- 2026-10-17: 親より当日中に確認できるローカル初回増分へ限定、運営 AI 詳細は後続という指示を受領。

## Parent transition
- state_version: 8
- design_plan_audit: docs/design/INITIAL-AUDIT.md; design/plan v0.2 passed
- execution: authorized local initial scope; no remote/PR/deployment

## Parent verification transition
- state_version: 8
- source_submission: 4e305da8e9b5fca49c53e992785811d3abdeecf0
- implementation_checks: typecheck PASS; build PASS; tests 5/5 PASS
- next: independent browser/API verification; source frozen

## First verification result
- state_version: 8
- tested_revision: b86b986fa501aa85add04815d07dd10f3d306b7e
- result: needs-correction; first submission counted once
- verified: typecheck/build/test5; API21/21; boundaries17/18; persistence5/5
- blockers: consent quote reset; approval medical recheck; buffer equality; UI controls/privacy/retry gaps
- evidence: evidence/initial-verification/

## Corrected submission verification
- state_version: 8
- source_submission: d622eb9db93dc774cbf43accf9837d795d061d96
- checks: typecheck/build PASS; regressions8/8 PASS
- next: independent re-verification, source frozen

## S02 independent result
- state_version: 8
- tested_revision: b15951be9f9b5a13601351b9289a76cdf08ba046
- result: needs-correction; second submission counted once
- passes: medical approval recheck; 30min travel gap; isolated real CLI stop/restart
- remaining: renewed quote consent; delayed conversation identity guard/valid sitter initial peer
- evidence: evidence/initial-verification/S02/

## S03 verification handoff
- state_version: 8
- source_submission: 99d087a3d0a67709ca101967fd11dd0b2dc2e554
- checks: typecheck/build/test8 PASS; implementer Edge UI regressions PASS
- next: independent targeted regressions and full desktop/mobile flow

## Independent verification PASS
- state_version: 8
- product_revision: 99d087a3d0a67709ca101967fd11dd0b2dc2e554
- current_verified_metadata_revision: e5d1ac04235c31943803ecdcf5b5f7d4722ae52d
- result: L01-L08 PASS; desktop/mobile full flow; API; persistence; retry
- report: docs/verification/INITIAL-VERIFICATION.md
- metadata_changes: concurrent agent configuration only; product diff zero; no branch restoration
- known_minor_issue: favicon resource missing, no functional API impact

## Initial local increment complete
- state_version: 8
- verification: docs/verification/INITIAL-VERIFICATION.md PASS
- artifact_review: docs/review/INITIAL-ARTIFACT-REVIEW.md PASS
- code_revision: 99d087a3d0a67709ca101967fd11dd0b2dc2e554
- scope: local synthetic initial increment only; not full product or production readiness
- remaining_product: production auth/qualification workflow, meetings/escort/recurrence/extensions, payments, operations AI and release checks
