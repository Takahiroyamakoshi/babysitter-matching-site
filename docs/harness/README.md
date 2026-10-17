# 案件記録
cases/<case-id>/PROJECT.mdを入口に、design/、audits/、tasks/<task-id>/TASK.md、decisions/、EVIDENCE.mdを必要時に作成する。
雛形は .harness/templates/ にある。アプリルートからのパスを記録し、外部資料は所在と版を示す。
詳細証拠は evidence/<case-id>/<task-id>/<run-id>/ に保存しGit除外。全体検証はtask-idにwhole-product等を用いる。
証拠を自動削除しない。保存期限・圧縮・外部転送はユーザーの判断。クローンだけでは証拠実体を復元できない。
