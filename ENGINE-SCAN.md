# Cendon engine-bay scanner v2 — 16 October 2026

The existing Home/Chat call scanner now requests versioned image identification:
47 component types, at most 24 visible objects per frame, red numbered boxes,
bilingual canonical names and tap-to-hear explanations. Red is a location marker,
NOT an indication of damage. AI can be wrong; hidden/unclear parts are not claimed.

`engine-scan.js` validates results and handles image geometry. Load it before
`call-tools.js` on both pages. The paired CSS/tools assets are version r5,
scanner r2, session/surface r4 and new `call-chat.js` r1; the service-worker
cache is `cendon-v283-ambient-chat`.

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

## Covers and the supplied reference photos

The catalogue distinguishes cosmetic/acoustic engine covers, bolted/sealed
valve covers, battery enclosures, service panels and airboxes. A visible remote
jump post is not a visible battery; a washer filler is not its hidden tank.
Dipstick colour alone does not establish the fluid. Car nationality, logos,
large engine size and a low detection count never justify disassembly.

The scanner may pass a known `targetPart` and explicit rescan `viewAttempts`.
The server returns `leave_on`, `change_view` or `manual_required`. It never
approves a removal procedure, even when a caller claims approval. A missing
part is not proof it lies under the cover. Exact vehicle/engine manufacturer
instructions and qualified inspection are required before considering access.
The ten supplied photos informed provisional policy notes in the backend;
they have not been used to train weights or measure model accuracy. Originals,
plates and private paths are not included in either public repository.

## Chat without ending the call

Swipe the fullscreen stage down by 85 px, use its chevron, or select Chat in
the scanner. The same document opens an audio-reactive ambient-edge chat panel.
There is no route change, new token, microphone acquisition or second socket.
Camera/scanner capture stops when minimised; audio and the existing Live session
continue. Return, mute and hangup controls stay at the bottom. Transcript turns
(including interrupted partial turns), result cards and typed references remain
available in the same conversation. This is not a promise of unlimited memory;
provider context-window/compression and reconnect limits still apply.

Attachments are prepared in RAM and sent only on explicit submission:
JPG/PNG/WebP up to 8 MB, resized to 1280 px; PDF up to 3 MB; TXT/CSV up to 64 KB
and 12,000 characters each. Up to three files, 20,000 reference-text characters,
6,000,000 base64 characters in aggregate. HTML, SVG, scripts and arbitrary office
files are rejected. `/api/features/analyze` extracts a bounded untrusted summary
with the existing authenticated Gemini pipeline; only the summary enters the
current Live socket. Original bytes are not added to local chat history or a
new server store. Existing quota/provider data handling still applies. A
20-second cancellation budget, owner/session/socket checks and hangup abort
prevent late references from entering another call or account.

## Paired release

Release the companion backend first or simultaneously; it supports
`scanVersion:2` on `/api/features/analyze`. If absent, this frontend reports a
version mismatch rather than silently accepting unvalidated legacy boxes.
No new provider, image storage, keys, migrations or billing settings are added.
The existing voice transport, engine listening and agent actions are preserved.

## Verification

353 frontend automated tests pass. Run `node --test test/*.test.mjs` for the full suite. Windows CRLF checkouts can
cause the pre-existing site-generation fingerprint test to fail; verify with
canonical LF for the unchanged generated legal pages and their static assets.
Do not commit regenerated legal content as part of this scanner change.

Run `node test/engine-scan-preview.mjs` and open `http://127.0.0.1:4197/` for the
explicitly labelled synthetic UI fixture. It draws a schematic, returns mock
results and never requests a mic, camera, token or real AI service. It verifies
red boxes, duplicate-type controls, tap explanations, dark/unclear states, zoom
invalidation and mobile layout. It is NOT evidence of real component recognition.

`node test/ambient-chat-preview.mjs` serves a separate TEST ONLY fixture on
`http://127.0.0.1:4198/`, with fake conversation/results and no external upload.
Browser checks covered swipe-down, same simulated-call counter, typing,
text attachment, return to fullscreen, results and hangup at 390 px width and
568/844 px heights. This is UI verification, not a live audio/model acceptance
test. The fixture uses no icon-font network dependency; fullscreen icon glyphs
therefore require the normal app's bundled icon font for production appearance.

Before production, verify an authenticated model request and compare actual
results with mechanic-labelled photos. Test mobile permission, zoom, rotation,
interruption, background/resume, cancellation and call continuity. See the
backend's `ENGINE-SCAN.md` for real-image evaluation guidance.

This branch does not enable production scanning until deliberately released.
