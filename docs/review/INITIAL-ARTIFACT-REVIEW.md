# 初回ローカル実装 成果物レビュー

## 最終判定 S03

**PASS / complete**。登録・検索・両者チャット・通常保育の正式依頼・承認/辞退というローカル合成データの初回増分に、未解決の重大指摘はない。L01–L08の独立検証、ソース差分、実画像を照合した。製品全体・本番適合・公開の合格ではない。

- レビュー対象 HEAD: `e5d1ac04235c31943803ecdcf5b5f7d4722ae52d`
- 対象 tree: `1c425488380057ac790442bf8a0f11c769631246`
- 最新版記録: `evidence/initial-local-mvp/S03/merged-config-revision.json`
- 実ブラウザー検証に渡した版: `527a2247cb0c93cfd192a84bbee52794eb7147aa`
- S03製品実装版: `99d087a3d0a67709ca101967fd11dd0b2dc2e554`
- 独立検証結果: `docs/verification/INITIAL-VERIFICATION.md`（L01–L08 pass）
- 本レビュー文書と検証文書は後照合の完了後に保存した。これらを含む最終文書コミット自体は、現時点ではまだ検証対象コミットではない。親がその版を採取し、製品ソース無変更の差分確認を記録して引き継ぐ。

### 版の引継ぎ根拠

レビュー担当はS03の旧版記録を03:51:23Zに照合し、HEAD/tree/clean-tree一致を確認した。その後、別作業のagent設定変更によってHEADが変わったため旧SHA一致とは扱わず、新しい版記録へ切り替えた。

`527a2247cb0c93cfd192a84bbee52794eb7147aa` → `9581001c8831b2b0eb5088e862de120451c22162` の差分は .codex agent/config、.gitignore、.harness/roles/parent.md。server、tests、src、package/lock、index、Vite、tsconfig、READMEの製品差分は `git diff --exit-code` で0。レビュー担当は9581001版の完全SHA/tree/clean-treeも03:59:22Zに再照合した。最終e5d1ac版は9581001版とtreeが完全に同一であり、merged-config版記録と実Gitの完全SHA/treeを照合した。独立検証担当も最終版記録の後照合を済ませている。

S02→S03の製品変更は画面の同意状態・会話分離のみ。サーバー・テスト・READMEは無変更なのでS02の医療条件/移動間隔/CLI再起動証拠を持ち越す。S01の不合格試験を合格として流用せず、修正した条件はS02/S03の新証拠で置き換えた。

### 指摘の解消

| 指摘 | 解消根拠 |
|---|---|
| B1 見積り消失・同意保持 | 同意操作では見積りを保持し、日時・人数・相手変更では見積りと同意を解除。S03 consent-reset.jsonとdesktop/mobile正常動線で確認。 |
| B2 取消条件の未表示 | 見積り画面に日本時間基準、0/50/100%、実費、15/85%を表示。S03実画像をレビュー担当も確認。 |
| B3 旧会話表示 | actor/sitter/guardianの組を照合し、会話切替時に旧表示を解除。有効な保護者を初期選択。S03 conversation-isolation.jsonで遅延A応答後もB選択・B会話を保持、console/page errorなし。 |
| B4 検索入力未接続 | 地域・資格・上限時給を画面からAPIへ接続。ソース差分と独立検索/正常動線で確認。 |
| B5 辞退UI・表示 | 受信シッターの辞退操作と「辞退」表示を追加。desktop-full-flow.jsonとdesktop-06-declined.pngで確認。 |
| B6 承認再送 | 操作IDを保持し送信中ボタンを無効化。missing-boundaries.jsonで同IDの承認再送が同じ予約を返す。ブラウザーの応答消失試験はチャット送信で実施し、下書き保持・再送・保存1件を確認。 |
| B7 承認医療再検査 | 保存済み種別と医療フラグを承認時にも検査。S02 api-regressions.jsonでmedical=trueを422拒否。 |
| B8 正常移動間隔の拒否 | Dateをepoch値に変換して比較。S02 api-regressions.jsonで30分ちょうどの依頼201/承認200、近接枠409を確認。 |

### 最終証拠

- `evidence/initial-verification/S03/desktop-full-flow.json`: Edge 1280×1000で新規保護者登録→検索→相談→シッター返信→依頼→承認・辞退。自動操作の重複ラベルassertionは最終状態と実画像で照合済み。
- `evidence/initial-verification/S03/mobile-full-flow.json`: 375×812で登録→検索・相談→返信→正式依頼→承認。badResponses/consoleErrors/pageErrors/externalは空。レビュー担当もmobile-04-confirmed.pngとdesktop-06-declined.pngを読み、日本語と主要画面を確認。
- `evidence/initial-verification/S03/consent-reset.json`、`conversation-isolation.json`: S02の残件2件がpass。対応PNGも直接確認。
- `evidence/initial-verification/S03/response-loss-retry.json`: サーバー保存201後に応答を失っても下書きを保持し、再送後の保存メッセージは1件。初回の集計対象シッター違いは保存全体で照合し訂正済み。
- `evidence/initial-verification/S03/missing-boundaries.json`: 9/9。四種審査条件の個別拒否、1歳境界、24時間未満で開始時刻を期限とする直前/ちょうど、承認再送、プロフィール単価変更後の価格snapshot維持。
- `evidence/initial-verification/S02/api-regressions.json`: 移動30分境界と保存医療条件再検査の2/2。
- `evidence/initial-verification/S02/cli-restart.json`: 隔離CLI停止・再起動後の登録/相談/依頼/成立予約復元。
- 初期 `api-rules.json` 21/21、`persistence.json` 5/5、`request-boundaries.json` の変更影響のない成功条件を、S02/S03差分と照合して持ち越す。初期の不適切な29分セットアップと不合格結果は合格数に含めない。
- tsc、Vite build、server.test.mjs 8/8 passは最終独立検証文書で確認。

### 軽微な残件・限界

`evidence/initial-verification/S03/favicon-console-observation.json` のとおり、未配置の /favicon.ico が500となる。API・画面例外・主要動線への影響は観測されず、機能合格を妨げない。desktop-statuses.jsonの旧pass=falseはこの観測を含むため保持し、正常動線の最終状態照合と混同しない。

今回の動作証拠はローカルEdge、合成fixture、単一writerの範囲。ブラウザーの応答消失試験はチャットで、承認再送はAPIと画面実装の照合で確認した。すべての通信競合・全キーボード操作・長時間稼働・破損形式の網羅試験を実施したという意味ではない。プロフィール/カレンダー編集、本番認証、実個人情報、決済、メール、医療サービス、配備・公開は対象外のまま。

---

## S01/S02の履歴（以下のneeds-correctionは当時の対象版に対する判定）

# 初回ローカル実装 成果物レビュー

- 判定: **needs-correction**。ローカル増分の完成条件は未達。公開・製品全体の評価ではない。
- 対象 HEAD: b86b986fa501aa85add04815d07dd10f3d306b7e
- 対象 tree: b62a08694cef94beb941972c712d186776dc1fc0
- 版記録: evidence/initial-local-mvp/verification-revision.json
- ソース実装コミット: 4e305da8e9b5fca49c53e992785811d3abdeecf0。対象HEADとの差分は docs/STATUS.md と docs/tasks/INITIAL-MVP.md のみ。
- レビュー前照合: 2026-10-17T03:33:18Z、harness verify がHEAD/tree/clean-tree一致でpass。検証担当の後照合passを親から受領してから本記録を作成。
- 本記録は検証後の未コミット文書。記録を含む将来のコミットを検証済みと扱わない。再提出時は新しい版記録と差分照合が必要。
- 基準: PROJECT.md、IMPLEMENTATION.md v0.2、INITIAL-MVP.md L01–L08、INITIAL-AUDIT.md。

## 必須修正

| ID / 優先度 | 根拠と影響 | 修正後の確認 |
|---|---|---|
| B1 / P1 / L04 | src/main.tsx:22,41。見積り後に取消同意をチェックするとupdateFormが見積りを消し、正式依頼ボタンが無効になる。独立ブラウザーで再現済み。条件変更後も同意値を保持する。 | 見積り→確認→同意→送信を通常順序で完了。条件・相手変更時には見積りと同意を無効化し、再確認。 |
| B2 / P1 / L04 | src/main.tsx:41。取消条件を「取消・精算未実装」としか表示せず、料率・基礎・実費条件を見せず同意を得る。server.mjs:172の保存文と対応しない。ソースとB1実画像で確認。 | 保存する取消条件と同じ内容を依頼前に表示。日本時間基準、0/50/100%、実費条件、規則版を確認可能に。実際の取消精算は後続。 |
| B3 / P1 / L03,L08 | src/main.tsx:25–27,40。actor/会話変更時に旧messagesを消さず、取得失敗時にも残す。別シッターへ切替後403でも旧会話を表示する構造。ソース確認、ブラウザー故障再現は未実施。 | 切替直後に旧会話を隠し、遅れて届く旧actor/会話の応答を適用しない。取得拒否・失敗でも旧会話が見えない。 |
| B4 / P2 / L02 | src/main.tsx:24,38。地域東京固定、資格・料金の検索入力と送信がない。APIフィルターは独立試験合格だが画面から使えない。 | 地域・資格・上限料金の入力をAPIへ接続し画面で結果確認。 |
| B5 / P2 / 設計状態規則 | src/main.tsx:42。辞退APIはあるが画面操作がなく、declinedを「失効」と表示。ソース確認。 | 受信シッターが画面で辞退でき、辞退と失効を区別する。 |
| B6 / P2 / L05,L08 | src/main.tsx:32,42。承認ごとに新operationIdを発行、送信中状態もない。保存後の応答消失から再試行しても同一成立結果を回復できない。ソース確認、通信切断再現は未実施。 | 結果確認までIDを保持、送信中表示。応答消失→再試行で同じ予約の成功結果を回復し二重作成しない。 |
| B7 / P1 / L06 | server.mjs:176。承認の再検査がnormalを新たに組み立て、保存済み医療条件を無視。独立試験で保存依頼をmedical:trueにした後の承認が200/confirmed。通常作成APIから医療依頼を作れるという意味ではない。 | 保存済み種別・医療条件を承認でも検査。病児・病後児・投薬等を拒否。直接承認APIへの禁止フラグ混入も成功扱いにしない。 |
| B8 / P1 / L02,L05 | server.mjs conflict()。30分ちょうどの後続枠が409になることを独立再現。Date + gapが数値加算にならず比較を誤るため、非重複枠全般に影響する。 | epoch millisecondsで比較。29分拒否、30分許可、離れた前後枠・翌日枠を検索/作成/承認で確認。 |

## 独立証拠と合格済み条件

- evidence/initial-verification/blocker-consent-invalidates-quote.json と同名PNG: 見積りtrue→同意後false、checked=true、送信disabled=true。PNG日本語可読。console/page errorsと外部リクエストは記録上なし。
- evidence/initial-verification/api-rules.json: 21/21。登録、未審査・自己昇格拒否、API地域/資格/料金、人数2/3と4拒否、6か月・4/1生まれ小3年度末境界、会話再送/内容衝突/第三保護者分離/新規保護者返信、Origin/JSON/actor拒否を支持。
- evidence/initial-verification/request-boundaries.json: 17/18。ただし29-minute buffer request setupのpassは不適切なセットアップ記録であり移動29分の合格証拠に数えない。21時/8時・日跨ぎ料金、端数、サーバー料金、辞退API、期限直前/ちょうど、同時重複承認、見積り医療フラグ拒否、医療依頼作成拒否、未実装変更API拒否を支持。承認医療再検査はfail。
- evidence/initial-verification/travel-buffer.json: 29分拒否pass、30分許可fail（依頼201を期待するが409）。
- evidence/initial-verification/persistence.json: 5/5。登録/メッセージ/成立予約の再起動復元、再送ID維持、破損JSON停止、保存失敗時disk/memory維持、lock解放を支持。exported start()と別の一時保存先での確認であり、READMEのCLI停止・再起動は未検証。
- 実装担当報告のtypecheck/build/test 5/5は参考とし、独立証拠とソースレビューで補完。単体5本だけでL01–L08完了とは判定しない。

## 未検証・再提出条件

修正後の登録→検索→両者チャット→正式依頼→承認/辞退、375px/1280px、キーボード操作、送信失敗の下書き保持、応答消失再送、会話切替時エラー、期限ポーリングを同じ修正版で検証する。CLIを別ポート・別保存先で起動できれば、既存8787プロセスを妨げず停止・再起動を確認できる。

四種審査フラグ個別拒否、1歳境界と幼稚園教諭研修、24時間未満の開始期限・期限直後、料金変更後のsnapshot、医療の検索/作成/承認の組合せなど、現証拠が直接カバーしない条件は合格を持ち越さない。全件の機械的反復ではなく、修正と未検証条件に応じて追加確認する。

## 範囲・技術差分

親の範囲判断に従いプロフィール・対象児は固定合成fixture、編集管理画面は後続。空き枠は毎日08–22時JSTの固定範囲をサーバーで検査する。React/TypeScriptフロントエンドに対しサーバーは依存なしNode ESMのserver.mjs。単一TypeScript設計との差はREADMEに明記済みで、それ自体は不合格理由としない。

本番認証、本人確認、実個人情報、決済、メール、医療サービス、配備・公開は対象外。将来要件を今回の修正条件に追加していない。
