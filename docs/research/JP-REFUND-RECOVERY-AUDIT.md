# JP-REFUND-RECOVERY 独立監査

- case/task_id: JP-REFUND-RECOVERY
- reviewer: jp_refund_review / harness-plan-review
- 確認日: 2026-10-17（JST）
- target_document_revision: docs/research/JP-REFUND-RECOVERY.md v0.2
- target_sha256: 0ff835cb218c1174a8a6950edfeb272870ce8efdbbd8aeccea1580c42a1e38c8
- revision_record: 読取時HEAD 321c1ac170e6aed42928aba5fe5f084c51cfc5e5。対象は未コミット文書の上記hash。
- context: REQUIREMENTS v0.46 第29章D1、TECH-PAYMENTS v0.2 §10–11、案件タスク。
- context_requirements_sha256: dcbf30948a178e995662653e36c1d278907879b78065100b292f33bc2afc9f06
- context_tech_payments_sha256: ec8d2d590bf0a5dfa5b05dceac377874f994e428f00478198d4c7452b93ca51e
- status: complete（公開資料による調査・提案の監査）
- verdict: A01解消。修正必須の残件なし。日本の実提供、契約採用、本番返金の実現性が合格した意味ではない。

## 対象と方法

国内JPY・Direct charges・シッター銀行入金済み・connected available/pendingとも0を問題場面として評価した。
独立してStripe公式文書と規約を読み、研究担当のv0.1全153行とv0.2のA01修正範囲を照合した。v0.2は全158行。
親の要件/TECH-PAYMENTSへの調査リンク・未確認留保追記も確認し、参照hashを更新した。
調査書を直接修正せず、本監査書だけを作成。実アカウント、外部連絡、資金、実装、テスト、commitは操作していない。

## 指摘と解消

- A01（v0.1修正必須→v0.2解消）: §6 Fは現金の受取人が曖昧で、カード取引の現金返金禁止を採否理由としていた。元質問のシッター→運営回収にその規約を直接適用できない。v0.2でFを本人→運営の現金回収と明示し、対面・受領証・預り・消込・銀行入金/Stripe再補充・適法性確認によって非推奨とした。保護者への現金返金とS17の適用を別注記に分離したため解消。

## 合格した条件

| 論点 | 独立確認と監査判定 | 対象箇所 |
|---|---|---|
| 本人補充の存在 | BalancesはStripe-loss connected本人の予防的資金追加を明記。Expressにも本人手順あり。noneを理由に不可能としない | §1、§3 |
| 日本への適用 | 一般JP/VBAN、platformのJP GA、connected本人機能を別証拠に分離。日本個人・JPY・既存不足・名義への未確認を維持 | §3、§7 |
| Preview範囲 | Balancesのprivate preview記述は多通貨精算/換算。補充全体の提供段階へ拡大しない | §3 |
| 原資と返金状態 | available不足のpendingと返金完了を区別。将来売上なし/退会、45日期限、異議競合を扱う | §2 |
| 自動回収 | 銀行auto-debit国表に日本なし。Account Debitsを本人銀行の引落しと混同しない | §4 |
| 損失責任 | Managed Riskの回収不能負残高負担を自主返金の無条件先払いに拡大しない | §4、§7 |
| 運営からの資金 | platform top-up→Transferを説明し、元本立替と本人回収を分離。実構成/目的の適合は留保 | §4、§6 |
| feeと必要資金 | 返却同意を維持。最終負担とavailable資金を区別し、feeの先行計上を未確認とする | §5 |
| 金額 | 6,000×15%=900、残り5,100。8,000→6,000差額2,000に対するfee差300・本人1,700は未承認の仮定 | §5 |
| 代替案とPII | 運営銀行経由、立替、保護者へ銀行返還、現金、カード、留保を比較。規約/費用/原本提出先を記録 | §6 |
| 合意境界 | 返金feeと元処理費だけが合意済み。元本回収・立替・部分返金細則・損失責任を新規採用していない | 冒頭、§5–7 |

## 事実確認の主な一次根拠

以下はすべて2026-10-17確認。個別契約・日本の実画面は未確認。
- [Balances](https://docs.stripe.com/connect/supported-embedded-components/balances): Stripe-loss本人補充の存在とpreview対象を確認。
- [Express add funds](https://support.stripe.com/express/questions/add-funds?locale=en-GB): 本人操作、証憑、一般所要日数を確認。日本の保証ではない。
- [一般add-funds](https://docs.stripe.com/get-started/account/add-funds): JP銀行送金/VBAN、payments balance、Connect platform向け注記を確認。
- [Connect top-ups](https://docs.stripe.com/connect/top-ups): platformのJP GA、審査、管理者/2FA、検証銀行、Transfer手順を確認。
- [Refunds](https://docs.stripe.com/refunds): available不足pending、元決済手段、戻らない元処理費、異議中の失敗を確認。
- [Fix pending refund](https://support.stripe.com/questions/fix-your-pending-refund): 45日失効とConnect構成差の注意を確認。
- [Account balances](https://docs.stripe.com/connect/account-balances)・[Auto debit FAQ](https://support.stripe.com/questions/auto-debit-faq?locale=en-GB): 将来相殺、負残高責任、日本がない銀行auto-debit対象表を確認。
- [Account Debits](https://docs.stripe.com/connect/account-debits): JP対応でもplatform-loss限定、同意/費用/reserve条件付きのStripe残高振替。
- [Managed Risk](https://docs.stripe.com/connect/risk-management/managed-risk): 連結負残高損失負担と必須UI。本人不協力時の即時自主返金保証なし。
- [Risk management](https://docs.stripe.com/connect/risk-management): 運営自身の負残高責任、Stripe-loss時のpause/debit制限を確認。
- [Direct charges](https://docs.stripe.com/connect/direct-charges.md?platform=web&ui=stripe-hosted)・[Fee Refund API](https://docs.stripe.com/api/fee_refunds/create): 明示返却、総charge比例、独立返却の宛先を確認。
- [JP口座名義](https://support.stripe.com/questions/add-a-bank-account-for-payouts-in-japan?locale=en-GB)・[SSA 7.4](https://stripe.com/jp/legal/ssa): payout/リンク口座の名義要件。top-up送金者規則への流用なし。
- [JP Service Terms](https://stripe.com/jp/legal/ssa-service-terms): Payments 3.4(c)の現金返金制限、3.4(d)の一定の債務返済制限、10の真正な商取引要件を確認。
規約は2026-09-28変更案内の現行ページを確認。カード回収を一律に違法とする判断は行っていない。

## 未検証と解消条件

1. 本人補充: JP個人・none/Stripe-lossとExpress/platform-lossそれぞれについて、既存pendingへの充当、画面、名義、資金源、費用、available化の書面確認が必要。
2. fee順序: independent fee refundと顧客refundの仕訳・利用可能時点、失敗時処理を確認後、許可された環境で検証する。
3. 運営資金経路: 当該JP connectedへ返金目的Transferを許すか、capability/profileと銀行入金条件を確認する。
4. 本人不払い: Aが利用可能でも資金/協力がなければ回収できない。C/Eも本人不払い自体を解決しない。有限の返金方針と資金負担をD1で決める。
5. 実運用: 公表返金期限、45日前の例外処理、退会/閉鎖、二重返金・回収、顧客追跡の責任者と期限を設計する。
6. 上記確認には別の外部連絡/契約/接続許可が要る。本監査でその実行や事業方針変更を承認しない。

## 親への判断

本人→本人Stripe補充を第一確認候補とする提案は妥当。日本適格性を確認できなければ、運営銀行経由または限定立替の条件付き案を具体化してD1へ戻す。
「日本の回収手段が確実に完成」「Stripeが全部払う」「立替なしで即時返金可能」と要約してはならない。
日本適用の未確認自体は調査失敗ではない。A01も解消され、実装・契約判断の入力として調査提案の監査を完了と評価する。
対象本文が変わった場合はhashを更新し、変更箇所の再監査を行う。

- artifact_review_evidence_references: 本書、対象調査書§1–8、上記公式資料。
- next_action: 親が調査提案を提示し、実提供確認とD1判断へ引き継ぐ。
- usage: 不明
