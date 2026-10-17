# Babysitter local synthetic demo

A loopback-only React/TypeScript demo for synthetic registration, search, text consultation, normal-care requests, and sitter approval. Do not enter real contact, address, identity, medical, or payment information. Identity verification, payment, email, sick care, post-illness care, and medication assistance are unavailable.

## Search, consultation, and pricing

Search separates children/dates from sitter preferences. Enter a distinct birth date for every child (one to three children); additional children are not filled by copying the first child. Normal care requires at least three hours in fifteen-minute increments. Invalid conditions are rejected before candidate filtering; a valid empty result is shown separately from input or connection errors.

Consultation keeps the conversation and selected sitter while editing dates or children. Every condition, sitter, actor, or transport change revokes the estimate and both consent checks. Responses from an older calculation cannot replace the current estimate.

An initial estimate includes basic care plus the night surcharge (20% only for 21:00–08:00 JST). Transport and the all-in total are **pending**, represented as null rather than zero. After discussing reasonable round-trip actual travel costs, enter an explicit nonnegative integer proposal (including zero only when intended), recalculate, and confirm the proposal, total, and cancellation terms before sending a formal request. The recipient sitter must explicitly confirm the proposed transport amount before approval. Guardian views show care, transport, and their total; the sitter view also shows the service fee and care proceeds.

The server stores prices, children, dates, transport proposal, and confirmation snapshots. Existing schema-1 requests/bookings and successful old operation replays retain their saved prices and behavior; no store reset or migration is needed.

## Fixed fixtures

Two synthetic guardians and two reviewed synthetic sitters are included. Listing and requests require server-held qualification, training, notification, and initial-insurance checks. Newly registered sitters stay pending and cannot self-promote to listing or requests.

Reviewed sitters are available daily from 08:00 to 22:00 JST, within one day. The server rejects out-of-range slots, confirmed bookings, and the 30-minute travel buffer in search, request, and approval. Only Aya's fixed synthetic scenario accepts two or three children. The service age limit remains the end of the child's third elementary-school year, in addition to each sitter's age range.

The dependency-free Node ESM server (`server.mjs`) owns rules and price calculation. `src/quote-state.mjs` supplies the UI's estimate identity, response guard, and consent gates, with independent pure tests.

## Start on Windows with the WSL checkout

Use the bundled Windows Node and a CMD mapped drive. Run from PowerShell (any Windows-native working directory). Build before starting the server:

~~~powershell
cmd.exe /d /c 'pushd \\wsl.localhost\Ubuntu\home\takahiro\project\babysitter-matching && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe node_modules/vite/bin/vite.js build && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe server.mjs'
~~~

Open http://127.0.0.1:8787 and stop with Ctrl+C. Data persists at `data/local-demo.json`. For an isolated run, append `--port 8790 --data data/isolated.json` to `server.mjs`, using a new filename for a new scenario. A normal Ctrl+C releases the single-writer lock. Following abnormal termination, first confirm that the owning server process is no longer running; do not reset the stored JSON data.

## Validate

~~~powershell
cmd.exe /d /c 'pushd \\wsl.localhost\Ubuntu\home\takahiro\project\babysitter-matching && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe node_modules/typescript/bin/tsc --noEmit && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe node_modules/vite/bin/vite.js build && C:\Users\PC_User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test server.test.mjs quote-state.test.mjs'
~~~

Tests cover server-derived prices/night decomposition, eligibility, disabled services, duration, multiple-child conditions, store locking/atomic failure, participant checks, idempotency, travel buffers, search filters and validation, pending/proposed transport, both confirmation gates, legacy schema-1 snapshots/replays after restart, and stale-response/consent invalidation. Browser usability and responsive layout are a separate verification step.
