# 実行時の照合と記録

該当工程だけ読む。補助スクリプトはPython標準ライブラリのみで動き、判断・委譲・承認を代行しない。コマンドはアプリルート基準。

## 初回・環境変更時
`python3 .harness/scripts/harness_checks.py preflight --repo .` でGitと対象ルートを確認する。ブラウザ案件は `--browser google-chrome` 等を指定する。一覧取得であり、実行許可や正常動作の合格ではない。
- 親子の実効モデル・推論設定を起動メタデータで確認。同じ環境の確認は再利用し、毎タスク全役割を試し起動しない。
- Git書込は実装担当と同じsandbox・承認経路で、最初の必要な計画/実装コミットを行って確認する。空コミットや権限を緩める設定変更はしない。権限申請タイムアウトと拒否を区別し、結果照会後、失敗が確定した一時的タイムアウトだけ1回再試行する。再失敗は停止理由と必要な対応を親へ返し、独立した作業は続ける。
- ブラウザはテスト専用プロファイル・合成データ・ループバック限定サーバーを使用。初回から背景通信を制限する。Chromeを使う場合の候補は `--disable-background-networking --disable-component-update --disable-sync --disable-domain-reliability` と `--host-resolver-rules="MAP * ~NOTFOUND,EXCLUDE 127.0.0.1"`。外部接続が必要なら許可された接続先に合わせる。これらだけでパケット単位の遮断は保証しない。
- 日本語が必要なら日本語文字列を含む実画像を先に確認。`fc-match :lang=ja` の成功やDOM一致だけでは字体の合格ではない。欠落文字なら環境上の未検証として記録し、機能判定と分ける。適正ライセンスの利用可能なフォントを案件内で使用するか環境準備を依頼する。システム設定は黙って変更しない。
- 準備結果と未確認事項を案件記録に1回保存。環境が変わった項目だけ再確認する。

## 提出版の機械的照合
1. 実装とテストをコミットして作業ツリーを確定。未追跡ソースも残さない。
2. `python3 .harness/scripts/harness_checks.py capture --repo . --output evidence/T1/S01/revision.json` で実Gitから完全SHA・treeを採取する。T1/S01は対象試行に置換。証拠はGit除外し、毎回新しいパスへ保存。
3. 検証担当は検証前後に `python3 .harness/scripts/harness_checks.py verify --repo . --record evidence/T1/S01/revision.json` を実行。不一致・未コミット変更ならその版の合格を返さない。検証記録の書込はこの確認後に行う。
4. レビュー担当も記録を照合。手入力SHA、短縮SHAからの補完、同じprefixだけの一致を使わない。この記録は対象の証明であり、テスト・レビューの合格は別途必要。
5. 文書コミットを含めHEADが変われば厳密照合は失敗する。元証拠を維持し新しい版を採取。レビュー担当が差分を確認し、文書だけでも新しい対象版と持ち越す検証の根拠を結果に記録する。無変更の製品に全テストを強制反復しない。統合後は統合版を採取して関連検証する。

## 状態と介入
親だけがSTATUSとTASKの工程・試行ID・失敗回数・担当状態を更新する。子は自分の成果・検証・レビュー記録を保存し参照を返す。記録更新を委譲する場合は対象と一時的な単独書込担当を明示し、同時編集しない。

委譲前、結果受領後、差し戻し/待機/統合/完了の遷移時に、親がTASKを先に更新し同じ `state_version` をSTATUSへ反映してから次の委譲・完了報告へ進む。STATUSは索引、詳細はTASKが正本。中断で版がずれた場合はTASKと実状態を照合してSTATUSを修復し、操作を再実行しない。各ファイルは一時ファイルからの置換などで途中書込を避けるが、2ファイルを原子的に更新できるとは仮定しない。実行中の未コミット記録は残し、検証版を採取する前に単独の担当が必要な記録をコミットする。

介入はTASKに `intervention_id / requested_at / target_agent_or_process / action / receipt / observed_result / next_action` を記録。送信成功と受領・実施済みを分ける。子の応答や実状態で確認できるまではpending。応答欠落は提出失敗に数えず、親・子・プロセスを照会してから継続。親が動いている間に代替の親を起動しない。回線遅延だけでHarness不良・進展なしと判定しない。

## 時刻・利用量
TASKに起動/結果受領/外部待ち開始終了をUTCで記録し、実時間と待ち時間を区別できる範囲を残す。採取できない値は不明。経過時間を計算時間と呼ばない。

実行完了後、対象として確認した親子セッションファイルだけを指定して `python3 .harness/scripts/harness_checks.py metrics --session /absolute/parent.jsonl --session /absolute/child.jsonl --output evidence/run-01/metrics.json` を実行。既存の収集環境があれば優先。ログ形式非対応や記録欠落は不明。全履歴を親に読ませない。セッションごとの最後の累積値を1回集計し、キャッシュを入力へ二重加算しない。実料金・単一コンテキスト長とは扱わない。モデル変更時はセッションを分けるか別集計する。この補助のモデル表示は最後の記録値である。

数字を得るために成功した作業を再実行しない。大きな利用量は呼出回数・待機照会・再検証の内訳を調べ、推測だけでモデルを変更しない。


### このWSLで確認したフォント設定例
WindowsのMeiryoが利用可能なら、証拠フォルダへ次のFontconfig XMLを保存し、検証用Chromeの環境変数FONTCONFIG_FILEにその絶対パスを渡せる。Windowsフォントを配布物へコピーしない。パスは環境に合わせ、キャッシュはGit除外の案件内に置く。

```xml
<fontconfig>
  <dir>/mnt/c/Windows/Fonts</dir>
  <cachedir>/absolute/app/evidence/run-01/font-cache</cachedir>
  <alias><family>sans-serif</family><prefer><family>Meiryo</family></prefer></alias>
</fontconfig>
```

この設定は対象プロセスだけに適用する。フォントが存在しない別PCでは有効と仮定しない。新しい画像で可読性を確認し、過去の欠落画像は残す。
