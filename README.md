# Babysitter local synthetic demo

A loopback-only demo for synthetic registration, search, text consultation, normal-care request, and sitter approval. Do not enter real contact, address, identity, medical, or payment information. Identity verification, payment, email, sick care, post-illness care, and medication assistance are unavailable.

## Fixed fixtures

Two synthetic guardians and two reviewed synthetic sitters are included. Listing and requests require server-held qualification, training, notification, and initial-insurance checks. Newly registered sitters stay pending and cannot self-promote to listing or requests.

Reviewed sitters are available daily from 08:00 to 22:00 JST, within one day. The server rejects out-of-range slots, confirmed bookings, and the 30-minute travel buffer in search, request, and approval. Only Aya's fixed synthetic scenario accepts two or three children.

The browser app is React, TypeScript, and Vite. The dependency-free Node ESM server (server.mjs) owns the rules and price calculation.

## Start

Use the bundled Windows Node through WSL. The Vite build must finish before starting the server.

~~~bash
wsl -d Ubuntu -- bash -lc "cd /home/takahiro/project/babysitter-matching && /mnt/c/Users/PC_User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe node_modules/vite/bin/vite.js build && /mnt/c/Users/PC_User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe server.mjs"
~~~

Open http://127.0.0.1:8787 and stop with Ctrl+C. Data persists at data/local-demo.json. A normal Ctrl+C releases the single-writer lock. After an abnormal process termination, confirm no server process remains before removing data/local-demo.json.lock.

## Validate

~~~bash
cmd.exe /d /s /c 'pushd "//wsl.localhost/Ubuntu/home/takahiro/project/babysitter-matching" && "C:/Users/PC_User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe" node_modules/typescript/bin/tsc --noEmit && "C:/Users/PC_User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe" node_modules/vite/bin/vite.js build && "C:/Users/PC_User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe" --test server.test.mjs'
~~~
