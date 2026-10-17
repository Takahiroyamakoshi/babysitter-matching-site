# 技術選定の独立設計監査

- case/task_id: TECH-SELECTION / design-audit
- target_commit_or_document_revision: TECH-STACK v1.0、TECH-INFRA v1.0、TECH-PAYMENTS v0.2。対象SHA256は下表。
- revision_record: 基準HEAD 24ec79ffab4356dcc1b43ff795da2068788cec46。2026-10-17、設計担当の最終凍結後に本文とhashを照合。
- status: complete
- summary: **技術選定・比較・費用試算・後続検証条件をまとめる今回の設計成果はPASS。契約採用、G01/G03/G05全体、実装、公開の合格ではない。**
- unresolved: 下記の実機PoC、個別契約・日本適合、費用見積りとD1〜D4は未完了。担当と解消時点を後続ゲートへ保持。
- artifact_review_evidence_references: [選定案](TECH-STACK.md)、[基盤調査](../research/TECH-INFRA.md)、[決済調査](../research/TECH-PAYMENTS.md)、本書§3〜6。
- next_action: 親が本成果を提示し、G01業務契約の確定・独立監査からT01〜T10の有界な検証へ進める。外部操作は対象・操作の許可後。
- usage: 不明

## 1. 判定の範囲と対象版

設計担当とは別コンテキストで要件・選定・一次資料・算術を評価した。レビュー対象の本文は直接修正せず、指摘と解消条件を担当へ返した。本担当の作成物は本書のみ。ソース変更、依存導入、テスト再実行、外部アカウント/契約/送信/決済/配備は行っていない。

| 対象 | 版 / SHA256 |
|---|---|
| TECH-STACK.md | v1.0 / 9facd296d4794d26bbbe6146ae7201ebdb67b83e976d3d1be1364095c3fa2b4a |
| TECH-INFRA.md | v1.0 / f5c6f4c8601b846d69126dd9bfa2ffdc1728df2bb059bc16e83e5ec184af76b2 |
| TECH-PAYMENTS.md | v0.2 / 7c32b41096fd07612c7371a2bfb3413ec6b4853d313414bf021db3c72a51df3f |
| REQUIREMENTS.md | v0.45、技術資料への入口追記後 / d900993357785b03612189095ad029b2be74ecd6529260677b2ccf80e69d1058 |
| PRODUCT-COMPLETION.md | v0.2 / 9e1bbe449aa05f1a7a50a0fae45d0006dcd3d3d1488fc671e6d21cd02cadc7b2 |
| IMPLEMENTATION-CHECKLIST.md | 技術選定進捗追記後 / 474caf22870fd7ef6a0cf9a3935034cfa85315c3b1f1e9e30e40b6336ade7f96 |

親による最終タスク状態・参照だけの更新は別の版記録で扱う。本書のPASSを本文が変わった設計版へ自動転用しない。

## 2. 要件に対する評価

**既存TypeScript/React/Viteを維持し、Supabase Pro/PostgreSQLを第一案にする判断を支持する。** 要件§24のD1は既契約の必須条件ではなく候補であり、§29は技術適合調査を残している。DB原子性・認証・私有添付を統合する利点と、Deno移植・権限・復元を運営側が実装する責任を比較している。D1を不可能と断定せず、VPS/共有サーバーも実行環境と運用責任を条件に残しており、好みだけの排除ではない。

| 要件群 | 設計上の適合と実証への接続 |
|---|---|
| 全業務/状態 | 予約・実績・異議・支払・銀行入金を分離。通常保育以外の定期/面談/送迎/延長/変更を削らず§12で全体計画へ接続。G01の完全な対応表は未完成と明示 |
| 競合/期限 | 保護者・シッターguard行の一定順序lock、単一DB関数transaction、冪等IDとoutbox。未払い/審査変更も同じ規約。T01/T04で競合・途中失敗・期限境界を確認 |
| 認証/権限 | user編集属性を権限正本にしない。直接Data API/RPC/Storageの迂回、任意actor、旧JWT、aal2、事故の報告者別ACLをT02/T03へ |
| 通知/実績24h | Webとメールの結果を区別。通知失敗の誤起算、異議後自動再開、事故完了自動通知を禁止。通知成立点の詳細はG01で確定しT04で実証 |
| 添付/復元 | 原本を非公開、画像metadata除去、Tokyoと全処理国内完結を区別。DB backupにStorage原本が含まれない前提でS3 Tokyo別コピーと整合復元T06 |
| 決済/手取り | 15%対象から実費除外、処理費運営負担、85%+実費、運営立替/独自身分証回収なしを維持。料金・損失と日本契約はT05/T09・G05/D1へ |
| AI/予算 | 初期AIを自己紹介/公開FAQ/不備案内に限定しR範囲を維持。医療/審査/金銭決定を与えず、原子的な呼出予算確保・停止時代替をT08へ |
| 公開判定 | G01→G03/G05→構成更新→実装の順序、合成デモの本番混入禁止、D1〜D4とG25を保持。文書完成を製品完成としない |

## 3. 指摘と最終版の解消確認

| ID | 監査指摘 / 影響 | 最終版での解消 |
|---|---|---|
| TS-A01 | 有効user/現在roleだけではlogout済み旧JWTを検知できない。MFAのUIだけでも不足 | §4/8とT02にsession_id照合等、server/DBのaal2強制、旧JWT/直接経路の拒否を記載。設計上解消、実機未検証 |
| TS-A02 | sitterだけの排他では、全担当へ及ぶguardian未払いと承認が競合する | §4.3にguardian/sitter共通guardと変更経路の一定順序lockを明記。T01に競合試験。設計上解消 |
| TS-A03 | 短期署名URLは発行後の権限変更で即時失効する保証にならない | §8に残存窓、cache、厳格原本の毎回認可/no-store、取得済複製の限界を明記。T03で実証 |
| TS-A04 | Expressの簡便さだけで運営の回収不能負残高責任を既定化しない | §6/PAYMENTS§10でManaged Risk+none+embeddedを第一確認候補に変更。Express+運営損失はD1付き代替、Express+Stripe損失はpreview、full+application制約を分離 |
| TS-A05 | 必須Radarの追加費を除いた収支を最終採算に見せない | §6/PAYMENTS§10に必要tier未確認、追加費除外、Standard仮適用で少数利用赤字の感度を追加。G05で実見積りへ |

最終凍結版に今回の設計成果を差し戻す未解消阻害事項はない。上記の「設計上解消」は実装安全性の実証を意味しない。

## 4. 独立に照合した一次資料

以下は全て2026-10-17に再確認。一般機能の説明を当該アカウント・日本の訪問保育への契約承認に置き換えていない。

- [Supabase価格](https://supabase.com/pricing): Pro $25、compute credit、含有容量/呼出数、追加費を照合。[backup](https://supabase.com/docs/guides/platform/backups): DB日次・7世代とStorage原本非包含を確認。[sessions](https://supabase.com/docs/guides/auth/sessions): session_idとauth.sessions照合の根拠を確認。
- [Supabase変更一覧](https://supabase.com/changelog.md)と[Postgres更新](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)、[TLS変更](https://supabase.com/changelog/cbc-tls-ciphers-deprecated)を確認。既存float/NaN等の対象条件や旧TLSの影響を本案件で一律発生とせず、採用版/索引/ブラウザーの再確認へ割当。
- [SES価格](https://aws.amazon.com/ses/pricing/): 新規地域のEssentials $0.16/1,000受信者・固定費なしと追加費を確認。無料枠は積算の前提にしない。[S3公式東京Price List](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/ap-northeast-1/index.json): SKU CCBFTMENTDWZHXHX、先50TBの$0.025/GB月をJSONから独立抽出。
- [Stripe直接決済の費用負担](https://docs.stripe.com/connect/direct-charges-fee-payer-behavior): applicationとapplication_expressの相違を確認。[controller制約](https://docs.stripe.com/connect/migrate-to-controller-properties): v1 full dashboard+fees.applicationは非対応。[v2構成](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration)の一般表だけで非対応組合せが使えるとは判定しない。
- [Managed Risk](https://docs.stripe.com/connect/risk-management/managed-risk)と[リスク責任](https://docs.stripe.com/connect/risk-management): Stripe損失責任と運営処理費負担は別設定。direct charges/Radar/fullサービス契約/所定UI等の条件を確認。none+embeddedにExpressと同じpreview表示がないことは、日本でのGA・契約適格性の証明ではない。運営自身の残高責任・Stripeの介入は残る。
- [Connect日本料金](https://stripe.com/jp/connect/pricing)、[日本の費用課税](https://support.stripe.com/questions/taxes-on-stripe-fees-for-businesses-in-japan)、[Radar日本料金](https://stripe.com/jp/radar/pricing): 有効口座/入金回数に基づく費用、2026-04以後のVisa/Mastercard処理費への課税説明、Radar tier併記を確認。必要tierと実請求税務は未確定。
- [D1現行API](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[Clerk料金](https://clerk.com/pricing)、[さくらVPS](https://vps.sakura.ad.jp/specification/)、[PAY.JP Marketplace管理](https://docs.pay.jp/v1/platform-tenant-marketplace)の比較根拠を閲覧。Clerk年払と月払を混同しない。PAY.JPはv1標準フローの調査であり、v2/個別契約の全可能性を否定しない。
- [gpt-6-luna](https://developers.openai.com/api/docs/models/gpt-6-luna)、[廃止予定](https://developers.openai.com/api/docs/deprecations)、[データ取扱い](https://developers.openai.com/api/docs/guides/your-data): 公表単価、Responses対応、旧nano廃止告知とstore=falseでも監視保存等が残る点を確認。実アカウント利用可否、日本語品質、遅延は未評価。

## 5. 費用と負荷の再計算

Python Decimal等による独立再計算。各行の保守的な円切上げと未丸め値を区別する。USD=150円/税相当10%は比較用仮定で、現行為替や各事業者の請求税判定ではない。

| 検査 | 結果 |
|---|---|
| 選定案のソフト費用 | 4,125+106+83+150=4,464円、上側4,125+106+248+250+150=4,879円。AI上限1,000円を足し5,464〜5,879円 |
| 基盤調査の別モデル | (25+0.64+0.25)×150×1.1+300=4,571.85円。各費目切上げでは4,573円、AI枠込み5,573円。両資料はbackup/予備枠が異なり同一見積りではない |
| 為替170円の感度 | 同じ基盤調査条件で5,141.43円。ソフト5,000円目標を超過。為替/runner/容量等の実見積りと月次判定が必要 |
| AI月1,000回 | 入力200万token×$0.10/M+出力100万×$0.50/M=$0.70、円115.5→約116円。追加cache/再試行等は別 |
| 基礎決済1件/入金1回 | (6,500×3.6% + 200+250+5,600×0.25%)×1.1=767.8円。運営900−767.8=132.2円 |
| 基礎決済10件/入金1回 | (2,340+590)×1.1=3,223円、運営9,000−3,223=5,777円 |
| 基礎決済10件/入金4回 | (2,340+1,340)×1.1=4,048円、運営残4,952円 |
| Radar Standard仮適用 | 1口座・1件なら(175+8)×1.1=201.3円追加、残−69.1円。10件なら280.5円追加、入金1回の残5,496.5円。実際のscreen数/tier適用は未確認 |
| メール | 300×12+400=4,000受信者分/月。ピーク例30×12+40=400/日。月平均だけで日次quotaを合格にしない |
| poll | 10人×2h×30日÷15秒=144,000/月、20人なら288,000/月。20人常時は3,456,000/月。基盤モデル144,000+200,000+43,200=387,200呼出/月 |

手数料収入からの残額は利益ではない。返金/紛争/損失・確認労務・税務・事業保険等を未算入。ソフト見積りの余裕は小さく、backup runner、DNS/ドメイン、運用連絡の実費、取り出し/転送、容量増、画像処理方式をT07/T09で積算し直す。「月6,000円で総事業費を賄える」「300予約なら無料枠内」とは判定しない。

## 6. 未検証・条件待ちと解消条件

これは後続の実装/契約/公開を制約する事項で、今回の調査資料が未作成という意味ではない。

| 残事項 | 担当 / 解消時点 / 必要な証拠 |
|---|---|
| 全業務契約・通知起算・定期部分成功・例外 | 計画担当、G01完了前。状態/権限/料金/通知対応表と独立監査。実績報告終了後24hと保護者通知後24hを混同しない |
| 原子性・認可・runtime画像処理 | 実装/検証担当、G03・該当R受入前。T01〜T04で同時操作・SQL失敗・失効JWT・aal2・直接経路越権・EXIF除去の対象版付き実証 |
| 復元/負荷/費用 | 実装/検証/運用担当、G03/G23/G24・公開前。T06/T07でDB+objects+権限/鍵、整合点とRTO/RPO24h、20人/3秒、実使用量とrunner/追加費。日次backupという商品説明だけでは合格不可 |
| 決済・損失責任・追加費 | 調査/計画→ユーザーD1、G05・契約/実接続前。日本業種/個人シッター/可変額/取消料の承認、Managed Risk提供とRadar tier、85%+実費と全控除明細、残額/返金/紛争/口座閉鎖の責任 |
| 決済の実動作 | 実装/検証担当、許可されたsandboxでT05、G17受入前。外部準備状態、3DS、再送/順不同/通信不明、異議競合、入金照合。運営のアプリ内受付制限とprovider資金停止権限を分離 |
| メール/国外処理/保存/運営 | 調査/運用→D4、送信/実情報取得/公開前。SES承認・日次/秒速quota、DPA/再委託/地域、種別保存/保全表・担当・応答、T09 |
| AI/移行 | 計画/実装/検証、G22/G23/G25前。T08/T10の品質・PII・予算競合・停止代替、合成データ分離、ID/状態照合、送信主体一つ・戻し方 |

今回の技術選定はこれらを測定可能なT01〜T10へ接続できているためPASSとする。後続担当は未達条件を消して合格にせず、費用/方式/業務仕様への影響を親へ戻す。D2/D3も既存全体計画に保持し、契約採用・公開は別判断。
