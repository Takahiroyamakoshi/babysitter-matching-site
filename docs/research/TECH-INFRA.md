# 基盤・認証・保存・通知の技術比較

- case/task_id: TECH-SELECTION / infrastructure
- revision: 1.0（調査提案。契約・実装・公開の採用確定ではない）
- 調査日時: 2026-10-17 07:43〜07:49 UTC / 同日16:43〜16:49 JST。料金・仕様は参照時点。
- 対象版: HEAD 24ec79ffab4356dcc1b43ff795da2068788cec46、要件v0.45全文、とくに§24/26/29。
- 入力: PRODUCT-COMPLETION v0.2、IMPLEMENTATION-CHECKLIST G01/G03、PRODUCT-INVENTORY v1.0。
- 手段: 公開公式資料・Supabase MCP search_docs。ユーザーのプロジェクト・組織・アカウントは調べていない。
- 区分: 「確認」は資料上の機能、「推奨」は本案件への設計判断、「未実証」は実機/契約/復旧試験待ち。
- 現状: React/TS/Vite + Node/JSON合成デモ。I01/08/11/17/20/21/27の本番認証・添付・DB・通知・復旧は未実証。局所テストPASSを引き継いで公開可とはしない。

## 結論と選定基準

**推奨B: Cloudflareの静的配信Free + Supabase Proの東京Postgres/Auth/private Storage/Edge Functions/Cron + SES。**
予約整合性をPostgres内で完結させ、認証・添付の権限も同じ利用者IDに寄せる。Workers Paidは最初から足さない。
静的配信はWorkers Static Assets Freeを第一案とし、1版20k files・1file25MiBの上限内で既存Vite buildを配信する。Pagesへの変更は必須にしない。[静的上限](https://developers.cloudflare.com/workers/platform/limits/)
AのD1は不可能とは判断しないが、予約・延長・未払い・定期回別の競合と認証連携の独自実装が増え、総費用優位が小さい。
CのVPSは既存Nodeを移しやすいが、OS/DB/認証/復旧を引き受ける担当時間が必要で、初期の第一候補にはしない。
本結論は資料比較の推奨であり、G03の原子性・権限・負荷・復元POCの合格判定ではない。

| 比較 | A Cloudflare Workers+D1/R2+Clerk | B 静的+Supabase Pro | C 共有サーバー / VPS+Node/Postgres |
|---|---|---|---|
| 原子承認・延長 | 条件付きSQL/制約/trigger等の設計とD1実機確認が重い | DB関数1呼出しのtransaction・row lock・制約が適合 | VPSは同じPostgres方式可、共有は環境条件次第 |
| 認証/MFA | ClerkのMFAはPro。Authと業務DBの同期が必要 | AuthのTOTPとRLS、業務role表を統合 | 管理Auth別契約か、認証の独自保守が必要 |
| 添付 | private R2+API認可を実装 | private Storage+RLS。署名URLの漏えい/失効は別管理 | private object推奨。サーバー公開ディレクトリへ置かない |
| 地域 | D1/R2のapac hintは日本固定保証ではない | 東京リージョンあり。CDN/委託先/支援経路は別確認 | 国内DC指定可。外部Auth/mail/backupの条件は残る |
| 復旧 | D1 Time Travelは強み。R2原本backupは別 | Pro日次DB backup。Storage原本backupは別 | pg_dump/WAL/objects/監視/復元を自主管理 |
| 移行 | JSON→SQLite SQL、Workers runtime移行 | JSON→Postgres、Node HTTP→Deno/FETCH境界を移植 | Node継続容易、JSON原子lockをPostgresへ変更 |
| 人の運用 | 複数vendor連携と権限同期 | OS運用は減るがRLS/復旧/配信は自責 | patch/証明書/ディスク/死活/侵入/DB更新も自責 |
| 判断 | 低料金だけで選ばず予備案 | **初期推奨、条件付き** | 運用担当・時間が確保できる場合の代替 |

## 現行料金・制限の確認

- Workers静的assetsは無料・無制限。Paidは最低$5/月、動的10M req/月とCPU30M ms/月を含む。
  追加req $0.30/M、CPU $0.02/M ms。Free動的100k/day・CPU10ms/requestは静的配信の無料と別。[Workers料金](https://developers.cloudflare.com/workers/platform/pricing/)
- D1 Freeはread5M/day・write100k/day・総5GB、Paidはread25B/月・write50M/月・5GBを含む。
  Paid超過read $0.001/M・write $1/M・storage $0.75/GB月。走査行とindex更新も計量され、返却行数ではない。
  Free超過はquery失敗。D1のDB上限・一件サイズも実機設計時に別照合。[D1料金](https://developers.cloudflare.com/d1/platform/pricing/)（更新2026-04-21）
- R2 Standardは$0.015/GB月、Class A $4.50/M、B $0.36/M、internet egress無料。
  無料は10GB月・A1M/月・B10M/月で、原本とbackupを合わせた保存量を数える。[R2料金](https://developers.cloudflare.com/r2/pricing/)
- Clerk Hobbyは50k MRU/app等、MFAはPro。公開表示は**年払$20/月相当**で、月払同額とは扱わない。
  Clerk DashboardのMFAと製品の管理者MFAも区別する。最新月払額・日本保管条件は採用前照合。[Clerk料金](https://clerk.com/pricing)
- Supabase Proは$25/月、$10/月compute creditでMicro1台相当。DB8GB/project、Storage100GB、通常egress250GB、cached250GB、
  MAU100k、Functions2M/月を含む。超過DB $0.125/GB、Storage $0.0213/GB月、通常egress $0.09/GB、Functions $2/M。
  computeはprojectごと。別の有料開発Microは概ね+$10/月で、Pro組織代が必ず2倍ではない。[Supabase料金](https://supabase.com/pricing)
- Supabase FreeはDB500MB・Storage1GB・egress5GB・Functions500k/月、低活動7日でpause対象、自動backupなし。
  これを公開運用の標準見積りにしない。Proも契約SLAを当然には含まない。[料金](https://supabase.com/pricing)・[本番チェック](https://supabase.com/docs/guides/deployment/going-into-prod)
- 開発はCLI+Docker互換runtimeでローカルstackを使い、クラウド2台目の常設費を避ける。
  ホスト資源・container/runtimeのライセンス条件・本番との差分試験は残る。今回インストールなし。[ローカル開発](https://supabase.com/docs/guides/local-development)

## 予約・延長・資格条件の整合性

- Postgresはrange exclusionによる重複防止と行lockを提供するが、SELECT後に別APIでUPDATEするだけでは安全にならない。
  推奨: 承認/変更/15分延長をDB関数へ集約し、同じtransactionでrole/本人・状態・期限・最新審査/入金準備・未払いを検査。
  guardianとsitterのguard行を一定順序でlockし、すべての競合更新経路にも同じlock規則を適用する。
  二重承認はstatus/versionの条件付き更新+unique idempotency keyで1結果へ収束。[Postgres lock](https://www.postgresql.org/docs/current/explicit-locking.html)
- 移動余裕は初期30分・本人調整可。前後の予約間隔を一度だけ確保し、両方へ30分ずつ加えて60分要求する誤りを避ける。
  occupied intervalのsnapshotと設定変更時の再検査を定義し、range constraintを防御に加える。
  range exclusionだけで資格/未払い等の業務条件を保証したとはしない。[range/exclusion](https://www.postgresql.org/docs/current/rangetypes.html)
- 対象年齢・複数人上限3/組合せの資格/自治体/保険・担当可能条件をサーバーで再確認。病児等は全経路無効。
  保険の初回確認と更新期限後「通知のみ・自動停止なし」を別状態とし、一般的なexpiry拒否ルールで既合意を変えない。
- 正式依頼はmin(送信+24h,開始)以降の承認をDB時刻で拒否。jobの遅れを承認猶予へ変えない。
  定期先4週は回別記録・料金版・取消/精算。まとめ承認の部分成功契約はG01で定める。
- DB関数は既定SECURITY INVOKER。特権が必要な処理のみ非公開schema・EXECUTE最小化・固定search_path・本人/権限検査。
  service_role/secretをbrowserへ渡さず、通常利用者の書込で無条件RLS bypassを使わない。[DB関数](https://supabase.com/docs/guides/database/functions)
- D1現行batch APIにはauto-commit/statement逐次commitという説明があり、古い公式blogは内部transactionと説明する。
  **今回、batchという名称だけから必要なrollback・競合保証を確定しない。** 単一条件付きSQL/trigger等で全条件を保護できるかを別POCへ。
  とくに0行UPDATEはSQLエラーとは限らず、後続履歴/通知outboxだけ成功させない。外部JSの事前重複検査だけに依存しない。
  [現行D1 API](https://developers.cloudflare.com/d1/worker-api/d1-database/)（更新2026-06-22）・[旧公式説明](https://blog.cloudflare.com/whats-new-with-d1)
- D1を選ぶなら同時承認、承認vs延長、同時buffer変更、未払い発生、再送、途中SQL失敗を公開同等runtimeで比較。
  local SQLite/JSONだけのPASSはD1保証の証拠にしない。今回これらの実行なし。

## 認証・権限・非公開添付

- 業務roleはguardian/sitter、運営は審査/事故/決済へ分割。公開profile、児/住所、資格原本、会話添付、事故報告を分離する。
  会話添付は参加者、住所は選択相手/依頼受信者、事故本文/写真は**報告者本人+事故権限運営のみ**。
  同予約の相手への暗黙共有を禁止。管理者がJWTのroleを書換えて昇格できないよう業務権限表を正本にする。
- 全公開schema tableはRLS、Storageもprivate+RLS。TO authenticatedだけでは不足し、recordの当事者/報告者/担当を検査する。
  viewの権限、UPDATEのUSING/WITH CHECK、直接Data API/RPC/添付URLの迂回を試験。[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)・[Storage認可](https://supabase.com/docs/guides/storage/security/access-control)
- 運営はTOTP MFA必須、server/RLSでaal2を検査。登録UIにMFAボタンがあるだけでは合格にしない。
  vendor管理consoleのMFA・回復手順も別管理。[Auth MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- signout/退会/停止後も未失効JWTが残る。署名+expの検証だけでは即時剥奪にならない。
  sensitive API/RLSは業務active状態、最新role、session_idとauth.sessionsの存在を確認する安全な限定helper等を設計する。
  user_metadataを認可に使わず、古いapp_metadata/role JWTも権限変更即時反映の根拠にしない。[sessions](https://supabase.com/docs/guides/auth/sessions)・[server auth注意](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- private bucketはJWT認証downloadまたは署名URLで配信可能。署名URLはbearer権限で、Auth key変更でも期限まで有効なため、
  発行時の認可だけで停止後の即時失効を保証しない。原本の強い剥奪要件は毎回認可する配信経路、短いURL期限、
  private/no-store、Referer/ログ漏えい防止を選び、発行済URL/キャッシュの残存窓を試験。[private bucket](https://supabase.com/docs/guides/storage/buckets/fundamentals)・[download](https://supabase.com/docs/guides/storage/serving/downloads)
- URL期限と原本の保存期限を分ける。保存はG04/D4の種別・目的・保全表に従い、医療一律30日を採用しない。
  削除jobも保全flag・監査・backup世代期限へ反映。R2 lifecycleは補助手段で紛争保全判断の代替にしない。[R2 lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- 画像はupload quarantine→実形式/容量/画素数検査→server側でEXIF/GPS等を除いた派生物だけ閲覧可能にする。
  client側削除・Storage resizeだけでは原本除去を証明しない。PDF等のmetadata/埋込も対象別に検討。
  Supabase Edgeはsharp/libvips非対応・CPU2秒なので、検証済WASM/純JS等で上限内のsanitize POCが必要。
  不達なら画像処理専用経路の費用を再見積りし、公開を止める。[Functions制限](https://supabase.com/docs/guides/functions/limits)

## 期限ジョブ・メール・24時間精算

- Supabase CronはSQL/DB関数とHTTP呼出しを実行でき、公式推奨は同時8job以下・1job10分以下（hard limitとは書かれていない）。
  期限scanは1分単位の小batchを提案。CronからのHTTPはpg_net、認証secretはVaultで保護する。
  publishable keyだけを「内部jobの権限証明」にせず、限定job secret/IAM相当の認可を加える。[Cron](https://supabase.com/docs/guides/cron)・[schedule/Vault](https://supabase.com/docs/guides/functions/schedule-functions)
- Edge Functionsは256MB、CPU2秒/request、Pro wall400秒・idle150秒。巨大backup/画像処理を一回に載せない。
  API/RPC、outbox配信・再試行をchunk化し、常駐Node serverをそのまま載せる前提にしない。
  Functionsから25/587番outbound不可なので、業務mailはSES HTTPS APIを使う。[Functions制限](https://supabase.com/docs/guides/functions/limits)
- AならCron Free5/Paid250 triggers/account、UTC指定、変更反映最大15分。job種類ごと利用者を増設せずdue_atをDBから読む。
  09:00 JST=00:00 UTC。実行の秒単位厳密性を商品保証にしない。[Workers制限](https://developers.cloudflare.com/workers/platform/limits/)・[Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- 永続outboxは業務更新と同じDB transactionで作成し、event_id+recipient+kindをunique化。
  lease/試行回数/次回時刻・指数backoff・失敗queue・監視を持つ。web通知とemail受付/配信結果を別記録。
  timeoutで送信結果不明なら再送が重なる窓を残すため、ベンダー冪等性/記録照合/業務idを併用し「exactly once mail」を約束しない。
- 実績通知から24hは、mail APIを呼び始めた時刻を起点にしない。web通知の永続化とmail受付/配送のどこを通知成立とするかをG01で定義。
  全失敗/復旧後の通知で期限を過去へ遡らせない。異議と決済開始のlock/状態遷移を統一し、異議後再提出は明示承認のみ。
  決済ジョブの再実行と「失敗カードへの自動再請求禁止」を区別。決済連携は別担当/許可。
- 保険30/7/当日の3回のみJST9時、事故受付は運営へ緊急件名、未払い/取消は双方へ。
  事故完了自動通知は足さず、医療/事故本文/住所をメール本文へ複製しない。ログイン後の対象画面へ誘導する。
- Auth内蔵SMTPはteam所属メール限定・低rate・本番向けでない。custom SMTPが必要。Auth側の初期30 new users/hour等も別rateとして設定確認。
  業務通知mailとAuth確認/回復mailの通数・失敗を合算する。[SMTP](https://supabase.com/docs/guides/auth/auth-smtp)・[本番確認](https://supabase.com/docs/guides/deployment/going-into-prod)
- Resend Freeは3000通/月かつ100通/day、Proは$20/月・50k通（追加$0.90/k）。300予約×双方を含む計12通=3600通、
  Auth/審査/保険/例外400通で**計4000通/月**を仮置きするとFree対象外。平均約133通/dayも100を超える。[Resend料金](https://resend.com/pricing)
- SES現行新規account/regionは2026-07-21からEssentials $0.16/k recipients、固定月額なし。4000通=$0.64/月。
  à-la-carte選択時は$0.10/kで$0.40、添付data $0.12/GB等は別。古い単価を新規既定と断定しない。[SES料金](https://aws.amazon.com/ses/pricing/)
- SESは地域別sandboxで確認済宛先のみ、200通/24h・1通/秒。production access審査、送信domain検証、
  DKIM/SPF/DMARC、bounce/complaint/suppression、quotaの確認を実送信前ゲートにする。承認は今回申請しない。[SES production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)

## DBと添付の復旧・地域条件

- Pro自動DB backupは日次・直近7日。**Storage APIの原本objectsを含まずmetadataのみ**。restore中は停止し、容量で所要時間が変わる。
  RTO24h/RPO24hは商品保証ではなく実測目標。PITRは最低$100/月級で本予算へ含めない。[Supabase backup](https://supabase.com/docs/guides/platform/backups)
- 推奨: 原本はimmutable key、変更は新key。12h単位の増分object copy+checksum/manifestを別権限の東京S3へ、
  DBの取得時刻とobjectの存在/削除tombstoneを対応づける。liveの削除をbackupへ即mirrorしない。
  DB日次backupの成功/経過時間を監視し、必要なら許可されたrunnerから12h論理dumpを追加。Edge内でpg_dump実行とはしない。
- 実装時にrunner/CI・秘匿情報保管・取得方法・追加費を確定する。家庭PC常時稼働に復旧を依存しない。
  S3 Versioningは誤上書き対策に使えるが、それだけで権限侵害・全version削除を防げるとはしない。[S3 versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- 復元演習は空の隔離先へDB+objects+ACL+Auth参照/secret復元、件数/hash・当事者/事故権限、外部決済照合、停止したoutbox再開を確認。
  RPO=最新整合復元点、RTO=検知から利用再開まで。少なくとも24h以内を実測し、通知の二重送信/二重決済も検査する。
- AのD1 Time TravelはPaid30日/Free7日、分単位復元。R2objectsまで戻らないので別backupが必要。[D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)（更新2026-04-21）
- Bは東京ap-northeast-1を指定可能。Functionsは通常利用者近傍で動くのでDB近傍Tokyo呼出しも明示。
  DBリージョン選択はCDN/log/支援アクセス等の日本限定保証ではない。[regions](https://supabase.com/docs/guides/platform/regions)・[Functions地域](https://supabase.com/docs/guides/functions/regional-invocation)
- AのD1/R2 location hintはbest effort。D1のapacは日本固定でなく、R2現行jurisdiction一覧はEU/FedRAMP/USで日本を示さない。
  日本限定が必須ならAをそのまま採用しない。[D1 location](https://developers.cloudflare.com/d1/configuration/data-location/)・[R2 location](https://developers.cloudflare.com/r2/reference/data-location/)（更新2026-08-19）
- Supabase再委託先一覧は2026-10-12版。AWS、Cloudflare、米国支援・監視等を含む。これは全社へ全原本送信する証明ではない。
  対象処理/保存国/支援経路/再委託/保持/消去/事故通知/DPA適用をG04/D4で確認し、医療/事故を入力しないsupport運用も定義する。
  [再委託先原本](https://supabase.com/legal/subprocessor-list/October-12-2026.pdf)・[DPA](https://supabase.com/legal/customer-resources/data-processing-addendum)
- 国外委託を一律違法とも、Tokyo指定だけで適法とも断定しない。SES/backup/vendorの条件を含め実情報前に確認する。

## 負荷と月額モデル（見積りであって実測ではない）

- 仮定: 300予約/月、ピーク20人、chat表示中10人×2h/day×30日×15秒間隔=144k poll/月。
  20人全員を24h開きっぱなしだと3.456M/月。非表示/バックグラウンド停止とbackoffを必須にし、全履歴を毎回返さない。
- 1poll 2KBなら通常約0.288GB、極端条件約6.9GB、認証/headers・画像/backupは別。
  144k polls+他API200k+1分job43.2kで約387k Functions/月。Pro2M内は仮算、空pollも課金対象。
- 差分indexはconversation_id+sequence、期限はdue_at+state。Aでは1poll10行scanなら1.44M/月、
  誤って1万行scanなら1.44B/月。query plan/実rows_readで測る。300予約という件数だけでは費用を保証しない。
- 添付は月300×平均4枚×0.5MB=0.6GB追加、資格等0.4GBを加え1GB/月を仮置き。
  保存期間未決なので恒久1GBとはせず、active+世代backup**10GB月**を見積り条件に置く。法定期間/医療30日はここから導かない。
- 換算は**仮定1USD=150円**、現行相場未照会。海外費の税/為替/カード手数料は契約時照合。
  比較用に海外費へ一律10%加算するstress計算を示し、税務上の実請求額とは扱わない。

| 構成/費目 | USD月額等 | 150円換算・計画額 |
|---|---:|---:|
| B Supabase Pro/Micro本番1台、CF静的Free | $25 | 3750円、10%仮加算4125円 |
| B SES Essentials 4000通、添付なし | $0.64 | 96円、仮加算106円 |
| B S3 Tokyo Standard 10GB月backup | $0.25 storageのみ | 約38円、仮加算42円。操作/取得/世代増は別 |
| B domain按分/軽微な監視/runner/API操作予備 | ベンダー未契約の計画枠 | 300円/月を仮確保、実見積りへ置換 |
| **Bソフト合計 + AI別1000円** | 上記条件 | **約4573円 + 1000円 = 5573円/月** |
| B別の常設開発Microを追加 | 概ね+$10 | +1500円税前、ソフト5000円超過 |
| B Resend Proへ変更 | SESの代わり+$20 | 差額約3194円(仮加算)で予算超過 |
| A Workers Paid5+Clerk Pro年払20+SES0.64 | $25.64+backup/domain等 | Bと近い固定費。年払前払・月払別額・R2/backup超過を要確認 |
| C さくらVPS 東京2GB / 4GB・月払い | 税込1958円 / 3960円 | +Auth/mail/backup/domain/監視。容量は性能保証でない |

- S3単価は公式公開Price Listの東京SKU CCBFTMENTDWZHXHX、2026-10-15T17:35:40Z版、先50TB $0.025/GB月を読取確認。
  [公式価格JSON](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/ap-northeast-1/index.json)・[料金内訳](https://aws.amazon.com/jp/s3/pricing/)
- 国内VPS価格は現行税込月払い、年額換算・他地域の安い金額と混同しない。[さくらVPS料金](https://vps.sakura.ad.jp/specification/)
  共有レンタルの機能表だけからNode常駐/Postgres/分単位jobが保証されるとはしない。製品別に要確認のため一律不可とも断定しない。[共有機能](https://rs.sakura.ad.jp/function/)
- 人件費の感度分析（調査者仮定）: B月1〜2h、A月2〜4h、C月3〜6h×3000円/h=3000〜18000円を別枠。
  初期構築/事故時は増える。実測でなく相対的な責任範囲の試算。Cで自作認証や無backupを選び見かけの費用を下げない。
- Bは余裕約427円しかない。為替170円なら海外3費約4841円(仮10%込)+300円でソフト5141円。
  日次容量増・runner費・mail増も監視し50/80/100%通知、AIだけは別1000円hard cap。budget alertは自動請求上限の保証ではない。

## 採用前のゲートと調査の限界

1. G01: 上記lock/状態・最新資格/未払い・buffer・定期部分成功・通知成立点を業務契約で確定。
2. G03: 同時承認/延長/変更と途中失敗、期限境界、JWT失効/管理MFA/事故別報告の越権、添付EXIF除去を実機POC。
3. G03/G23: DB+objectsを実復元しRTO/RPO24h、20同時/3秒、poll/API/画像/backup費を実測。未達なら改善か代替へ。
4. D1/D4: 課金quote、SES審査/送信domain、保存国・再委託・種別保存/保全、運用担当と復旧runnerを具体化して実情報前に判断。
5. 今回は公開文書調査のみ。外部project作成/契約/インストール/デプロイ/送信/実個人情報/実決済なし。G03全体は未完了。

- Supabase skillに従い最初にchangelog.mdを取得。2026-10-12告知の旧TLS CBC停止(11月10日以降)、
  9月25日のPostgres15.19/17.11更新(一部btree_gist等の索引条件)を確認。採用時のversion/対応browser/索引を再照合する。
  [TLS告知](https://supabase.com/changelog/cbc-tls-ciphers-deprecated)・[Postgres告知](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
