# First navigation after refresh

The Barba host retains the actual same-origin documents, not cloned forms. Keep
the existing UID, owner inventory and media-session guards intact.

This release:

- Stops delayed Home graphics imports/rendering while that view is hidden.
- Packages large classic scripts as content-addressed public assets, with the
  primary handlers preloaded first. Keeps the original CSS inline: splitting it
  into 16–17 render-blocking requests created a latency waterfall.
- Combines adjacent, known synchronous head scripts into shared content-addressed
  code, at the same parser position and order. Inline/style/defer/async boundaries
  and currentScript users are never merged. This removes repeated blocking fetch
  waves without introducing another runtime or changing the original appearance.
- Restores identity/onboarding when the primary controls are wired, without
  waiting for unrelated footer tools. A live Firebase UID, matching local owner,
  validators and existing account gates are required before early foregrounding.
- Removes the intermediate loading screen entirely. The original view stays
  until the requested real document is ready; latest intent still wins.
- Prepares the actual requested document immediately. Barba's empty routing
  metadata is generated locally; no duplicate host request or five-route
  metadata prefetch competes with the real document. This is not visible UI and
  never replaces backend authentication or actual-document error checks.
- Reuses the same real Firebase SDK/session within this same-origin app, only
  for its expected project and owner. No cached UID manufactures authentication.
  Scoped observers are removed on eviction and paused/resumed for BFCache.
- Requires real Garage detail handlers and navigation before foregrounding.
  Primary details/Back work without waiting for odometer/3D/other footer tools.
- Acknowledges parent-owned history traversal in the originating frame; otherwise
  its internal navigation queue waited 800 ms and could retain a closed panel.
- Installs only essential navigation/account/validation assets on SW update.
  Other public tools are cached on use. Static Garage code can warm while idle,
  but a foreground tap stops dependency warming and never waits for it.
- Reuses content-hashed/build-versioned code after navigation reloads, including
  the initial HTTP-cache to CacheStorage handoff. Explicit no-store probes,
  private APIs and fresh HTML checks retain their network behavior.

## Release packaging

Run `tools/build-page-runtime.mjs` on the committed public deployment package
under `.qa/`, then deploy that package. Do not run it against the source checkout
or deploy the repository root. Private folders, tests, research and Backyard must
stay outside the published package. Verify the production alias as well as the
deployment URL: an automatic Git build may otherwise replace a manual deployment
with unbundled HTML. Future automatic builds should use this same packaging step.

## Verification

- `node --test test/*.test.mjs` (expand file globs on Windows).
- `test/first-navigation-browser.mjs`: real packaged documents, local synthetic
  identity/API, deliberately delayed optional footer, real Add car/validation,
  colour controls, immediate details/Back and actual refresh with service worker.
- `test/shared-auth.test.mjs`: real identity passthrough, owner/project rejection,
  scoped subscriptions, disposal and BFCache restoration.
- `test/barba-navigation-browser.mjs`: drafts, history, cancel, rapid destinations,
  offline retry, call identity and sign-out isolation.
- `test/home-chat-barba-browser.mjs`: Home/inbox URL and active-tab consistency.
  Set `CENDON_NODE_PACKAGES` to the installed Playwright module directory; optional
  `CENDON_CHROME_CHANNEL=chrome` uses installed Chrome instead of downloading one.
- Existing account/Studio fixtures and the backend read-only mechanic release
  guard are still mandatory.

Timings are controlled browser measurements, not a guarantee on every phone or
network. Measure foreground controls separately from complete footer loading and
from a loading screen (none is added). Completely uncached loads on slow networks
can still exceed one second; never report a placeholder as fully ready content.

Release check, 29 October 2026: three isolated Chrome desktop contexts, HTTP
cache and service worker enabled, 20 Mbps aggregate server-side transfer limit,
80 ms request latency, no CPU slowdown. The sequence was cold Home, actual reload,
then first Garage visit in that context. Primary controls were ready in 865, 911
and 976 ms; complete optional-footer parsing took 1167, 2890 and 2631 ms. Cold Home
took 1720, 1123 and 1113 ms. APIs/identity were synthetic, not real-user sign-in;
the checks must not be described as a universal one-second cold-load guarantee.
