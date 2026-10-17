# Design / plan audit — G01 / local-lifecycle

- target_documents_and_revisions: BUSINESS-CONTRACTS.md v0.1 / LOCAL-LIFECYCLE-PLAN.md v0.1
- reviewed_scope: G01 全体業務契約の要件整合と後続入力、および通常単発の合成ローカル増分 LL01〜LL09 の実装可能性・依存・受入条件。技術選定の全監査を反復しない。
- verdict: pass
- design_verdict: PASS
- task_plan_verdict: PASS
- blocking_findings: 0
- reviewer: independent plan-reviewer child; no children started
- head: 31599ad0b187dc29a52284ac9d889503e832f52d
- tree: 6b36e3ef69cb862649c6bfbbae74d8b5ed7270be
- revision_record: evidence/g01/S01-final/revision.json
- before_verify: PASS / 2026-10-17T09:35:36.918866+00:00
- after_verify: PASS / 2026-10-17T09:36:35.775437+00:00

最初に指定された 0d439d45bceeadcb8cb472944a88eecaa4913372 / evidence/g01/S01/revision.json は現 HEAD と不一致だったため、当該旧版へ合格を返していない。親指定の S01-final に切り替え、前後で harness_checks verify を実行した。差分は対象2文書の各1行：レビュー30日起算の G21 留保、LL03 の in_progress/早い ended でも元区間を確保する明文化。この最新本文を監査した。

## 判定根拠

G01 は全体計画 docs/IMPLEMENTATION-CHECKLIST.md:60 の文書成果物条件を満たす。BC01〜08 は予約・実績・決済・銀行入金の状態分離、権限、料金/同意版、期限、通知起算、再送と旧 schema の互換性を後続タスクへ渡せる。D1〜D4 の未決を判断済みに変更していない。

限定計画は実装に進める。既存の通常単発 snapshot を入口として、実施→報告→通知→確認/異議→請求前 ready をひとつの縦断で完成させる。G10/G15/G17a/G18 等の未実装依存は表で合成境界または無効範囲として明示され、G16/G17b 全体の完了へ読み替えない。公開基盤移行や実メール/決済を先行条件にしなくても検証可能である。

| G01 の確認対象 | 根拠と判定 |
|---|---|
| 状態・実績・決済・例外 | BUSINESS-CONTRACTS.md:37 BC03。予約と決済、異議と再提出、処理中/不明/決済済の扱いを分離。明示承認必須が以後の実績版に継承される。PASS |
| 記録・料金版・同意・入力出力 | 同:14 BC02、同:57 BC04、同:74 BC05。成立条件/実績版/規則版/actor の同意参照、元予約維持、交通費未確定と0円、取消/未払い特例が定義される。PASS |
| 現在認可・事故の独立ACL | 同:57 BC04。審査/事故/決済担当を区別し、事故報告は相手当事者に自動共有しない。原本/番地/保険公開を限定。PASS |
| JST・承認期限・通知 | 同:37 BC03、同:84 BC06。期限ちょうど、保険3回、未報告、Web/mail両成立、再通知・恒久失敗・旧版結果が定義される。メール受付と端末到達を区別。PASS |
| 原子性・再送・互換 | 同:102 BC07。現認可→操作ID/fingerprint、保存完了前の成功禁止、outbox、合成データ、旧成功結果保持、前進修正と複製検証。PASS |
| 後続と未決の保持 | 同:112 BC08、同:126 §9。G02〜G25 の入力/出力/独立証拠を示し、G26 医療無効・D1〜D4 留保を維持。保存期間・法的適合・公開合格を捏造しない。PASS |

正本は REQUIREMENTS v0.45、特に §29（同:476）と §30。開始/終了の担当者・実績と操作日時は同:506、報告期限・訂正・異議後明示承認は同:507、競合時の実決済結果は同:510、D1〜D4 は同:516。PRODUCT-COMPLETION v0.2 の L/R/P 分離と TECH-STACK v1.0 の原子性/版/移行境界に整合する。PROJECT.md:25 の implementation-led continuation は今回の限定実装を許可し、外部作用等を追加許可しない。

## 限定タスクの対応と実現性

| 受入 | 計画内の実装対応 / 評価 |
|---|---|
| LL01 | L1/L2/L3 の当事者取得・担当者限定 mutation・保護者限定確認/異議。第三者/任意ID/金額/自己承認を拒否。PASS |
| LL02 | L1 の schema:1 読取既定値、固定 snapshot、旧 operations の保持。旧児/規則参照の欠落を偽造しない BC07 を併用。PASS |
| LL03 | 開始/終了順序、revision、操作ID、保存故障、状態変更後の重複承認まで明示。既存 conflict は server.mjs:98〜101 で confirmed だけを検査するため、この回帰指定は必要かつ十分に具体的。PASS |
| LL04 | L2 の未報告 reminder / 通知 outbox / 合成adapter / 再試行と仮時計。片channel失敗では24hが始まらない。PASS |
| LL05 | L2/L3 と BC06 の通常訂正、旧版遅延、恒久失敗を接続。仮時計で境界を決定的検証。PASS |
| LL06 | 異議→相談→再提出後も明示承認必須、時間経過だけで復活しない。未実装運営は明示。PASS |
| LL07 | 同一 Store mutation で承認/異議/job を直列化、各予約で有効 ready は一版のみ、外部処理なし。20操作と履歴の観測条件がある。PASS |
| LL08 | 保存障害/再送/再起動/草稿の扱い、既存データ非reset、永続 dueAt に基づく job 再開を指定。PASS |
| LL09 | L4 の375px/1280px・両役割・正常と異議経路・既存検索/相談/依頼の回帰を親CUAで観測。同一ソース版へ証拠を固定。PASS |

ソース読み取り: server.mjs:127〜147 の Store は単一writerロック、queue、候補clone、persist後のstate切替を既に持つ。server.mjs:175 は当事者 bookings を返し、同:226〜229 は成立時 quote/children/ruleVersion/transportProposal を booking に保持する。新しいドメイン状態・outbox等を追加する足場があり、全面書換えは必要条件ではない。既存 package.json は typecheck/build と server/quote-state/next-core の試験入口を持つ。これらは実現性の読取確認であり、新機能の動作検証ではない。

## 指摘・実装への引継ぎ

| ID | 分類 | 該当箇所・根拠 | 影響 | 修正案・質問 | 対応・採否 | 再確認 |
|---|---|---|---|---|---|---|
| A01 | 補足改善・阻害なし | BC03 ActualReport 行、BC06:98〜100、計画 L3:52〜56 | 通知失敗時の自動精算停止と、本人が最新版を見た上で行う明示承認を実装時に混同しやすい | 自動条件と明示承認のガードを分ける。恒久失敗の遅延結果が明示承認済み ready を自動的に取り消さないことを、LL05/07 の確認に含める | 既存契約の実装注意。設計差戻し・追加のユーザー判断不要 | 実装差分/試験で確認。現時点未実施 |
| A02 | 補足改善・阻害なし | BC07:108、LL02、server.test.mjs:159〜182 の legacy fixture | 古い booking には children/交通費の相互同意等が欠ける形が存在する。現在プロフィールから埋めると snapshot 保持に反する | 元 request の保存済情報を参照できる場合だけ使用し、不明項目/旧同意は legacy synthetic と表示。旧成功 fingerprint/結果を新契約へ書換えない | BC07 の既定要件を実装へ引継ぎ。旧形式自体を削除/変換する必要なし | LL02 の legacy fixture に欠落ケースを含め確認。現時点未実施 |

阻害事項はゼロ。上述2点は通常の実装具体化で解消可能であり、計画改訂を実装開始の条件にしない。

## 合格の範囲と未検証

- 合格: G01 設計文書の整合・後続へ渡せる契約、および LL01〜09 計画の依存/検証可能な受入条件。
- 未検証: lifecycle コード、実画面、負荷、合成メールadapter、障害/再起動の動作、公開DB/認証/決済/実メール/復元、制度・契約・D1〜D4。
- 全体製品、G10/G16/G17b 全体、G03 PoC、R/P を完了扱いしない。監査は外部サービス採用/支出/公開の許可を増やさない。
- 実施操作は対象資料とソースの読取り、revision照合、本監査証拠の新規保存のみ。ソース・設計・TASK/STATUS は変更せず、commit/外部状態変更なし。
- next_action: 親が最新対象版に本判定を結び、TASK/STATUS を更新して限定 local-lifecycle 増分を実装担当へ渡す。実装後は同一ソース版で独立検証と成果物レビューを行う。
- usage: 不明

## SHA-256

```
3831449155a4a22de2ac5e3fe917b36c1df074cfa7664dd1d41d9fc78d5b0fa8  docs/design/BUSINESS-CONTRACTS.md
f955420b99f76ec09eed880ad14b684861cb8cec6e07b8faea9edd86da5ebb5b  docs/tasks/LOCAL-LIFECYCLE-PLAN.md
d900993357785b03612189095ad029b2be74ecd6529260677b2ccf80e69d1058  docs/design/REQUIREMENTS.md
474caf22870fd7ef6a0cf9a3935034cfa85315c3b1f1e9e30e40b6336ade7f96  docs/IMPLEMENTATION-CHECKLIST.md
9e1bbe449aa05f1a7a50a0fae45d0006dcd3d3d1488fc671e6d21cd02cadc7b2  docs/design/PRODUCT-COMPLETION.md
9c5330b6ec1c94968a79aac9122c2dec66119625ca8d548026a33dbbfacbfe01  docs/PROJECT.md
efaaf642ec8b736ea1bccdf258eb27f780bd0eb1516335fadb33db093892d19e  docs/design/TECH-STACK.md
```