# 15分単位の日時入力 検証
- source_revision: ad05ad16008ae03bbe36eb3591eb7532d988884d
- revision_record: evidence/time-input/S01/revision.json
- parent CUA precheck: 2026-10-17T04:59:14Z PASS
- parent CUA postcheck: 2026-10-17T05:00:48Z PASS
- environment: アプリ内ブラウザー、http://127.0.0.1:8787、合成データ。既存API/保存データへの仕様変更なし。
- result: 今回の日時入力修正はPASS。独立成果物レビューは docs/reviews/TIME-INPUT.md。

| 確認 | 結果・証拠 |
|---|---|
| 検索・相談・概算の時刻入力 | options.json: 各開始/終了selectは96件、00:00〜23:45、分は00/15/30/45のみ。自由入力なし。 |
| 日時の保持 | 10:15と13:15を選択し日付2026-10-24を維持。3時間で検索でき候補2人、概算6,600円。日付のクリア後も開始10:15を保持、再入力後も維持。 |
| 日付未入力 | 実キーBackspaceによるクリア後、開始・終了日時の入力を促し、再計算と送信を無効化。04-incomplete-date.txt。 |
| 最低時間 | 10:15〜12:15では最低3時間を表示し検索無効、13:15に戻すと検索可能。02-minimum-time.txt。 |
| 条件変更 | 概算後、取消確認チェックを入れて終了13:30へ変更すると旧見積りとチェックが失効。06-time-change-invalidates.txt。 |
| 表示 | 01-search-desktop.png、03-consult-desktop.pngで日付全文・時刻を確認。05-estimate-mobile.pngは375px、DOM scrollWidth=375、日付幅193px/時刻100px。見切れなし。 |
| 既存検証 | 実装担当のtypecheck/build/既存17テストPASS。生出力は evidence/time-input/S01/checks.log を参照。 |

dateのfillだけではReactのイベントが反映されないブラウザー操作上の特性があったため、日付入力は実キー操作も併用し、更新後のDOMと計算結果で判定した。最初のfillだけの空表示をアプリの不具合とは扱わない。
実決済・本番認証・全ブラウザー/完全WCAG監査は対象外。今回の変更は共有UIと不完全な日時の検査だけであり、サーバーの15分刻み拒否は既存のまま。
