# Persistent voice + customer agent — 16 October 2026

## Implemented boundary

`call-continuity.js` retains the original Home/Chat document as call owner.
Only after an active call navigates, one visible same-origin customer-content
frame is created. It is reused, not a hidden preloader or another call. The
original Firebase/auth callbacks, mic, Live socket, transcripts and provider
resumption handle remain in their original realm. Child call controls borrow a
narrow owner facade, not a socket, credential or admin bridge. Normal no-call
navigation stays native. Hangup destroys the call then replaces the old owner
document with the current content route. Reload, tab closure, logout and account
switch are NOT promised to retain audio.

Customer routes only: garage, chat, messages, requests, public shops/services,
news, spares, profile and related normal app screens. Admin/staff/auth/identity,
API, external URLs, credentials and encoded traversal are not agent destinations.
External embedding remains blocked by SAMEORIGIN + frame-ancestors self; admin,
staff and login receive frame-ancestors none too. This same-origin frame is NOT
a sandbox for hostile code: never render/execute untrusted HTML/scripts in it.
Provider/tool text is rendered as text, not executable automation.

## Agent work that is available

- Existing selected-car view, real mechanic search, shop detail and urgent draft.
- Backend-owned projections of this customer's garage, requests and conversations.
- Reading an exact conversation only after server checks its customer owner.
- Opening an enumerated customer screen without replacing the call.
- Preparing an exact shop/message preview, then sending through normal messaging
  only after the human presses Confirm. The result has a real thread/message
  receipt; a sent message is NOT a booking, hiring or delivery/read acknowledgement.

`call-activity.js` shows task states and a bounded recent-activity list, not
chain-of-thought, invented progress percentages or fake success. A pending
confirmation cannot be overwritten by another tool status. Its random secret
stays in UI closures and is stripped from every model function response. Model
tool execution does not wait for a human: prepare returns pending immediately;
the later UI transaction has its own 20-second cancellation budget.

No arbitrary browser/URL/SQL/code executor, admin shortcut, account mutation,
deletion, payment, automatic hiring or job submission is exposed. Capabilities
are deliberately extensible, NOT unlimited. New consequential tools require
their own validation, ownership checks and confirmation design.

## Background audio: best effort, not an OS guarantee

Visibility changes/bfcache do not hang up. Hidden-page timer throttling is not
treated as an AI stall. If a background socket closes, logical call state is
retained and the existing resumption mechanism is used on return. Camera capture
stops in the background. Muted/ended mic tracks produce an interruption status;
the user can tap to reacquire a system-ended mic. No silent playback loop,
permission bypass, service-worker microphone or pretend audio is used.

A browser/OS can freeze/discard the page, interrupt audio, revoke a track, lose
network or terminate the app. Context/resumption and quota limits still apply.
Reliable background/lock-screen calling needs a separately implemented native
iOS/Android audio lifecycle/integration and real-device validation; it is not
provided by this web-only repository.

References: [Chrome page lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api),
[W3C Audio Session](https://www.w3.org/TR/audio-session/),
[Live session management](https://ai.google.dev/gemini-api/docs/live-api/session-management),
[Live tools](https://ai.google.dev/gemini-api/docs/live-api/tools).

## Verification / release

Current suites: 362 frontend and 363 paired backend automated tests pass.
These counts include regression checks, not 725 real-device or real-model tests.

Run the full frontend tests (canonical LF for unchanged generated legal assets).
`node test/persistent-call-preview.mjs` serves TEST ONLY at 127.0.0.1:4199.
It uses actual UI/navigation modules with a fake session/receipt and performs
NO device capture, Google authentication, AI request or real shop contact.
Browser QA: 390x844, home -> garage -> news -> messages -> same fullscreen call,
back navigation, preview retention, cancel/confirm and hangup. This is not a
real mobile background-audio acceptance test.

Use paired backend first/together. New client sends agentVersion:2; old clients
retain the four original agent declarations. CSS r6, agent r4, chat r2,
surface/session r5, continuity/activity r1, navigation/mobile r2; cache v284.
Before production: real authenticated Live tool/schema request; end-to-end
delivery with consenting test accounts; iOS/Android route, permission, lock,
background, network and auth tests; performance/memory with the retained owner;
review the draft privacy addition in the backend notes. No production deployment
or real mechanic notification was performed for this change.
