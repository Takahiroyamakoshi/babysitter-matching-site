# Task
- id: local-ux-refresh
- purpose / scope: 既存合成デモの検索・相談・見積り導線を改善。全体再設計・外部公開は対象外。
- requirement_ids: UX01-UX09（docs/design/UX-REFRESH.md v0.2）、S02-S06、第21/26/29/30章
- dependencies: REQUIREMENTS.md v0.45; IMPLEMENTATION.md v0.2; UX-REFRESH設計の独立監査
- acceptance_and_verification: 下表。同一ソース版へ実装・試験・画面証拠を紐づける。
- assigned_agent: 実装担当 → 親の実ブラウザー検証 → 独立成果物レビュー
- state: verifying
- state_version: 2
- updated_at_utc: 2026-10-17
- revision_record: v0.2。要件v0.45第30章のIDへ統一。独立設計・計画監査 v0.2 PASSに基づく実装タスク。
- cycle: initial
- failed_submissions: 0
- additional_used: false
- pr / head / base / tested_revision: 親が着手/提出時に実測記入。リモート・PR・公開なし。
- plan_approval_reference: 親から受領したユーザーの競合画面調査と既存UI修正依頼/個別指摘。通常設計は委任済み。範囲拡大は親へ返す。

## 実装順・責任
| Task / 依存 | 所有・作業 | 完了条件と確認 |
|---|---|---|
| T1 / 独立設計監査 | 実装担当: server.mjs、server.test.mjs。共通検索検査、任意交通費見積り、正式提案/双方確認、互換性。 | UX02/03/09・横断条件。2時間45分は検索API422、3時間正常、4人422。交通費なしは保育料のみ/総額null、提案500円でservice+500。0は明示時のみ、負/小数/文字列等拒否。新規正式依頼は未確定/未確認拒否、承認で交通費確認必須。旧保存料金/旧成功操作再送/異内容ID拒否/再起動保持を回帰確認。 |
| T2 / T1契約確定 | 実装担当: src/main.tsx、src/style.css。入力を検索/相談で共用、児童別DOB、表題、区分、カード、条件付きタブ、料金表示。 | UX01/03/04/05/06/07/08/09・横断条件。1〜3人のみ、別DOBの2児をAPIへ送信。相談で変更してもチャット/相手維持。変更と再見積りで旧見積り/同意を無効化、古い非同期応答を不採用。未選択タブ非表示、guardianにfee/takeHomeなし、sitterには区分あり。 |
| T3 / T1+T2 | 実装担当: typecheck/build/既存testと必要回帰。親: cuaによる実画面。 | 375px/1280pxで検索→選択→相談内編集→交通費除く概算→提案額/全総額確認→正式依頼→シッター確認/承認。最低時間エラーと正常0件を区別。昼/夜境界で二重加算なし。通信失敗は入力保持・再送で1件。表題/タブ/カード年齢人数/デモ表記を画面証拠化。 |
| T4 / T3 | 独立成果物レビュー担当 | UX01〜09/保持保証を同じ版の差分と証拠で判定。未検証を明記、修正箇所は再確認。親が最終報告。 |

T1/T2を分担する場合は型/API契約を先に確定。他担当の編集を巻き戻さない。計画担当の所有は設計・本計画だけ。UIの実装を鏡写しする試験は増やさず、未確定料金/正式依頼ゲート/同意失効/再送・保存互換性を重点検証する。全体サイドバー・交渉自動化・決済・本番認証は追加しない。

## Trials
- UX-plan-v0.1: 現行コード/要件/親の公開画面観測を照合。独立監査前。コード/動作の合格を示さない。

- UX-plan-v0.2: 要件v0.45第30章の正式IDに対応を統一。内容の範囲は維持。

## Current / resume
- last_verified_progress: UX01〜09の設計/タスクが独立監査PASS。公開競合監査と現行APIの最低時間エラーを確認。検索の例外吸収・同一DOB複製・保護者への手取り表示・固定交通費を現行コードで確認。
- remaining: T1/T2実装、T3検証、T4成果物レビュー。
- child_or_process_state: 計画担当は子/ブラウザー/アプリを起動していない。
- uncertain_external_operations: なし。公開競合観測は親、外部書込みなし。
- next_check: 実装担当の固定版を受領し、独立API検証と親の実ブラウザー検証へ渡す。
- usage_and_source: 不明

## Acceptance / reviews
- v0.2: 独立設計・計画監査PASS。実装の合格は未判定。既存L01〜L08を緩めない。
- source / tested_revision / evidence: 未提出。

## Interventions / timing
- 2026-10-17: 親から局所改善/公開競合参照/交通費二段階/既存保証維持を受領、UX01〜09へ具体化。

## Parent transition
- state_version: 2
- design_plan_audit: docs/design/UX-REFRESH-AUDIT.md; design/plan v0.2 PASS reported
- scope: user-authorized existing UX01-UX09 fixes; no global sidebar or deployment

## Parent verification transition
- state_version: 2
- trial: S01
- implementation_report: typecheck/build/17 tests PASS reported; final source commit/capture pending
- remaining: independent API checks, parent CUA desktop/mobile checks, artifact review
- transitioned_at_utc: 2026-10-17T04:33:04.532633+00:00
