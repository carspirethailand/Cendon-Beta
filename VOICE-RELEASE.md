# Fluid voice — 16 October 2026

Based on main 5084ff8, not the older local homepage. Keeps the flip/search hero, car selector, Studio, notifications, Valet, raw engine listening, live engine-bay scanning and resumable voice connection.

## Interaction

- Empty AI input: call. Text/attachments: send. Clear: call again. Empty Enter/IME composition cannot accidentally dial.
- Home microphone and primary call button start in place. Original form dimensions remain stable.
- Real microphone/playback envelopes drive the black bars and warm full-screen orb. Camera mode uses full-frame video, edge waves and zoom.
- Horizontal swipe hangs up; vertical scrolling and short taps do not. The original bar returns.
- Hold 1 second, drag the bead into the centre to expand the same session. Accessible expand/minimize buttons also work. Mode changes do not request another token or microphone.
- Flip gestures pause while the call is active. A floating dock is portalled above shop sheets.
- Existing engine tools use an explicit per-session bridge rather than chat-page globals. Controls stay at the bottom.
- Account changes, leaving the page and hanging up cancel requests and release devices/audio. Late work cannot reopen a call.

## Paired backend

Requires the companion backend change to src/live-setup.mjs and /api/ai/live-token for the four new agent tools: get_my_car, find_mechanics, show_mechanic, prepare_urgent_request.

Find reads real approved non-test shops. Show accepts only searched IDs. Prepare fills a draft only: no hiring, dispatch, payment or posting without the user's own review and submission. Private contact details, precise coordinates, VIN and plate fields are not sent in these tool results. No new web-search provider or paid grounding is enabled.

Existing listen_engine and scan_engine_bay remain available. Token tools are server-owned; older clients retain their existing behavior. Unsupported-model fallback reports voice-only capability honestly.

Release backend support first or alongside this frontend. This GitHub change does not itself deploy the Worker, change keys/billing or publish Backyard. Do not deploy unrelated dirty local files.

## Validation

Run: node --test test/*.test.mjs

UI fixture: node test/fluid-call-preview.mjs → http://127.0.0.1:4196/

The fixture uses the latest production hero/view/gesture/styles and synthetic audio levels only. It never opens devices, signs in, fetches applicants or calls an AI API. It is not a working telephone demo.

Checked: call/send switching, one-second hold/centre expansion, swipe return, camera layout/zoom controls, bottom engine tools and mobile layout. Tests cover cancellation, tool dispatch/results, resumption, IME, account cleanup and compatibility. No hardware FPS/latency measurements or live authenticated Gemini call were performed; test real iOS Safari/Android Chrome, permissions, interruption, background/resume and engine tools before production rollout.

Windows checkouts with core.autocrlf can cause existing site-generation checks to fail only because asset fingerprints hash CRLF instead of canonical LF. Canonical LF was used for those unchanged site files during verification; no legal content or site asset change belongs in this release.

References: [Live tool responses](https://ai.google.dev/gemini-api/docs/live-api/tools), [session resumption](https://ai.google.dev/gemini-api/docs/live-api/session-management).
