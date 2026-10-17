# Next core increment
- id: next-core
- state: verifying
- state_version: 6
- trial: S02
- failed_submissions: 1
- authorization: user explicitly requested continued implementation after quarter-hour fix. Ordinary design delegated; proceed local synthetic functionality.
- scope_candidate: role-appropriate navigation, own child/profile management, sitter rate/availability management connected to search and request acceptance. Planner to prioritize a coherent bounded increment from current requirements.
- constraints: existing UI accepted; preserve 15-minute input and search/chat/estimate behavior. No production auth, real PII/documents, payments, external email, deploy/push/PR, destructive reset/delete.
- acceptance: source-specific design audit, implementation tests, actual app checks, independent review; retain old data/snapshots/operation replay.
- next_action: implement N1-N3 under independent design/plan v0.1 PASS.

## Technical plan v0.1
- design_revision: docs/design/NEXT-CORE.md v0.1
- source_baseline: 1b8ae0d4e40d31e69a3604491288fa5cbd065c0e
- requirement_ids: NC01-NC09; REQUIREMENTS S01-S06/Q01-Q05, 第21/26/29章、UX01-UX09
- plan_approval_reference: continued local implementation explicitly requested; ordinary design delegated. Independent design/plan audit required before implementation; lifecycle decisions remain parent-owned.
- technical_revision_record: 2026-10-17 planner v0.1; parent metadata above is preserved.
- assigned_agent: implementation via parent after independent plan audit; browser verification via parent CUA; final independent artifact reviewer.
- task_dependency_graph: N1 -> N2 -> N3 -> N4 -> N5. N2/N3 may be one implementation submission, but checks remain separate.

### N1 Domain and persistence boundary
- purpose / scope: NC06/07/09。プロフィール/児/設定のallowlistと純粋検査・受付時間判定を小モジュールへ分離。GET /api/me、所有者更新、profileRevision、actor operation再送を既存Storeへ接続。bootstrapの他保護者childrenを除く。
- dependencies: audited design NEXT-CORE v0.1。
- acceptance_and_verification:
  - GET /meは本人だけ。bootstrapに他保護者のchildrenなし。自分と他人の児ID、役割違反、role/review/qualifications/available等の追加キーをAPI試験で拒否。自己更新後も新規シッターが検索非掲載/受付不可。
  - 自己名/地域、児add/edit、時給/週次/日例外が保存・再読込・サーバー再起動で残る。児ID安定、既存児/operations/予約を残す。プロフィール児は新生児も保存可だが利用日受付検査は維持。
  - profileRevisionなしは0、更新ごと+1。同revisionからの競合更新は一つだけ成功。成功同ID再送は元結果、異内容は409。保存失敗でデータ/revision/operationが増えず同IDで再試行可。
  - 日曜/日本日、休み・例外優先・週次復帰、15分/不正日/逆転/上限24:00、旧availability/旧フィールドなしを試験。新しい依存は追加しない。

### N2 Connect search, quote, request and approval
- purpose / scope: NC07/08。現在受付時間判定と表示概算のexpectedRate検査を既存取引へ接続し、保存済みスナップショットを維持。
- dependencies: N1。
- acceptance_and_verification:
  - 週次内/外・例外休み/別時間で検索候補と新規依頼の可否が一致。依頼送信後に休みに変えると承認不可、時間を戻せば期限内で承認可能。成立後の休み変更でbooking/request状態・quote・日時が変わらない。
  - rate2200で概算後rate2400へ変更し、expectedRate2200での新規送信は409・依頼件数不変。expectedRate欠如/非整数は422。2400で再概算・再確認なら作成可。2200のpending作成後の2400変更はpending/成立bookingの元価格を保持。児変更も同様に依頼/予約DOBを維持。
  - 旧schema1ファイルを起動・再起動し、旧request成功再送（expectedRate無し）と旧approve成功再送、旧pending承認を保存済みルールで確認。新必須項目で過去成功operationを拒否しない。旧fingerprint方式を維持。
  - 15分・最低3時間・年齢/資格・医療拒否・1〜3人条件・失効・30分余裕・同時承認の既存試験を維持。保存成功まで新しい応答を返さない。

### N3 Own profile UI and role navigation
- purpose / scope: NC01-NC05/09。小さな自己編集コンポーネントを追加し、既存main.tsxのactor・依頼状態へ接続。検索条件の構成を維持。
- dependencies: N1/N2。
- acceptance_and_verification:
  - 保護者/シッターが役割の主ナビと適切な初期画面へ移動でき、シッターが自分の既存相談を開いて返信可。デモ登録後は本人編集へ進み新規シッター確認待ちが明示される。未選択相談/依頼リンクは非表示。
  - 保護者は児を追加・編集し検索/相談/概算で明示選択できる。手入力を保持し、保存児の二重選択を拒否。選択/手修正で概算と同意を失効。保存児の更新で編集中の依頼を黙って書換えない。
  - シッターの時給、曜日別1枠/休み、日例外/週次復帰を保存し、自分の掲載プレビューと検索に反映。確認フラグの編集欄なし。成立予約に遡及しない案内あり。
  - 通信/保存失敗・revision競合で入力を保持し成功通知なし。retryは同内容同ID。ポーリングが未保存草稿を上書きせず、actor切替前の遅い応答を新actorへ反映しない。
  - PRICE_CHANGEDは相談/入力を保持、旧概算/同意無効、再計算へ誘導。送信時に表示済みquote.rateを使う。
  - 375px/1280pxでラベル・焦点・エラー理由・ナビ・時間設定が読める。既存96時刻選択/最低3h/カードラベル/保護者手数料非表示/交通費双方確認を保持。

### N4 Same-source validation and actual browser
- purpose / scope: N1-N3の同一対象版へ自動・実動作の証拠を揃える。
- dependencies: N3完成、実装担当のsource revision固定。
- acceptance_and_verification:
  - typecheck/build/既存+意味のある新規ドメイン/API試験PASS。Windows bundled Nodeを既存起動方式で使用。実データファイルをreset/deleteしない。
  - 親CUAで375px/1280px両役割、合成新規登録→自分の児→検索→相談→概算→正式依頼→シッター承認を確認。週次/日例外変更、stale価格再確認、プロフィール更新後の既存予約保持、入力失敗/再試行を観測。直接Playwrightは使わない。
  - evidence/next-core/へ同一対象ソース版、コマンド結果、API観測、画面観測を記録し、docs/verification/NEXT-CORE.mdへ成功・未検証を分離。未検証を合格にしない。

### N5 Independent artifact review and handoff
- purpose / scope: source差分とN4証拠がNC01-NC09に一致するか独立評価。
- dependencies: N4、対象ソース版と資料版固定。
- acceptance_and_verification:
  - 所有者制約、昇格不可、bootstrap児非開示、旧データ/operation再送、原子的保存、価格確認/スナップショット、現在空き時間の承認検査を重点確認。指摘があれば親へ戻し、修正版の証拠を更新。
  - 独立PASS後に親がtask state/STATUS/PROJECTの必要参照を更新。ローカル増分の完了と未実装ロードマップを区別。外部push/PR/公開/決済等へ拡張しない。

## Technical requirement to verification map
| Requirement | Implementation task | Decisive verification |
|---|---|---|
| NC01 role navigation | N3 | N4 desktop/mobile両役割とactor切替 |
| NC02 own profile | N1/N3 | owner API、永続化、草稿保持 |
| NC03 child add/edit | N1/N3 | stable ID、所有者拒否、実在日、再起動 |
| NC04 child into conditions | N3 | 明示選択/重複拒否/手入力/概算失効 |
| NC05 sitter settings | N1/N3 | 未確認者昇格拒否、週次/例外UI |
| NC06 field/privacy boundary | N1 | bootstrap他児なし、allowlist/roles |
| NC07 current availability | N1/N2 | search/create/approve、closed after confirmed |
| NC08 price/snapshot/backcompat | N2/N3 | stale rate、pending frozen、旧replay |
| NC09 atomic/retry/concurrency | N1-N3 | write failure、replay、revision conflict、late response |

## Technical plan remaining
- independent_audit: design/technical plan v0.1 PASS; docs/design/NEXT-CORE-AUDIT.md.
- implementation / tests / browser / artifact_review: not yet performed by planner.
- remaining_product: see design roadmap; favorites/inbox and full marketplace are outside this increment.


## Parent transition v2
- design/technical_plan: v0.1 ready; pending independent audit.
- current_scope: NC01-NC09; role navigation, own profiles/children, sitter pricing/weekly availability and date exceptions.

## Parent transition v3
- design/technical_plan: v0.1 independent PASS; no must-fix.
- assigned_agent: next-core implementer; independent API verifier preparing; parent CUA after source freeze.

## Pre-submission observations (not failed submissions)
- source is not frozen; S01 failed_submissions remains0.
- reviewer found aliased own-user children in prior operation responses and max40-name roundtrip suffix issue; implementer reported deepclone/normalization fixes with regression checks.
- reviewer found register response projection missing self-edit metadata; latest source already returns ownUser, resolved before submission.
- implementer reports ActionGuard fix/test for late busy release and changed message drafts; standard test script now includes next-core. Final independent evidence pending.
- independent API verifier prepared10 groups with true old schema1 fixtures, not run against finalsource yet.
- browser acceptance plan: evidence/next-core/parent/browser-plan.md; parent CUA only.

## Parent transition v4
- state: verifying; trial S01
- implementation_report: typecheck/build/24 tests PASS; raw evidence and source freeze pending.
- next_action: clean fixed-source capture; independent API and parent CUA before artifact final review.

## Parent transition v5 - S02 registration UI
- S01 finalcandidate 93660420a0e6c894de3e1438782258340aa067a0 passed independentAPI11groups (one test-oracle correction) and currentprofile/children/pricing/availability/approval CUA.
- NC01 mandatory registration CUA blocked: native window.prompt is cancelled in provided IAB (click completes, getJsDialog undefined, no registration). Not declaring this unverified flow passed.
- bounded fix: replace native prompt with labeled inline synthetic displayname form in existing demo-registration view. Keep domain/API andguards.
- failed_submissions:1 (one incomplete browser acceptance submission, not one per earlier prefreezecomment).
- test carry: independent API evidence maycarry onlyafterconfirmedunchangedAPI/domain diff/hash. Source/UI checks onS02.

## Parent transition v6
- S02 inline registration form implemented; typecheck/build/26 tests reportedPASS.
- awaiting clean S02 source capture; then actual registration and own-editor/full request browser flow.
- S01 independentAPI11groups carry requires API/domain hash unchanged; raworaclecorrection retained.
