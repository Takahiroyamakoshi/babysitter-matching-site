# 決済方式の技術選定調査

版: 0.2 / 調査日: 2026-10-17 / 状態: 条件付き第一候補、契約採用・実接続未承認
対象: REQUIREMENTS v0.45 §12/22/24/28/29、PRODUCT-COMPLETION v0.2、G05/G17a/G17b
基準HEAD: 24ec79ffab4356dcc1b43ff795da2068788cec46（文書作成開始時）
範囲: 公開一次資料の閲覧と本書作成のみ。問い合わせ送信、アカウント調査、契約、実情報・決済操作なし。
以下の外部出典はすべて2026-10-17参照。公式説明の一般機能と、この事業への審査・契約適合を区別する。

## 1. 結論と選定条件

**Stripe ConnectのDirect charges＋費用運営負担を維持し、Managed Risk＋dashboardなし＋Stripe製埋込管理UIを優先確認候補とする。**
損失責任を抑える構成を先に確認し、Express＋運営損失負担はD1明示承認付きの代替とする。詳細・根拠・費用留保はv0.2補足の§10。
各シッターを売り手とする外部アカウントで総額を決済し、運営がサービス料金の15%だけを徴収する。
ただし、日本の訪問保育プラットフォーム・個人事業シッターに対する構成の承認と損失負担は未確認。
公開資料で構成可能性を確認した段階であり、G05の契約適合合格、G17の実接続許可にはしない。

- 85%＋実費、運営15%から決済費負担、運営銀行で売上を預からない方針は維持する。
- 優先確認候補はStripeが連結口座の回収不能負残高を負担する構成。運営自身の負残高・処理費等の責任は残る。
- §2に保持するExpress代替は運営が負残高損失を負う。**未払い報酬を立て替えないことと、カード損失の責任を負わないことは別**。
- 優先候補が使えず、運営も代替案の損失責任を引き受けられない場合は公開を止める。黙ってシッターへ費用転嫁しない。
- PAY.JP Platformは国内比較候補だが、公開標準フローでは口座原情報の自社収集とシッター負担の振込費が障害になるため、現要件の第一候補にしない。
- 通常設計の候補確定であり、D1の費用・契約・損失判断とD3の精算終了条件は残る。

## 2. 成立する資金構成と、避ける設定

以下の表とv1対応はv0.1で調査したExpress＋運営損失負担の代替案。現在の優先確認候補は§10。

Direct chargesは連結アカウントで売上が発生し、application feeだけが運営のStripe残高へ移る。
一般説明にある「売上からStripe費とapplication feeを控除」は費用設定に依存する。
専用の費用負担資料が示す `application` を使えば、Stripe処理費は運営から徴収される。
[Direct charges](https://docs.stripe.com/connect/direct-charges.md?platform=web&ui=stripe-hosted)、
[費用負担の仕様](https://docs.stripe.com/connect/direct-charges-fee-payer-behavior)

| 構成項目 | Express代替案の意味 | 公開資料から分かること / 残条件 |
|---|---|---|
| 売上主体・支払先 | 国内シッターの連結アカウント | 国内訪問保育と実費請求がその売り手の取引として認められるかは契約審査 |
| 手数料徴収 | `application_fee_amount=floor(対象サービス料金×0.15)` | 実費を率の基礎に入れない。15%はStripe費用込みの総控除額として扱う |
| 費用負担 | v2 `defaults.responsibilities.fees_collector=application` | Stripe費用を運営へ請求する。15%に処理費を追加上乗せしない |
| 損失責任 | v2 `losses_collector=application` | 連結アカウントの回収不能負残高を運営が負担。D1の明示判断必須 |
| 外部管理 | `dashboard=express`、Stripeによる要件収集 | 身分証・口座変更はStripe画面へ。自社本人確認画面を作らない |
| 日本国内 | プラットフォーム・シッターともJP、JPY請求/入金 | この組合せ・業種・契約と要求capabilityの利用可否は未確認 |

新規連携はStripeが推奨するAccounts v2を優先し、利用API版と日本の対応機能を検証して固定する。
v1を使う場合の対応は `controller.fees.payer=application`、
`controller.losses.payments=application`、`controller.requirement_collection=stripe`、
`controller.stripe_dashboard.type=express`。v2のrequirements収集者は設定から算出される。
[Accounts v2](https://docs.stripe.com/connect/accounts-v2)、
[v2責任設定とv1対応表](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration)

**`type=express` だけで作らない。** 旧設定は `application_express` となり、
Direct chargesの処理費が連結アカウントから引かれる。Standard相当の `account` も同様。
この設定で15%をさらに引けば85%＋実費を満たさない。
controllerの費用設定は作成時に決めるため、後から変更する前提で開始しない。
[v1 controller仕様](https://docs.stripe.com/connect/migrate-to-controller-properties)、
[Direct charge費用表](https://docs.stripe.com/connect/direct-charges-fee-payer-behavior)

Stripe負担の負残高責任も公式には選択肢があるが、Express Dashboardとの組合せは公開previewと記載される。
初期の損失回避策として無条件に採用せず、日本での提供・審査・必要UI・契約を別確認する。
Destination chargesは運営側のStripe売上から即時転送する代替で、運営銀行を経由せず所定額を配分できる。
ただし売上・返金責任が運営側へ変わるので、Direct charges不可の場合の契約再設計とし自動切替しない。
Separate charges/transfersは不要な資金管理と再送責任を増やすため初期不採用。
[構成とpreview条件](https://docs.stripe.com/connect/design-an-integration)、
[推奨構成と責任](https://docs.stripe.com/connect/integration-recommendations)

## 3. 日本・個人事業・KYCの適合

日本は公式のConnect対応国に含まれ、Stripeの日本向け案内は個人事業主の登録も説明している。
これは当該運営・全シッター・通常保育/面談/送迎/病児等の加盟審査通過を意味しない。
国内サイトの商取引表示、取引主体、提供サービス、資格・届出・保険、実費・取消料を示して正式確認する。
[日本の利用開始案内](https://support.stripe.com/questions/getting-started-with-stripe-a-guide-for-users-in-japan)、
[国・地域と既存Expressの条件](https://docs.stripe.com/connect/express-accounts)、
[制限業種](https://stripe.com/legal/restricted-businesses)

カード決済を行う連結アカウントはfull service相当の契約・必要capabilityが必要。
recipient agreementはカード決済を行えないため、送金先だけ作ればよいという設計にはしない。
[契約種別](https://docs.stripe.com/connect/service-agreement-types)
シッターは認証済み本人だけが開けるStripe-hosted onboardingで必要な本人確認・口座情報をStripeへ提出する。
アプリはAccount ID、決済/入金可否、要確認区分・期限などの最小状態を保持し、身分証・口座番号原本を代理回収しない。
戻りURLは完了証拠にせず、署名イベントとAccount APIの状態を照合する。
G17aでは資格審査と別に受付準備状態を管理し、未完了・要求追加・不整合では依頼受付/承認を拒否する。
受付時だけでなく請求前にも支払受付・入金能力を再検査し、変更は再設定導線へ戻す。
v1はcharges_enabled/payouts_enabledとrequirementsの制限理由、v2は対応するmerchant capability状態をAPIで取得し、未取得を合格にしない。
[Hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding)
外部KYCを使っても運営のリスク監視責任は残る。資格確認を「本人確認済み」と表示しない。
直接入金だから収納代行・資金移動・カード加盟契約・保育/税の確認が不要とは断定しない。
契約書上の債権者・弁済時点・収納権限・返金権限・資金経路を図示し、決済事業者と専門家の正式確認を公開条件とする。
## 4. 予約から利用後請求への設計案
1. 予約時にStripe-hosted Checkoutのsetup modeでカードを外部登録する。支払確保・与信枠保持ではない。
2. 将来の可変額、確定方法、24hの通知起算、取消料、異議時停止を明示し、off-session利用の同意・規則版を保存。
3. 初期は保護者×シッター単位のCustomer/SetupIntentを連結アカウント側で持つ案を推奨。売り手と保存カードの範囲を一致させる。
4. 複数シッターで入力再利用する将来案は、Stripe上のplatform Customer→PaymentMethod複製を別検証する。生カードの自社複製ではない。
5. 実績・承認済み延長・実費を確定し、保護者への通知成立時刻を記録。未報告・通知失敗では自動決済期限を開始しない。
6. 通常の明示承認、または通知後24h・異議なしで、確定版金額のDirect PaymentIntentを一度だけ送る。
7. 異議は請求権を保留し、当事者相談→運営→再提出後は保護者の明示承認だけで再開。時間経過では再開しない。
8. `requires_action` / カード失敗では未払いと追加認証/カード変更を案内。「再支払い」操作で本人が3DS等を行う。自動再請求を追加しない。
9. 成功は外部確定結果で記録し、全残債を照合後に全担当の依頼/承認/開始制限を解除。取消済み予約は復活させない。
Checkout setup、SetupIntent、off-sessionでも追加認証が必要になり得ることは公式機能。
アプリの24hルールや異議処理は本サービスの設計であり、Stripeが実施してくれる機能ではない。
[Checkout setup](https://docs.stripe.com/payments/checkout/save-and-reuse?payment-ui=stripe-hosted)、
[SetupIntent](https://docs.stripe.com/api/setup_intents)、
[追加認証と再利用](https://support.stripe.com/questions/saving-payment-methods-for-subscriptions-after-strong-customer-authentication-%28sca%29-regulations-take-effect)、
[カード共有の現行方式](https://docs.stripe.com/connect/direct-charges-multiple-accounts)
## 5. 二重請求・通知・異議競合
- 予約状態、精算版、請求試行、返金、入金を別管理。金額・通貨・売り手Account IDをサーバーで固定する。
- DBで精算版の請求権取得と異議受付を原子的に競合させ、1予約/精算版の成功を一意制約で保護する。
- 外部呼出し前にoutboxへ処理ID・状態・冪等キーを保存。同じ送信の通信再試行は同じキー・パラメーターを使う。
- タイムアウトは「不明」でAPI照合へ。新しいPaymentIntentを無条件に作らない。利用者の手動再支払いと通信再送を区別する。
- Webhookはraw body/署名/時刻検証→永続受信→速やかに応答→非同期処理。event IDと業務キーの両方で重複排除。
- 順不同・欠落はAccount/PaymentIntent/Refund/BalanceTransaction APIで補う。正しいConnectアカウント・live/test・金額/通貨を照合する。
- DBの保留確定後は送信しない。外部送信済みとの境界競合は取消可能性を照合し、既に成功なら「未決済」と偽らず決済後異議へ移す。
- 成功イベントが失敗より遅く届いても未払い・取消を二重発火させない。取消と成功の両立時は外部結果を保ち、人の返金判断へ渡す。
以上は実装時の提案。Stripeはイベント順序を保証せず、冪等キーは少なくとも24h後には削除可能なので、
外部キーだけで長期の二重請求防止を済ませない。照合ジョブ・監視・DBの永続制約を持つ。
[Webhook](https://docs.stripe.com/webhooks)、
[冪等リクエスト](https://docs.stripe.com/api/idempotent_requests)
## 6. 返金・損失・退会・入金

| 事象 | 方式上の事実 / 必要な運用設計 |
|---|---|
| 返金 | Direct chargeの連結口座残高を減らす。application feeは自動返却されない。全額/一部・サービス/実費の根拠を保存し、運営feeも明示返金する |
| 処理費 | 元決済の処理費は原則戻らない。追加費用の有無は契約条件確認。シッターへ再控除せず運営採算に計上 |
| カード紛争 | 決済前の実績異議とは別。元本はまず連結口座から回収、費用payer=applicationの紛争費は運営。根拠・期限・人の反証確認を管理 |
| 負残高 | §2のExpress代替では運営に回収不能損失・留保金負担。日本は公開される負残高自動銀行引落対応国リストに入っていない。回収できると仮定しない |
| 入金停止/閉鎖 | KYC期限・残高不足・銀行口座閉鎖で支払い成功と銀行着金が分かれる。新規受付を止め、未精算を保持し外部再設定へ。退会でID/証拠を消さない |
| 報酬保護 | 制裁として過去報酬を没収しない。返金/紛争による正当な修正と処分を分ける。閉鎖後の返金・回収方法は契約で確認 |
| 入金予定 | JPはdaily不可、manual/weekly/monthly。標準settlementは初回7暦日/以降4営業日の説明だがリスク審査等で変動。実際のavailabilityとpayout予定から表示 |

一部返金の運営feeは返す費目から再計算する。交通費500円のみ返す例で、900円feeを比例返金する設定を機械的に使わない。
初期提案は週次自動入金。月次なら費用は下がるが、シッターの資金繰りを悪化させるため費用だけで決めない。
本人の銀行着金を保証せず、残高/入金中/着金失敗を区別する。運営が未収金を報酬立替しない。
[Direct refunds](https://docs.stripe.com/connect/direct-charges.md?platform=web&ui=stripe-hosted)、
[返金費](https://support.stripe.com/questions/understanding-fees-for-refunded-payments)、
[負残高・留保金](https://docs.stripe.com/connect/account-balances)、
[日本の入金条件](https://docs.stripe.com/payouts)

## 7. 費用と手取り（JPY試算）

前提: サービス6,000円＋実費500円、総請求6,500円、運営fee900円、シッター5,600円。
国内JPY決済・JPY入金で通貨換算なし。JPY公表料金を用い、USD換算や架空の為替は使わない。
カード3.6%は総請求へ適用するため234円。運営の決済費控除後は666円、Connect/税前。
日本料金は通貨換算が必要なら追加2%、紛争受領は1件1,500円と公表される。
[Stripe日本料金](https://stripe.com/jp/pricing)

推奨は「料金を運営が管理」側: 月に銀行入金した連結アカウント1件200円、入金ごと250円＋入金額0.25%。
`fees=application` のConnect費も運営負担でありシッターの5,600円から引かない。
「Stripeが料金を管理」側のConnect無料と、この構成の価格を混ぜない。
[Connect日本料金](https://stripe.com/jp/connect/pricing)、
[application費用モデル](https://docs.stripe.com/connect/direct-charges-fee-payer-behavior)

2026-04-01以降Visa/Mastercard処理費も消費税対象。Connect等も課税対象と公式に記載。
以下は対象費の税率10%を仮置きした現金支出概算で、仕入税額控除・運営feeの税務処理は未反映。
1取引ごとの税丸めではなく、実請求書では請求書全体の端数処理となる。
[日本のStripe費用の課税](https://support.stripe.com/questions/taxes-on-stripe-fees-for-businesses-in-japan)

| 同じシッターの1か月 | 1件のみ・入金1回 | 10件・入金1回 | 10件・入金4回 |
|---|---:|---:|---:|
| 保護者請求合計 | 6,500 | 65,000 | 65,000 |
| シッター入金総額 | 5,600 | 56,000 | 56,000 |
| 運営fee総額 | 900 | 9,000 | 9,000 |
| 処理費・税前 | 234 | 2,340 | 2,340 |
| Connect月額＋入金費・税前 | 464 | 590 | 1,340 |
| 上記費用税込概算 | 767.8 | 3,223 | 4,048 |
| 運営残額概算 | 132.2 | 5,777 | 4,952 |

月額・入金費の分母は予約数でなく有効シッター数・実入金回数。短時間送迎や少額面談は赤字もあり得る。
固定費5,000円＋AI1,000円とは別枠だが、15%収入から人件費・税・返金・紛争・保険・確認業務も賄う。
15%を黙って変更せずG24で分布・入金周期・損失予備費を測る。実費が増えてもfee収入は増えず処理費は増える。

## 8. 国内比較と不採用理由

PAY.JP Platform Marketplaceは事業主/法人をテナントとして個別審査し、売上をPAY.JPから分配する。
Payouts型は個人間取引向けという公式区分であり、事業シッターを審査回避目的でPayoutsへ分類しない。
[Platformの型・入金](https://docs.pay.jp/v1/platform-introduction)

| 観点 | PAY.JPの公開標準 | 本件判断 |
|---|---|---|
| 直接分配 | `platform_fee` を指定、事業者から各テナントへ入金 | 運営銀行で預からない方向性に適合 |
| 決済費運営負担 | `payjp_fee_included=true` で利用料に含められる | 900円の総控除と実費除外が可能か、額指定/端数を検証対象 |
| 原情報非保持 | 公開tenant API例は運営が口座番号等を渡し専用フォームを用意 | 外部だけで口座登録・変更を完結する現行フロー未確認。現要件に不適合 |
| 手取り | テナント振込費250円（税込）がテナント売上から引かれる | 85%＋実費の銀行入金をそのまま満たさない。運営負担への契約変更可否未確認 |
| 料金透明性 | 標準3.3%・月額0円、入金250円。Platform費用ヘルプはbeta/変更可能性を明記 | 一律「最安2.59%」で比較しない。少額時の費用面は有望だが採用条件不足 |
| 閉鎖残額 | v1資料では削除時1,000円未満残高を運営利用料へ合算 | 報酬没収なしと衝突。残額保護の契約・現行版仕様が必要 |

[口座・費用包含・閉鎖仕様](https://docs.pay.jp/v1/platform-tenant-marketplace)、
[Platform費用](https://help.pay.jp/ja/articles/3451264-pay-jp-platform-pay-jp-platform%E5%88%A9%E7%94%A8%E3%81%AB%E3%81%8B%E3%81%8B%E3%82%8B%E8%B2%BB%E7%94%A8%E3%82%92%E3%81%99%E3%81%B9%E3%81%A6%E6%95%99%E3%81%88%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84)、
[現行料金](https://pay.jp/plan)
比較したPlatform技術資料はv1。v2の代替機能を含めた外部登録・損失契約の正式確認は未実施。
価格差だけでStripeから切替せず、上記3障害（原情報、振込費、閉鎖残額）が解消された場合に再評価する。

## 9. 正式確認のための限定チェックリスト（未送信）

1. JP運営/JP個人事業シッターの訪問保育・面談・徒歩公共交通送迎・実費・取消料は加盟可能か。病児等は将来範囲として別確認。
2. §10のManaged Risk/none/埋込管理UIを優先して日本提供・費用・API版を確認。§2のExpress＋losses=applicationはD1承認が必要な代替として確認。
3. 6,500円請求→シッター銀行5,600円、運営900円から全処理/Connect費という明細例を確認。銀行入金時の追加控除も含む。
4. 登録だけでなく追加KYC/口座変更も外部で完結できるか。運営の必須収集情報と閲覧できる情報の範囲は何か。
5. 利用後可変額のoff-session同意、24h通知後請求、取消料、追加認証/手動再支払いはカード契約上許容されるか。
6. 返金原資不足、紛争費・元本、回収不能負残高、留保金、口座/連結アカウント閉鎖後の回収と残額入金の責任・期限を確認。
7. 日本の週次/月次・最低入金額・入金失敗/再送、料金/消費税/請求書、当該事業の適用見積りを確認。
8. 運営の収納権限、資金移動等の評価、税・請求/領収書の主体を専門家と確認。直接入金のみで無規制と判断しない。

D1に提示する判断: 費用総額・損失上限/備え・契約責任を引受可能か。D3: 長期異議・未承認精算の終了条件。
次段階の合格証拠: 許可取得後のsandboxで明細・入金ゲート・追加認証・二重/順不同・通信不明・返金/紛争/閉鎖を同一版で実証。
本書は調査成果であり、その実証・外部送信・本番接続・法令適合・ユーザー判断の完了を示さない。

## 10. v0.2補足: 低い損失責任を優先する構成（2026-10-17）

**現在の優先確認候補はManaged Risk＋Direct charges＋費用運営負担＋dashboard=none＋Stripe製埋込管理UI。**
v0.1はExpressの手軽さを優先して運営の負残高責任を第一候補に置いたが、本件にExpress必須の要件はない。
連結口座の回収不能損失を運営が引き受ける構成を唯一の既定にせず、以下の候補を先に確認する。
旧案の技術調査は§2/6に代替案として保持する。本補足と冒頭の優先順位が旧記述に優先する。

| 項目 | 今回の確認事実 | 本件で確認する候補・未確認 |
|---|---|---|
| 費用と損失の分離 | Stripeが連結口座の損失責任を負う場合も、処理費を運営から徴収できる | v2 fees_collector=application、losses_collector=stripe。15%から費用負担を維持 |
| Managed Riskの条件 | Direct charges、Radar、Stripe-hosted又はembedded onboarding、カード受付capability、fullサービス契約が必要 | JP個人事業シッターの訪問保育等に対する有効化は未確認 |
| Dashboardなし | Stripe-hosted Dashboardを使わない場合、StripeのNotifications BannerとAccount Managementを埋め込む | dashboard=none＋Stripe製の通知/情報更新UI。運営による身分証・口座原本の代理回収を行わない |
| Previewの範囲 | Express Dashboard＋Stripe-lossはpublic previewと明記 | none＋embeddedに同じpreview表示は今回の資料で見つからないが、GAや日本提供の保証にはしない |
| 運営自身の責任 | Stripe負担は連結口座の回収不能負残高に対するもの。運営自身の負残高責任は残る | 運営fee返却・処理費・紛争費・契約違反/補償等の適用範囲を正式確認 |
| 介入・入金 | Stripeは連結口座の受付/入金停止・留保・閉鎖を行い得る | 85%＋実費は配分原則で、返金/紛争/留保中も銀行に必ず同額着金する保証ではない |

[Managed Riskの要件・提供・費用](https://docs.stripe.com/connect/risk-management/managed-risk)、
[責任と費用徴収の組合せ](https://docs.stripe.com/connect/risk-management)

full **service agreement**とfull **Dashboard**を混同しない。前者はカード受付のため必要だが、
v1のfull Dashboard＋fees.payer=applicationはunsupported。これを損失責任回避策として提案しない。
v1での候補対応はfees.payer=application / losses.payments=stripe / requirement_collection=stripe / stripe_dashboard.type=none。
v2ではrequirements_collectorを直接指定せず、対応API・要求capability・状態・利用可能な構成を検証して固定する。
[v1制約](https://docs.stripe.com/connect/migrate-to-controller-properties)、
[v2対応表](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration)

Managed Riskはlisted Payments/Connect価格なら追加料金なし、交渉価格なら追加料金の説明がある。
ただし必須Radarの必要プランと当プラットフォームへの適用費用は未確認。
日本Radar料金ページには、標準Payments料金に含むLiteと、platform向けStandardの8円/スクリーニング＋175円/有効アカウント、
Plusの11円＋500円、Proの14円＋800円等が併記される。LiteだけでManaged Risk要件を満たすとは断定しない。
[Managed Risk費用](https://docs.stripe.com/connect/risk-management/managed-risk)、
[Radar日本料金](https://stripe.com/jp/radar/pricing)

§7試算はRadar追加費を含まない。Standard適用・月1有効口座・成功1件につき1スクリーニングと仮定すると、
税10%の追加支出概算は1件201.3円、10件280.5円で、§7の運営残額はそれぞれ-69.1円、5,496.5円（入金1回）になる。
実際には失敗/遮断も課金対象になり得るため、成功件数だけを実測スクリーニング数と同一視しない。
必要tier、activeの定義、課税・月額・追加課金を見積りで確認し、Lite適用ならその確認根拠と費用を別記する。

G05の次の確認順: (1) 上記Managed Risk/none/embeddedのJP提供・API版・費用・原情報境界、
(2) 6,500→5,600/900から全費用の明細、(3) 運営自身に残る責任・入金制御・返金/閉鎖条件。
Stripe-loss構成では運営によるprovider側payments/payoutsのpauseや直接口座debitが制限されるという公式説明がある。
アプリの新規受付/未払い予約制限と、外部口座の資金停止権限を同一視しない。
[Stripe-lossの操作制限](https://docs.stripe.com/connect/risk-management)

この候補が当事業で使えない場合のみ、§2のExpress＋platform-lossをD1明示承認付きの代替として検討する。
いずれも未確認のまま契約採用・本番接続へ進めない。外部連絡・状態変更・PoCは実施していない。

## 11. 調査後に合意した返金方針（2026-10-17）
請求ミス等で返金が必要となった場合は、運営手数料も返還し、決済事業者から戻らない決済手数料は運営が負担する（2026-10-17合意）。全額返金では当該運営手数料を全額返還する。一部返金の算定細則、入金済みシッター分の返金原資・回収、原資不足時の立替、チャージバックの負担は引き続き未決定。
従来のD1留保のうち上記費用負担を確定とし、残る元本・回収・損失の判断と区別する。外部返金操作は行っていない。

## 12. 入金済み・残高ゼロの回収調査（2026-10-17）
詳細は [JP-REFUND-RECOVERY](JP-REFUND-RECOVERY.md)。本人補充機能はBalances埋込/Expressに存在するが、日本の当該Connect構成・本人銀行からのJPY送金条件は未確認。本人→本人Stripe補充を第一確認候補とし、運営からの資金追加は別の立替として扱う。将来売上やManaged Riskだけで、原資のない自主返金の即時完了を保証しない。調査提案であり、回収・立替方式の採用合意ではない。
