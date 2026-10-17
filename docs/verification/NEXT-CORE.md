# Verification
- requirement_id: NC01〜NC09。N1/N2の独立API・ドメイン検証、N3/N4の親CUA観測および実装担当の自動検証を統合。
- specification_revision: docs/design/NEXT-CORE.md v0.1、docs/tasks/NEXT-CORE.md Technical plan v0.1。
- target_commit: 483a43c5dacf39ebdd27bef58eb25e51b6c64fb6（S02）
- revision_record: evidence/next-core/S02/revision.json（tree 9ffbdbb6d2dda93026813dfa20aef09f16289680）。独立APIの直接実行対象はS01 93660420a0e6c894de3e1438782258340aa067a0、evidence/next-core/S01/finalcandidate/revision.json。
- stage: integrated。このローカル増分の検証記録であり、市場全体・本番運用の完成判定ではない。
- environment / time: Windows bundled Node、WSL Ubuntu。独立APIは各群専用の新規合成Store、127.0.0.1一時ポート、固定時計2026-10-17T00:00:00Z。API実行2026-10-17T05:22:52Z/05:23:33Z。親CUAは別の合成データを用いたローカル8792。
- command_or_steps: 独立担当がNodeで evidence/next-core/independent/verify.mjs --frozen を実行。後述の検証期待値修正後、--frozen --only-pretransport で影響群のみ再実行。実装担当がtypecheck/build/node:test、親がCUA IABで実画面を操作。直接Playwrightは使用していない。
- actual: 独立API初回11群中10合格・検証期待値の不備1件（HTTP観測188件）。期待値修正後、影響1群合格（HTTP観測4件）。統合すると11群を確認。実装担当のS02自動試験26件合格、typecheck/build成功。群数・HTTP観測数・個別自動試験件数は別の値。
- verdict: pass（下表で確認した範囲）。通信障害・遅延のブラウザー強制再現など、末尾の未検証項目を含む全面的な合格ではない。
- evidence_paths: evidence/next-core/independent/verification-draft.md、evidence/next-core/parent/browser-results.json、evidence/next-core/S02/。
- limitations: 実認証・実個人情報・決済・メール・外部公開・本番適合は対象外。独立担当自身はブラウザーを操作しておらず、UIの実測・画像は親CUAの証拠として帰属を明記する。

## 条件別結果
| 条件・期待 | 実際・根拠 | 判定 |
|---|---|---|
| NC06 所有者・射影・自己昇格拒否 | 独立APIで /me が本人、bootstrap が他保護者の児とreviewを非開示。profile追加キーid/role/children/review/qualifications/ageMonths/capacity/multiScenario/available/transportを422。未知・他人の児404、役割違反403。新規シッターの設定保存でも確認フラグfalse・非掲載・依頼不可を維持 | pass |
| NC02/03 自己名・地域・児の保存境界 | 独立APIで空/長すぎる名・不正地域、不正実在日/未来/1900年未満を拒否。新生児は保存可能だが利用日の年齢条件で拒否。児IDを編集で維持、12件保存・13件目拒否。プロフィール・児・設定を再起動後も保持。40字名と合成接尾辞の再保存で重複・拒否なし | pass |
| NC09 原子的更新・競合・再送 | 独立APIで同revision並列更新200/409、actor別operation、同内容の元結果再送、異内容409、不正revision422。児/設定の保存失敗500はメモリ・ディスク・revision・operationを変更せず、同ID再試行成功。profile/児追加/児編集の元成功応答は、後続児追加・編集と再起動後も同一 | pass |
| NC05/07 週次・日例外・日本日・境界 | 独立APIで週7固定、例外休み優先・解除後週次復帰、日曜の日本日、終了翌日00:00=前日24:00、15分/逆転/型/実在日/未知キー/例外60件上限。旧availabilityと両フィールドなしの毎日受付へフォールバック | pass |
| NC07 検索・新規依頼・承認の一貫性 | 独立APIで休みは検索除外・新規依頼422 OUTSIDE_AVAILABILITY。pending後の休み変更は承認拒否、再開すれば同IDで承認可。成立後の休み変更でも日時・状態・金額を保持。親CUAでも日例外閉鎖→承認拒否/検索Yuiのみ→週次復帰→承認→再閉鎖後保持を観測 | pass |
| NC08 stale価格・保存スナップショット | 独立APIで値上げ/値下げ両方のstale expectedRateを409 PRICE_CHANGED、欠如・非整数422、失敗時依頼件数不変。現在価格で成功。旧成功再送を現在価格検査より優先。料金/児プロフィール変更でもpendingから成立まで旧quote/DOBを保持 | pass |
| NC08 実旧schema1互換性 | 実1b8ソース生成fixtureと、実73fcc旧交通費fixtureの成功request/approveを旧入力で再送。新expectedRate必須条件に妨げられず元結果。旧pending承認は旧quote、再起動も保持。後述のJSON期待値訂正群を含む | pass |
| 既存3時間・15分・年齢・医療・移動余裕 | 独立APIで医療/投薬/対象外年齢/4児/3時間未満/15分外を拒否。重複する承認は並列200/409、30分余裕は成功、15分は409。資格・複数人等の既存回帰条件は実装担当の26試験にも含む | pass |
| NC01 役割ナビ・登録直後の本人編集 | 親S02 CUAでinline新規シッター登録→本人プロフィール→設定2100円保存、確認待ちを維持。新規保護者登録直後に本人名編集・児追加・本人児選択。両役割と相談・依頼・予約導線を操作 | pass（親CUA） |
| NC04 保存児選択・重複・手動反映 | 親S01 CUAで2児選択→Aya候補、同一児の再選択は理由を表示して元の有効行を保持。児DOBをプロフィール変更しても入力中の条件は旧DOB、明示的な選び直しで新DOBを反映。既存成立依頼のDOBは旧値を維持 | pass（親CUA） |
| NC08 stale概算と同意の画面処理 | 親S01 CUAで2200円概算6600+500=7100表示後、別actorが2400へ変更。送信は時給変更エラー、入力・相談保持、旧概算/同意失効。再概算7200+500=7700で送信。後の2600円変更後も承認額7700を保持 | pass（親CUA） |
| NC09 実UIの競合・草稿保持 | 親S01 CUAで同一保護者の2タブ更新を競合させ、古い保存を明示拒否し草稿を保持。最新読込後の再試行成功。遅い応答のactor/草稿/画面間の失効は実装担当の自動状態試験で確認 | pass（記載範囲） |
| 新規利用者の一連操作・交通費明示0 | 親S02 CUAで新規保護者→プロフィール/児→検索→相談→概算7800+交通費0→同意→正式依頼→Ayaの交通費確認/承認。両役割の成立7800円と、再読込後の本人情報/児/予約保持を観測 | pass（親CUA） |
| 375px/1280pxの実画面 | 親CUAの実375px画像14/15/17、およびdesktop画像・操作。375pxのclientWidth=scrollWidth=375。画像13は名前にmobileとあるが実体はdesktopの別タブでありmobile証拠から除外 | pass（観測範囲、親CUA） |
| ブラウザー強制通信断・遅延応答の再現 | 強制断線/応答遅延は未実施。APIの保存失敗・再試行・競合、自動状態試験、実UIのrevision競合を代替の個別証拠として区別 | untested |
| 全WCAG・全ブラウザー監査 | 実施していない。画面観測を網羅的な適合判定に拡張しない | untested |

## 版の持ち越しと不一致の扱い
S01の独立APIは前後各照合、影響群の再実行も前後各照合の計4回すべて93660420a0e6c894de3e1438782258340aa067a0 / tree defcad7a759e34235ab2ff47de8f627277fa2e66に一致。初回の旧交通費fixture再起動検査は、メモリ上の transportProposal: undefined をそのままJSON保存後と比較して失敗した。JSONではundefinedプロパティが省略されるため、期待値もJSON往復で正規化し、当該1群のみ再実行して合格した。製品ソース・合格条件を変更した修正ではない。初回exit1と生ログを残す。

S01全体は登録のnative promptをIABで操作できず、全体合格としていない。S02は登録をinlineフォームへ修正した。Git差分では製品変更がsrc/main.tsxの登録UI接続であり、server.mjs/profile-domain.mjsはS01とS02でSHA256が完全一致する（evidence/next-core/S02/api-source-hashes.json）。親と独立レビュー担当による差分確認を根拠にAPI11群をS02へ持ち越し、無変更APIの反復実行はしていない。変更された登録UIは親S02 CUAで新規両役割・即時本人操作・成立まで再確認した。S01の既存観測は変更の影響がない範囲だけを持ち越す。

S02の親CUA直前照合05:28:40Z、後照合05:30:34.832614Zとも483a43c5dacf39ebdd27bef58eb25e51b6c64fb6に一致。独立担当も正式記録作成直前05:31:34.264329Zに同版・cleanを照合した。本書追加後の文書コミットは親が版差分を管理し、必要な持ち越しを記録する。

## 証拠参照
- 独立API初回: evidence/next-core/independent/final-9366042-20261017T0523/{precheck.json,run.log,postcheck.json}。trace: evidence/next-core/independent/results-2026-10-17T05-22-52-140Z.json（11群・HTTP188観測）。
- 期待値訂正後の影響群: evidence/next-core/independent/corrected-9366042-20261017T0525/{precheck.json,run.log,postcheck.json}。trace: evidence/next-core/independent/results-2026-10-17T05-23-33-978Z.json（1群・HTTP4観測）。
- 独立script: evidence/next-core/independent/verify.mjs、SHA256 d4b80519fd16ac4829913f86a71a26c84e91165380f07e65cd0f67dfba7456a5。fixture: baseline-fixture.json（1b8実ソース）、pretransport-fixture.json（73fcc実ソース）、出典・準備: preparation.md。
- 親実画面: evidence/next-core/parent/browser-results.json のchecks/limitsと、同フォルダの01〜21画像・テキスト。13はmobile証拠から除外。
- S02版・自動検証・CUA後照合: evidence/next-core/S02/{revision.json,commands.txt,checks.log,browser-postcheck.json,api-source-hashes.json}。
- S01実装担当の自動検証: evidence/next-core/S01/finalcandidate/checks.log。本書の独立API11群とは別に集計。

