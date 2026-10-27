# Loading and first-screen fixes — 27 October 2026

## What changed

- Retained tabs never become ready merely because four/eight seconds elapsed. A changed tab reloads before it is revealed; cancelling a pending navigation keeps the current screen.
- Profile renders its real Settings screen when the parser reaches it and a valid one-use account-paint handoff allows presentation. Auth/onboarding gates remain authoritative; pending settings stay hidden. Early preference clicks wait for their handler rather than silently doing nothing.
- Hidden Today's Brief pages/canvases are built on demand. UI localization processes changed subtrees instead of walking the complete document after every UI insertion.
- Production packaging extracts only identical large classic scripts shared across pages into content-addressed public assets. Script position, order and attributes are retained; unique Home/Chat entry code remains inline. These assets use an immutable cache independent of private application data.

## Reproducible checks

Run the frontend test suite and the real-browser regression fixtures, including `tab-readiness-browser.mjs`, `locale-incremental-browser.mjs`, `feedback-mobile-audio-browser.mjs`, and existing partner/service restoration fixtures.

Build from a clean committed public deployment package, excluding Backyard, tests, tools, research, credentials and `.qa`. Then run:

```
node tools/build-page-runtime.mjs .qa/<public-deployment-package>
```

The build command refuses the source checkout. Deploy the transformed package, not uncommitted sources. Check its runtime URLs and cache headers after deployment. Future deployment workflows must include this packaging step to retain the code-sharing benefit.

Local Chrome measurements used a synthetic account/API, 393×852 viewport, 4× CPU throttling, 80 ms network latency and 1.5 Mbps download. Profile's actual Settings screen appeared at 4,658 ms before and 2,284 ms after the early-paint change. This is a controlled local comparison, not a field percentile or a guarantee on real Android devices. First paint and fully initialized time are different measurements.

## Barba.js integration (supersedes the initial opt-in-only decision)

The app now uses the actual locally vendored `@barba/core` 2.10.3 runtime for
navigation, lightweight HTML requests/cache, transitions and top-level history.
`tools/vendor-barba.mjs` verifies the official npm tarball's pinned SHA-512;
the package's MIT license and asset SHA-256 are included. There is no runtime CDN
request to Barba or npm.

Pages middleware returns a small navigation host to top-level/Barba requests.
Same-origin frame requests receive the original app documents. `app-navigation.js`
keeps those isolated documents alive instead of evaluating their scripts twice or
reparenting live media. The bridge disables the old opt-in router inside these
views. `nav.js` delegates panel history to the host, avoiding invisible iframe
history entries. Existing backend auth, ownership, onboarding and moderation
decisions are unchanged. Anonymous shop/service/category SSR is preserved.

The previous screen remains visible until the next document has parsed and its
account presentation gates are open. Failed requests stay on that screen with
Retry/Stay; rapid taps are serialized rather than using Barba's hard-reload
fallback. Draft-bearing views and the live call owner are not evicted. Chat is
never instantiated in advance, so prefetch cannot consume an audio/AI handoff.
Returning to Chat accepts a new explicit entry intent or pending feature job.
Sign-out/account-owner changes discard all retained views and in-memory caches.

The service worker separates host/frame cache variants. Host HTML is private and
no-store; API requests and authorization-bearing requests are never cached here.
One idle Garage warmup on suitable devices fetches only its public static HTML,
without credentials or script execution. It does not boot Firebase, request GPS,
submit `/api/login`, or start a hidden AI job. Static asset routes are excluded
from Pages Functions via `_routes.json`.

Additional checks:

```
node --test test/barba-navigation.test.mjs test/navigation-cache.test.mjs
node test/barba-navigation-browser.mjs
node test/barba-app-browser.mjs
```

The full-document synthetic comparison (same throttling as above, service workers
blocked) observed seven outer document loads with classic navigation versus one
with Barba. Revisited Garage/Chat took approximately 0.24–0.35 seconds with Barba;
these are local fixture timings, not production field metrics. The fixture's
request interception disables ordinary browser HTTP caching, so its classic
timings must not be presented as real-user averages. First unvisited views still
need network/initialization and can be slower than classic on a cold cache; Barba
does not remove that cost. Production retains the shared-runtime packaging step.

Limits: auth/admin/public/legal/trip routes outside the allowlist use ordinary
navigation. A cold offline launch has a reconnect fallback, while already-retained
views continue to work subject to their own data availability. Web background
calls remain subject to browser/Android power restrictions. No physical Android
device or real-user Google sign-in was exercised by the fixture tests.

References: https://barba.js.org/docs/getstarted/lifecycle/,
https://barba.js.org/docs/advanced/strategies/,
https://barba.js.org/docs/advanced/third-party/ and
https://developers.cloudflare.com/pages/functions/middleware/.
