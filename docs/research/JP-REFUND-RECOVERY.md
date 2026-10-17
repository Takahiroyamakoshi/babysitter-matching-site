# 日本の入金済みシッターからの返金原資回収調査

- 案件: JP-REFUND-RECOVERY / 調査版: v0.2 / 確認日: 2026-10-17（JST）
- 対象: 国内Stripe Connect、JPY、Direct charges、シッター銀行入金済み・連結Stripe available残高0。
- 基準: REQUIREMENTS v0.46・第29章D1、TECH-PAYMENTS v0.2 §10–11、TECH-STACK §6。
- 状態: **提案。採用・返金立替・資金操作の承認ではない。** 公開一次資料とローカル文書だけを確認。
- 維持する合意: サービス料15%、運営手数料の返還、戻らない元決済手数料の運営負担、未払い報酬の立替なし。
- 未決定: 一部返金細則、入金済み元本回収、返金立替、回収不能損失、チャージバック負担。

## 1. 結論と推奨

**本人の銀行→本人の連結Stripe残高→元の保護者カードへの返金を第一確認候補とする。**
本人補充機能自体は公式に存在する。Balances embeddedはStripeが負残高責任を負う口座の本人補充を明記し、Expressにも補充手順がある。[S4][S5]
ただし**日本の個人事業シッター・当該口座構成で、本人名義銀行から本人のJPY残高へ補充できることは公開資料だけでは確認未了**。
「日本では一般にtop-up可」だけでこの経路を確定せず、国・構成・送金者名義・補充先残高を指定してStripeに確認する。
Managed Risk＋dashboard=noneの候補を維持し、Balances追加と本人補充を確認する。Expressを選ぶだけで日本の回収が保証されるとはしない。
この確認が通らない場合、残高0・将来売上なし・本人不協力から、立替なしで即時カード返金を保証する方法は確認できない。
その状態を発売前の未解決条件とし、無期限pendingや未承認の留保金を既定の解決にしない。D1で有限の代替と責任者を決める。

## 2. 返金と負残高、将来売上は別の状態

| 確認事項 | 一次資料で確認したこと | 本件への適用・限界 |
|---|---|---|
| 残高0で返金 | カード返金はavailable不足ならpending。pending売上は使えない [S1] | 返金API受付やアプリの負残高表示を保護者への返金完了にしない |
| 負残高 | refunds/disputes等は負の残高取引を作り、可能なら将来売上と相殺 [S2] | pending refundと負残高は同義でなく併存し得る。残高をマイナスにすれば返金できるという保証ではない |
| 将来売上 | 新規決済が利用可能になり不足を埋めるとpending返金の解除につながる [S3] | 予約受注時・請求作成時・新規カード承認時に回収済みにはしない。新売上のfee等を控除した資金で不足を判定 |
| 長期未処理 | 公式supportはpending返金を45日後に自動失敗させると説明 [S3] | 恒久的な債務繰越策にしない。適用タイマーを確認し、期限前に人の例外処理へ |
| 活動停止・退会 | 将来売上がなければ相殺原資は発生しない（上記機構からの推論） | 退会を止めるだけでは銀行資金は戻らない。外部ID・債務・返金進行を保持し、別回収が必要 |
| チャージバック | 顧客銀行による異議。pending返金中の異議で返金が失敗する場合がある [S3a] | 自主返金の回収手段として勧めない。返金と異議の二重補償を照合し、元本・紛争費の負担を別判断 |

実務案: 返金決定→原資不足→本人補充案内→StripeでJPY利用可能資金/返金状態確認→返金処理→顧客側追跡を別管理する。
既にpending返金がある場合は、新規返金を重ねず同じRefundを追跡する。future offsetは運営独自のカード再請求ではない。

## 3. 日本で誰がどの画面から補充できるか

| 経路・構成 | 公開根拠 | 判定 |
|---|---|---|
| Stripe-loss / none / Balances埋込 | Stripe負残高責任の連結口座は自ら資金追加できる [S4] | **機能の存在は確認**。JP個人・JPY・不足発生後の対応・ボタン条件は未確認 |
| Express本人 | Balances→See details→Add to balance→金額/送金方法→Stripe銀行情報→送金確認 [S5] | **本人補充の一般手順は確認**。ACH等の説明をJPへ移植しない。losses=applicationの当事業JPでの有効化は未確認 |
| Account Management | 本人/事業情報・入金先銀行情報を更新する画面 [S6] | 補充機能の根拠ではない。Balancesとは別に必要 |
| Notification Banner | リスク対応・追加要件の通知/情報提出導線 [S7] | 自動回収や補充専用画面ではない。Managed Riskの必須導線と補充導線を区別 |
| full Dashboard一般 | 一般add-funds資料は日本の現地銀行送金/VBANとpayments balance補充を記載 [S8] | Connectの注記はplatform残高への補充を案内。本人connected口座への適用を証明しない |
| platform top-up | 日本GA、platform profile承認、同市場等の要件あり [S9] | platform銀行→platform残高の経路は文書化。シッター銀行→本人残高の根拠ではない |

Balances文書のprivate preview表示は多通貨精算/即時通貨換算に関するもの。補充全体をpreviewとも、JPのGAとも断定しない。[S4]
none候補の想定導線は「アプリのStripe残高欄→Stripe Balances→本人に表示される資金追加案内→本人銀行送金」。
最後の具体的な日本語ボタン名・指定銀行口座・本人確認/認証は未確認であり、上記は製品導線案であって検証済みクリック手順ではない。
本人のKYC・銀行口座・振込証憑はStripeの画面へ提出する。運営のメール/添付機能で原本の代理回収を開始しない。
一般Express補充記事には送金証憑の提出が求められる場合と1–7営業日程度の説明があるが、日本の所要日数保証には使わない。[S5]

### 送金者の名義・役割

日本の入金先口座は、法人なら法人名、個人事業なら登録代表者名の一致を求める公式説明がある。[S10]
SSA一般規約7.4もリンクする銀行口座の本人名義を要求する。しかしこれらは**top-up振込人名義の具体規則の証明ではない**。[S11]
シッター本人→本人connected用Stripe指定口座の名義照合、屋号/カナ、家族名義、第三者送金の拒否・返戻条件は未確認。
platformの指定口座をシッターへ渡して直接送金させる方法も、第三者資金受入れの承認・消込条件が未確認。既定にしない。
platform top-up操作は管理者権限＋2FA、検証済み銀行等を要求する。この管理者要件をconnected本人にも同じと決めつけない。[S9]
Treasury/Financial Account、顧客のbank transfer決済残高、Issuing補充の説明は、本件の決済残高補充とは別である。

## 4. 自動引落し・Stripe回収責任・運営送金

負残高の銀行自動引落しは公式の国別表が豪州・カナダ・SEPA/英国・NZ・米国を掲載し、日本を掲載していない。[S2a]
従って`debit_negative_balances=true`だけで日本のシッター銀行から引ける設計は採らない。
SSAの銀行引落し/相殺の契約上の権利は、当事業で使える日本のAPI・銀行レール・自動処理の提供証拠と異なる。[S11]
Managed RiskはStripeが回収を試み、連結口座の回収不能負残高を運営から控除しないと説明する。本人の債務免除や未原資の自主返金即時実行の約束ではない。[S12]
Express＋platform-lossでは運営reserve/長期負残高回収があり得る。既存の未払い報酬立替なし合意は、その損失責任を免除しない。[S2]

文書化された別経路は「運営銀行→運営Stripe payments balance→Transfer→connected残高→Direct charge返金」。[S9][S13]
platformの入金確認後、connected口座詳細のBalance→Add fundsまたはTransferを利用する。資金不足で失敗したTransferは自動再試行されない。[S9]
**運営自己資金で先に実行すれば返金立替**であり、本人から回収できたことにはならない。profile承認、口座/通貨/capability、当該目的の承認を別確認する。
losses=stripeではAccount Debitsは非対応だが、これはconnected→platformの徴収制限であり、platform→connected Transfer禁止の証明ではない。[S14]
Account DebitsはStripe残高の振替であり、銀行入金済み資金を本人銀行から回収する機能ではない。platform-lossでも同意・費用・残高/reserve条件を確認する。[S14]
逆に一般Transfer APIがあるだけで、JPの当該Managed Risk口座へこの目的で必ず送れるとも保証しない。Stripeに口座構成込みで確認する。

## 5. 元本・運営fee・必要補充額の計算

運営application feeは顧客返金に自動追随しない。`refund_application_fee=true`なら全額時は全額、一部時はcharge額比例で返却する。[S15]
独立したApplication Fee Refundもあり、元の徴収先Stripe口座へ戻せる。実費だけの返金等はcharge比例と事業上の負担割合が一致しない。[S16]
**顧客返金が資金不足pendingでも上記フラグでfeeが先にavailableへ入るか、その順序は公開資料で確認できなかった。**
独立fee返却APIも「成功応答＝直ちに返金に使えるavailable」を保証する記載は見つからない。元決済feeは返却されず運営負担を維持する。[S1][S16]

| 例（全額サービス料・実費なし） | 経済的な最終負担 | 原資確認の例 |
|---|---|---|
| 6,000円全額返金、運営900/本人5,100受取済み | 運営fee900返還＋戻らない元処理費。本人5,100返還 | connected0のままでは6,000円の返金をfundできない。900円が先に利用可能と確認できた場合、他控除なしなら残り5,100円 |
| 正額6,000に対し8,000請求、2,000返金 | 提案上は運営300、本人1,700。細則未合意 | 300円が先に利用可能と確認できた場合だけ残り1,700円。未確認なら2,000円全体の資金経路が必要 |

後者は当初fee1,200→是正後900の差額300という仮定。15%を変える提案ではなく、一部返金配分の未承認例。
手順案は、配分決定→必要なら独立fee返却→そのbalance transaction/利用可能残高を確認→不足の本人補充→返金完了照合。
これはfeeだけ先に返す資金移動も含むため採用判断が必要。顧客返金失敗時のfee返却済み状態と、二重fee返却防止を別管理する。
他の負残高・refund/dispute・reserveがあれば不足は増える。pending返金分が既に残高に反映済みか確認し、返金額を再加算して二重補充させない。
「運営300＋本人1,700」という責任配分だけで、シッターへの案内金額や運営の一時必要資金を断定しない。

## 6. 提案する選択肢と採否

| 案 | 利点 | 費用・運用・PII・限界 | 推奨 |
|---|---|---|---|
| A 本人→本人Stripe補充→カード返金 | 運営銀行で元本を預からず、将来売上に依存しない | JP有効化/名義確認が必要。本人の送金協力・銀行振込費/営業日。原本はStripeへ | **第一確認候補**。本人不払いは解決しない |
| B 将来売上の相殺 | 新しい送金手続が少ない | 売上発生/available化待ち、停止・退会では回収不能。pending期限あり | 補助策。単独の回収保証にしない |
| C 本人→運営銀行で回収後→運営Stripe→connected→カード返金 | 本人の返還が先なら元本立替を避けられる | 収納権限・債権者/弁済効・資金規制/会計を正式確認。銀行名義等のPII、消込、振込費・日数が増える | A不可時の条件付き代替。既存の運営銀行を経由しない方針の変更を別承認 |
| D 運営自己資金→Stripe→connected→返金、その後本人から回収 | 本人の回収待ちと保護者返金を分離できる | 立替元本・回収不能リスク・Transfer等の費用。二重回収照合 | D1で上限/財源/債権/免除条件を承認する場合だけ |
| E シッター→保護者銀行へ直接返還 | 運営の元本立替を避ける | カード返金とは別。双方の口座PII、運営feeの別返還、債務消滅確認、二重返金/異議。Stripe Refund完了にできない | 通常ルートにせず、外部返金が必要な例外で契約・Stripe条件確認 |
| F シッター→運営へ現金持参で回収 | 本人が銀行振込できない場合も回収できる | 対面・受領証・本人/金額確認・紛失防止・元本管理/消込が必要。運営銀行へ入金しStripe再補充→connected→カード返金する工程は残る。運営が元本を預からない方針の変更、収納権限・規制適用を個別確認 | 運用負担から採用を勧めない。現金回収自体をS17で禁止と判定しない |
| G 本人カードで自分の売上を作り補充 | 外見上は新残高を作れる | 実商取引なし、追加決済費・新たな異議リスク。規約の真正な商取引要件に抵触 [S17] | 採用しない |
| H 運営へ本人カードで返還金を決済 | カード入力UIは既存技術を使える | 新加盟店売上/債務返済の適格性、追加処理費・異議。規約は一定の債務回収を禁止しカード規則遵守を要求 [S17] | 合法/違法を一括断定せず、書面確認なしでは採用しない |
| I Stripe支援の手動回収 | 当該構成の指定送金先等を確認できる | 実際の回収可否/期限/費用は未確認。問い合わせ自体が回収保証ではない | Aの不足条件の確認先。未送信 |
| J 最低残高・入金遅延・reserve | 今後の原資不足を減らせる | 本人資金の拘束・機会損失・契約/入金制御権限が必要。既入金を回収できない [S2][S12] | 別の予防策。最低額や長期holdの採用は未承認 |

C/Dでシッターが運営に払う金額は、既に運営が返したfeeと二重にせず、契約で確定した本人負担元本を基礎とする。
Fのシッター→運営の現金回収と、保護者へ現金で返金する行為は別である。後者についてS17はカード取引の現金返金を原則禁止する（法令要求を除く）。この制限をFの回収行為へ適用しない。[S17]
単なる銀行回収を新しい保育売上に偽装しない。元処理費の運営負担を本人へ転嫁する案は採っていない。
日本法の適法性は本調査で確定していない。回収代行業等の一般禁止カテゴリだけで、本件固有の返還金回収を直ちに違法と扱わない。

## 7. 確定前に必要な判断と確認質問（未送信）

1. Stripeへ: JP個人事業、Direct、fees=application、losses=stripe、dashboard=none、full契約でBalances本人補充は提供されるか。GA/preview/API版/別審査は何か。
2. JP platform-loss/Express代替でも本人補充できるか。JPY不足発生前/発生後それぞれの画面・権限・本人認証と、実際の操作手順を提示してほしい。
3. 本人名義JP銀行→本人connected用Stripe VBANは可能か。送金者/入金先名義、屋号・カナ、第三者送金、必要KYC/証憑、最小/最大額、費用、消込/available化日数は。
4. payments balanceとFRODのどちらへ入り、既存pending返金・負残高へいつ充当されるか。補充分の再payout、停止/閉鎖時の送金/余剰返戻条件は。
5. connected0から全額6,000返金で`refund_application_fee=true`の900はいつ計上されるか。独立fee返却を先行して不足5,100にできるか。pending/失敗/取消時の扱いは。
6. JP platform top-up→当該stripe-loss connectedへ返金原資Transferは許可されるか。必要capability/profile審査/利用目的/名義・資金源・費用は。本人によるplatform用指定口座への送金は許可されるか。
7. JPの負残高回収は自動引落し以外に何が提供されるか。本人売上なし/不払い/退会/銀行閉鎖時、Stripeと運営の責任、期限、manual collection導線は。
8. 自主返金原資がない場合、Managed Riskは顧客返金をfundする義務を負うのか。pendingの45日期限の当該構成への適用、異議との競合・紛争費・元fee負担は。
9. 外部銀行返還の例外、運営へのカード返還金決済は許可されるか。必要契約/カード規則と、Stripe内の未完了返金との二重補償防止条件は。

D1への推奨判断: AのJP適格性を確認し、不可/本人不払い時はDの限定立替を許すか、許さないならC/E等の承認済み代替を作れるかを決める。
補充期限・顧客説明・担当者・エスカレーション期限を定める案とし、数値は未提案/未合意。公表返金期限と整合する運用が成立するまで本番決済の成立条件は閉じない。
成功確認案（将来の別承認範囲）: JP構成・名義/資金源の書面回答を得て、許可されたsandboxで0残高/fee先行/部分返金/pending失敗/異議/閉鎖の同一版証拠を取る。本調査では実行していない。

## 8. 証拠台帳・調査限界

以下は全て2026-10-17閲覧のStripe公式資料。更新日記載なしの技術/supportページは閲覧日を採用し、地域不記載を日本対応の証拠にしない。
検索範囲: docs.stripe.com / support.stripe.comのBalances、Express add-funds、Connect top-ups、JP/VBAN/name、pending/application-fee各組合せ。日本のconnected本人補充を明示する追加根拠は得られず、打切って未確認を記録した。

- [S1 Refunds: available不足・元処理費・元決済への返金](https://docs.stripe.com/refunds)
- [S2 Connect account balances: 将来相殺・reserve・platform責任](https://docs.stripe.com/connect/account-balances)
- [S2a Auto debit FAQ: 国/口座類型表](https://support.stripe.com/questions/auto-debit-faq)
- [S3 Fix your pending refund: 不足解消・45日・Connect差異](https://support.stripe.com/questions/fix-your-pending-refund)
- [S3a Express pending refunds: 返金未送金・異議競合](https://support.stripe.com/express/questions/pending-refunds-due-to-insufficient-funds-or-negative-balance)
- [S4 Balances embedded: Stripe-loss本人補充](https://docs.stripe.com/connect/supported-embedded-components/balances)
- [S5 Express add funds: 本人操作・送金証憑](https://support.stripe.com/express/questions/add-funds)
- [S6 Account management: 口座情報等の更新](https://docs.stripe.com/connect/supported-embedded-components/account-management)
- [S7 Notification banner: 追加要件・risk通知](https://docs.stripe.com/connect/supported-embedded-components/notification-banner)
- [S8 一般add-funds: 日本VBAN/決済残高・Connect注記](https://docs.stripe.com/get-started/account/add-funds?locale=ja-JP)
- [S9 Platform top-ups: 日本GA・profile承認・運営操作](https://docs.stripe.com/connect/top-ups)
- [S10 JP payout bank: 名義条件（補充条件とは別）](https://support.stripe.com/questions/add-a-bank-account-for-payouts-in-japan)
- [S11 SSA General Terms 7.2/7.4/7.5: 契約上の権利/口座名義](https://stripe.com/jp/legal/ssa)（更新2026-09-28）
- [S12 Managed Risk: 損失責任・介入・必須components](https://docs.stripe.com/connect/risk-management/managed-risk)
- [S13 Create Transfer: 運営→connected・原資条件](https://docs.stripe.com/api/transfers/create)
- [S14 Account Debits: connected→運営の制限・日本対応](https://docs.stripe.com/connect/account-debits)
- [S15 Direct charges: 明示fee返還・比例/独立返還](https://docs.stripe.com/connect/direct-charges.md?platform=web&ui=stripe-hosted)
- [S16 Application Fee Refund: 元の徴収先口座への返還](https://docs.stripe.com/api/fee_refunds/create)
- [S17 JP Service Terms: Stripe Payments 3.4(c)/(d), 10](https://stripe.com/jp/legal/ssa-service-terms)（現行ページの2026-09-28変更案内を確認）

実アカウント・契約適格性・日本の稼働画面・残高仕訳時点は未検証。事業者への送信、登録、API/資金操作、コード変更、テスト、commitは行っていない。

## 9. 変更履歴

- v0.2 / 2026-10-17 / 監査A01対応: §6 Fをシッター→運営の現金回収として修正。対面・受領証・元本管理・消込・Stripe再補充・方針変更・規制確認で評価し、保護者への現金返金に関するS17の制限と分離した。独立監査の再判定は未了。
