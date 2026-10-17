# Cendon engine-bay scanner v2 — 16 October 2026

## 17 October 2026 error recovery

Paired backend fixes a reproduced HTTP 400 caused by provider schema constraints.
The existing strict result reader and red-box renderer are retained. Scanner
errors now distinguish unavailable provider, timeout, invalid result, sign-in and
daily allowance without exposing provider responses. Rescan stays in the same
call. Missing camera frames produce an explicit retry state, not an endless scan.
Home/Chat use tools r7 and scanner helper r3 (17 October); cache v295.

The existing Home/Chat call scanner now requests versioned image identification:
42 component types, at most 24 visible objects per frame, red numbered boxes,
bilingual canonical names and tap-to-hear explanations. Red is a location marker,
NOT an indication of damage. AI can be wrong; hidden/unclear parts are not claimed.

`engine-scan.js` validates results and handles image geometry. Load it before
`call-tools.js` on both pages. The paired CSS/tools assets are version r4; the
service-worker cache is `cendon-v282-engine-scan`.

The captured image matches the visible cover/zoom/mirror crop. Its long edge is
capped at 1280 pixels, without upscaling. A timed, cancellable request uses the
existing authenticated feature endpoint. Changing zoom/orientation, backgrounding,
losing local tracking or hanging up cannot apply old coordinates to a new view.
Stale boxes and cards are hidden, not left as clickable, dimmed suggestions.

Battery terminals, fluids, pipes, electrical and high-voltage components use
server-owned descriptions and observation-only safety text, not generated DIY
repair instructions. An unknown-purpose hose is labelled as unidentified.

This is NOT a newly trained model. No vision-accuracy percentage has been
measured and there is no guarantee of identifying every visible part.

## Paired release

Release the companion backend first or simultaneously; it supports
`scanVersion:2` on `/api/features/analyze`. If absent, this frontend reports a
version mismatch rather than silently accepting unvalidated legacy boxes.
No new provider, image storage, keys, migrations or billing settings are added.
The existing voice transport, engine listening and agent actions are preserved.

## Verification

343 frontend automated tests pass. Run `node --test test/*.test.mjs` for the full suite. Windows CRLF checkouts can
cause the pre-existing site-generation fingerprint test to fail; verify with
canonical LF for the unchanged generated legal pages and their static assets.
Do not commit regenerated legal content as part of this scanner change.

Run `node test/engine-scan-preview.mjs` and open `http://127.0.0.1:4197/` for the
explicitly labelled synthetic UI fixture. It draws a schematic, returns mock
results and never requests a mic, camera, token or real AI service. It verifies
red boxes, duplicate-type controls, tap explanations, dark/unclear states, zoom
invalidation and mobile layout. It is NOT evidence of real component recognition.

Before production, verify an authenticated model request and compare actual
results with mechanic-labelled photos. Test mobile permission, zoom, rotation,
interruption, background/resume, cancellation and call continuity. See the
backend's `ENGINE-SCAN.md` for real-image evaluation guidance.

This branch does not enable production scanning until deliberately released.
