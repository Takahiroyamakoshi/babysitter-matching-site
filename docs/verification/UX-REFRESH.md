# Verification
- requirement_id: UX02/03/08/09、既存L保証のAPI・ドメイン部分
- specification_revision: REQUIREMENTS.md v0.45 第30章、UX-REFRESH.md v0.2、UX-REFRESH-AUDIT.md v0.1
- target_commit: 46985e12b04024ac4761bff256580c0c702c7a20
- revision_record: evidence/ux-refresh/S01/revision.json
- stage: integrated（ローカル合成アプリのAPI・ドメイン。全製品の完了判定ではない）
- environment / time: Windows bundled Node v24、127.0.0.1の一時ポート、独立した合成Store。時計は2026-10-17T00:00:00Z固定。実行2026-10-17T04:35Z。
- command_or_steps: リポジトリをCMD pushdでマッピングし、bundled node.exe evidence/ux-refresh/independent/verify.mjs を実行。前後に harness_checks.py verify を同一revision recordへ実行。
- actual: プロセス終了0、10シナリオ群合格・失敗0、HTTP応答62件。個別node:test件数とは別の数値。前04:35:02.927Z/後04:35:13.472Zの照合ともHEAD/tree一致・pass。
- verdict: pass（下表のAPI・ドメイン範囲）
- evidence_paths: evidence/ux-refresh/independent/{verify.mjs,run.log,results-1792211707412.json,response-summary.json,precheck.json,postcheck.json,legacy-fixture.json,baseline-server.mjs}
- limitations: 本担当はブラウザーを操作していない。画面・アクセシビリティ・操作中の入力保持・遅延応答の破棄は親の実ブラウザー結果で別途評価する。固定時計と合成データの検証であり、実認証・決済・メール・制度適合・本番の動作を示さない。

## 条件別結果
| 条件・期待 | 実際 | 判定 |
|---|---|---|
| UX02: 2時間45分は422、3時間は正常、正しい条件の候補なしは200/[] | 422 / 200であやを含む / 200で[]。候補なし地域でも不正時間は422 | pass |
| UX02/03: 入力不正を候補フィルタ前に拒否 | 不正JSON、null/空対象児/null児、数値・非正規・実在しないDOB、関係/保育内容不適合、4人、無効/実在しない未来日時、15分刻み違反、逆転・過去日時の15ケースすべて422 | pass |
| UX03: 児童別DOBを2/3人で保持、4人拒否 | 2/3人の異なるDOBをquote slotで保持。3人のrequestとbookingにも同じ全児童が保存。サービス料13,200/19,800円。4人422 | pass |
| UX09: 未確定を0にしない、提案500円/明示0円 | 未指定transport/guardianTotalともnull・status pending。500円は総額7,100円、明示0円は6,600円。負数・小数・文字列・空文字・null・booleanは422 | pass |
| UX09: 正式依頼と承認に当事者の明示確認 | 額なし/未確認/不正額422。シッター未確認422、別シッター403。確認後成立、双方確認をrequest/bookingのtransportProposalに保存 | pass |
| UX07/09: 同一操作再送と保存失敗 | 同一依頼ID再送は同じrequest、異なる内容は409。承認再送は同じbooking・追加なし。保存失敗500時にrequest/operationなし、再送成功で1件 | pass |
| UX08: 夜間20%を21〜8時だけ加算し二重計上しない | 20〜23時: 基本6,600+夜間880=7,480、交通費500込み7,980。05〜08時7,920、08〜11時6,600、18〜21時6,600、07〜10時7,040、20:45〜23:45は7,810。15%手数料は合計から切捨て、手取りとの和も一致 | pass |
| 新規依頼料金スナップショット | 依頼後のシッター現在時給3,000/交通費999への変更が承認済みbookingの保存見積りを置換しない。requestの料金・規則版を保持 | pass |
| schema1の既存成功操作・未承認依頼・成立予約 | 修正前サーバーが生成した成功request/approveの元入力再送が同一結果。異内容requestは409。旧pendingの承認は新必須確認で拒否せず、現在交通費999でも保存800/総額7,400を維持。再起動後も依頼2/予約2・旧操作結果を維持 | pass |
| 医療・年齢・資格・複数人の既存制約 | 病児/投薬/病後/異サービス、6か月未満・対象外年齢、未審査、乳児資格なし、複数人条件なしを拒否 | pass |
| 承認の原子性・重複・移動余裕 | 競合する承認2件を並列実行し200/409・成立1件。正確に30分の余裕は成立、15分は409 | pass |
| 期限・当事者・保存先排他 | 期限切れ承認409、第三者bootstrapに依頼/予約なし、第三者承認403。同じ保存先の2つめStore起動を拒否 | pass |

## 証拠の版と解釈
旧fixture生成元は73fcc2efe8fca59a3167c160d68d323017945f3bのserver.mjs。Git blob 481da7eff1af2b6f9b0c3bbdb7d7f901082679caと保存したbaseline-server.mjsが一致する。新schemaに合わせて組み立てた架空の旧operationsではない。生成終了時の即時process.exitにWindows libuvのUV_HANDLE_CLOSINGが発生したが、fixture保存・各旧API成功検査は完了しており、最終独立検証プロセスは終了0だった。

- verify.mjs SHA-256: 49dfffb3c3490925d74c41531d45a9aea102db3f14b08a0c1b14edea8f148383
- legacy-fixture.json SHA-256: f86c2ad570e791f3a91cdd6861dc38b4271f694619292ab9ed76945f0d5fd45a

## 親担当のブラウザー検証（観測報告の受領）
親がCUAのアプリ内ブラウザーで実行し、[browser-checks.json](../../evidence/ux-refresh/S01/browser-checks.json)に記録。本担当によるブラウザー再操作・画像の独立判定ではない。検証前04:34:46.723Z/後04:36:32.628Zの版照合は同じHEAD/treeでpass（[browser-postcheck.json](../../evidence/ux-refresh/S01/browser-postcheck.json)）。10〜14の画像はソースコミット直前の参考資料、凍結版の受入証拠は15〜23と区別する。

| 対象 | 親が観測した結果 | 判定・証拠 |
|---|---|---|
| UX01/04/05/06: 検索フォームと表題・カード・タブ | 独立したfieldsetカード、役割と作業のh1、項目名と値、最大2/3人の区別。人数は1〜3のみ、相手未選択の相談/見積りタブなし | pass（親観測） [23](../../evidence/ux-refresh/23-after-search-final.png) |
| UX02: 検索不能な最低時間 | 19〜21時をblur後も保持し、最低3時間の明示エラー・検索無効。候補なしと混同しない | pass（親観測） [21](../../evidence/ux-refresh/21-frozen-invalid-time.png) |
| UX02: 有効条件で0件 | 19〜22時/時給上限1円は0件。「入力した条件は有効です」と表示 | pass（親観測・DOM） [22](../../evidence/ux-refresh/22-frozen-valid-empty.txt) |
| UX03: 別DOBの入力・保存 | 追加した2人目DOBは初期空欄。2021-05-10と2023-04-01を別々に入力し、保存依頼に両方表示 | pass（親観測） [16](../../evidence/ux-refresh/16-after-guardian-request.png) |
| UX07: 相談内編集・見積りと同意の失効 | 同意済み14,300+500円の条件を13:15→13:30へ変更し、旧見積りを除去、同意2つを解除/無効、依頼無効。相談へ戻って選択相手あや・メッセージを保持し、15,400+500円へ再計算 | pass（親観測） [15](../../evidence/ux-refresh/15-after-condition-invalidates.png) |
| UX08/09: 保護者料金と交通費確認 | 基本15,400+夜間0+交通費提案500=15,900円。保護者に手数料/手取りなし。初期概算は交通費pending/総額null | pass（親観測） [16](../../evidence/ux-refresh/16-after-guardian-request.png) |
| UX09: シッター確認と承認 | 条件と交通費500円の確認前は承認無効。明示確認後の承認でconfirmedを観測。手数料2,310/手取り13,090を区分 | pass（親観測） [17](../../evidence/ux-refresh/17-after-sitter-mobile.png) |
| 375px/1280pxの主要フロー | 検索→相談→概算→依頼→シッター承認を確認。375pxの検索/相談/概算/承認は可読・切れなし、実DOMのscrollWidth=375 | pass（親観測） [18](../../evidence/ux-refresh/18-after-search-mobile.png)、[19](../../evidence/ux-refresh/19-after-consult-mobile.png)、[20](../../evidence/ux-refresh/20-after-night-mobile.png) |
| UX08/09: 夜間境界と未確定総額 | 2人19〜22時: 基本13,200+夜間880（21〜22時のみ）=14,080円。二重加算なし、交通費/総額は未確定 | pass（親観測） [20](../../evidence/ux-refresh/20-after-night-mobile.png) |

## 実装担当の自動検証（報告受領）
[implementation-checks.json](../../evidence/ux-refresh/S01/implementation-checks.json)ではtypecheck/buildがpass、node --test server.test.mjs quote-state.test.mjs が17テスト成功/失敗0。本担当の10シナリオ群とは別の検証であり、テスト数へ合算しない。修正前に未確定交通費が800円/不正検索時間が200となるred結果も同記録にある。

## 未検証・範囲
- ブラウザー通信を強制的に失敗させて入力保持/再送を観測する検証は今回未実施。APIの保存失敗・冪等性と、実装担当の状態ガード単体試験は別の証拠であり、そのブラウザー検証の代用とはしない。
- 遅延した古い見積り応答の破棄は実装担当の単体試験の範囲。親の実ブラウザーで遅延競合を再現したとの報告はない。
- 完全なWCAG監査・パケット単位の通信観測は未実施。実認証・決済・実メール・実個人情報・本番公開は対象外。
- 本記録は対象版への検証後に追加した文書。親が報告コミットの新SHAへ証拠を持ち越す際は、製品差分がないことを別途照合する。

判定: 今回のUX01〜09局所改善は、上記の独立API結果と親の凍結版ブラウザー観測で確認できた。記載した未検証の範囲を合格へ読み替えない。最終成果物レビューは独立レビュー担当の工程。
