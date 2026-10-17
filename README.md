# Babysitter local synthetic demo

Product planning starts with [the integrated implementation checklist](docs/IMPLEMENTATION-CHECKLIST.md), [completion criteria](docs/design/PRODUCT-COMPLETION.md), and [current implementation inventory](docs/verification/PRODUCT-INVENTORY.md). The local demo described below is an intermediate result, not the completed product.

A loopback-only React/TypeScript demo for synthetic registration, search, text consultation, normal-care requests, and sitter approval. Do not enter real contact, address, identity, medical, or payment information. Identity verification, payment, email, sick care, post-illness care, and medication assistance are unavailable.

## Search, consultation, and pricing

Search separates children/dates from sitter preferences. Enter a distinct birth date for every child (one to three children); additional children are not filled by copying the first child. Normal care requires at least three hours in fifteen-minute increments. Invalid conditions are rejected before candidate filtering; a valid empty result is shown separately from input or connection errors.

Consultation keeps the conversation and selected sitter while editing dates or children. Every condition, sitter, actor, or transport change revokes the estimate and both consent checks. Responses from an older calculation cannot replace the current estimate.

An initial estimate includes basic care plus the night surcharge (20% only for 21:00–08:00 JST). Transport and the all-in total are **pending**, represented as null rather than zero. After discussing reasonable round-trip actual travel costs, enter an explicit nonnegative integer proposal (including zero only when intended), recalculate, and confirm the proposal, total, and cancellation terms before sending a formal request. The recipient sitter must explicitly confirm the proposed transport amount before approval. Guardian views show care, transport, and their total; the sitter view also shows the service fee and care proceeds.

The server stores prices, children, dates, transport proposal, and confirmation snapshots. Existing schema-1 requests/bookings and successful old operation replays retain their saved prices and behavior; no store reset or migration is needed.

## Fixed fixtures

Two synthetic guardians and two reviewed synthetic sitters are included. Listing and requests require server-held qualification, training, notification, and initial-insurance checks. Newly registered sitters stay pending and cannot self-promote to listing or requests.

Reviewed fixtures initially accept daily from 08:00 to 22:00 JST. Sitters can edit their own rate (1–10,000 integer yen), weekly seven-day schedule and date exceptions; a date exception overrides the weekly entry. Each day has one interval or is closed, in 15-minute steps, ending at 24:00 at most. Other overnight intervals are unavailable. The server rejects out-of-range slots, confirmed bookings, and the 30-minute travel buffer in search, request, and approval. Only Aya's fixed synthetic scenario accepts two or three children. The service age limit remains the end of the child's third elementary-school year, in addition to each sitter's age range.

The dependency-free Node ESM server (`server.mjs`) owns rules and price calculation. `src/quote-state.mjs` supplies the UI's estimate identity, response guard, and consent gates, with independent pure tests.

## Start on Windows with the WSL checkout

Use the bundled Windows Node and a CMD mapped drive. Run from PowerShell (any Windows-native working directory). Build before starting the server:

~~~powershell
cmd.exe /d /c 'pushd \\wsl.localhost\Ubuntu\home\takahiro\project\babysitter-matching && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe node_modules/vite/bin/vite.js build && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe server.mjs'
~~~

Open http://127.0.0.1:8787 and stop with Ctrl+C. Data persists at `data/local-demo.json`. For an isolated run, append `--port 8790 --data data/isolated.json` to `server.mjs`, using a new filename for a new scenario. A normal Ctrl+C releases the single-writer lock. Following abnormal termination, first confirm that the owning server process is no longer running; do not reset the stored JSON data.

## Validate

~~~powershell
cmd.exe /d /c 'pushd \\wsl.localhost\Ubuntu\home\takahiro\project\babysitter-matching && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe node_modules/typescript/bin/tsc --noEmit && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe node_modules/vite/bin/vite.js build && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test server.test.mjs quote-state.test.mjs next-core.test.mjs'
~~~

Tests cover server-derived prices/night decomposition, eligibility, disabled services, duration, multiple-child conditions, store locking/atomic failure, participant checks, idempotency, travel buffers, search filters and validation, pending/proposed transport, both confirmation gates, legacy schema-1 snapshots/replays after restart, and stale-response/consent invalidation. Browser usability and responsive layout are a separate verification step.

## Own profiles and availability

Demo registration uses a labeled display-name form in each role's card, including in the embedded preview. Successful registration opens that new user's own editor; submitting twice while registration is in flight is blocked.

Navigation follows the selected role. Guardians edit their own synthetic name/region and up to twelve saved children, then explicitly select a child in the common search/consultation/estimate conditions (or keep manual birth-date entry). Request conditions remain limited to three children; duplicate saved-child selection is refused. Updating a saved child's profile does not silently change an open request condition or a sent request.

Sitters edit their own rate and weekly/date availability without changing review permissions. New sitters remain pending even after settings are saved. Current availability is checked at search, request creation and approval; closing a day does not cancel confirmed bookings. Pending and confirmed prices/child conditions stay as sent. A new formal request sends the displayed estimate's rate as expectedRate; a changed rate returns 409 PRICE_CHANGED, keeps the conversation/input and requires a new estimate and consent.

GET /api/me returns {user} for the actor, including profileRevision (initially 0), guardian children or sitter rate/availabilitySchedule/listingReady. Bootstrap exposes switcher/public data without any guardian children. PATCH /api/me, POST /api/me/children, PATCH /api/me/children/:id and PATCH /api/me/sitter-settings all return {user}. Updates allow only documented fields and require expectedRevision plus operationId; stale revisions return 409 PROFILE_CONFLICT. Same-content retries reuse their operation ID; changing a draft starts a new operation. Saving is atomic, including the revision and original retry response. Profile editors keep drafts while bootstrap polling refreshes reservations; a conflict offers an explicit latest-revision read while retaining input.

The schema stays at 1. Missing profileRevision means 0, and missing availabilitySchedule falls back to the old availability (or 00:00–24:00). Reading defaults does not rewrite old users. Existing successful request/approval operations replay before new required-price checks. The small profile-domain.mjs module owns profile validation and availability; src/profile.tsx owns the separated editor and API components. No new dependencies are required.

## 技術構成
本番に向けた推奨構成・費用・採用条件は [技術構成の選定案](docs/design/TECH-STACK.md) を参照。現在のローカルデモの構成とは区別する。


## 通常単発の実施・実績確認（ローカル合成）

正式依頼を承認した後は「成立予約・実績」で開始→終了→実績提出へ進めます。保護者は「お知らせ」から最新版と成立時総額を確認し、明示承認または異議を申し立てます。異議後の訂正版は明示承認が必要です。「精算待ち」はローカル記録で、請求・実メール送信・入金はありません。

通常は Web 保存と合成メールadapter受付の両方が成立してから24時間で精算待ちになります。通知受付失敗・結果不明では起算しません。開始・終了時刻や実績の要約訂正で成立時の料金・交通費・対象児は変わりません。旧合成予約の不足情報は `legacy synthetic` と表示します。

合成時計を使う場合は、新しい専用ディレクトリに `clock.json` を作成し、既存データと異なる `--data` を指定します。以下はWSLで実行します（初回だけ `x` モードで新規作成）。

```sh
mkdir -p evidence/local-lifecycle/browser-S01
python3 -c 'from pathlib import Path; p=Path("evidence/local-lifecycle/browser-S01/clock.json"); p.open("x").write("{\"now\":\"2026-10-20T00:00:00.000Z\"}")'
/home/takahiro/.local/bin/node server.mjs --port 8796 --data evidence/local-lifecycle/browser-S01/store.json --synthetic-clock evidence/local-lifecycle/browser-S01/clock.json
```

画面に「合成時計（ローカル検証）」を表示します。2026-10-20 10:00〜13:00 JSTの予約を作成・承認し、別ターミナルでclockファイルの `now` を `2026-10-20T01:00:00.000Z` に更新すると開始できます。時刻はサーバー内で毎回参照し、通知workerは約1秒ごとに実行します。実績を提出した後、時計を24時間進めれば期限処理を確認できます。異議後の訂正版は時計を進めても保留のままです。ファイル更新は一時ファイルからの置換で行うと途中読取を避けられます。時計・障害注入のHTTP変更APIはありません。

API/障害/競合の試験は `node --test server.test.mjs quote-state.test.mjs next-core.test.mjs lifecycle.test.mjs`。合成メールadapterや時計は `start({clock, mailAdapter, jobInterval:0})` と `tick()` でin-process検証できます。実装証拠は `docs/verification/LOCAL-LIFECYCLE-IMPLEMENTATION.md` を参照してください。
