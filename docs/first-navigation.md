# First navigation after refresh

The Barba host retains the actual same-origin documents, not cloned forms. Keep
the existing UID, owner inventory and media-session guards intact.

This release:

- Stops delayed Home graphics imports/rendering while that view is hidden.
- Packages large classic scripts and safe styles as content-addressed public
  assets. Execution order, IDs and cascade order remain unchanged.
- Restores identity/onboarding when the primary controls are wired, without
  waiting for unrelated footer tools. A live Firebase UID, matching local owner,
  validators and existing account gates are required before early foregrounding.
- Shows honest destination chrome immediately. It contains no invented account
  data; Cancel and navigation work while the real document prepares. Hidden
  views are inert. Latest intent wins without losing drafts or the active call.
- Keeps optional Garage detail clicks pending until their actual handler exists;
  colour/info controls keep their own handlers.
- Installs only essential navigation/account/validation assets on SW update.
  Other public tools are cached on use. Static Garage code can warm while idle,
  but a foreground tap stops dependency warming and never waits for it.

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
  colour controls, queued detail and actual refresh with service worker.
- `test/barba-navigation-browser.mjs`: drafts, history, cancel, rapid destinations,
  offline retry, call identity and sign-out isolation.
- `test/home-chat-barba-browser.mjs`: Home/inbox URL and active-tab consistency.
  Set `CENDON_NODE_PACKAGES` to the installed Playwright module directory; optional
  `CENDON_CHROME_CHANNEL=chrome` uses installed Chrome instead of downloading one.
- Existing account/Studio fixtures and the backend read-only mechanic release
  guard are still mandatory.

Timings are controlled browser measurements, not a guarantee on every phone or
network. Measure foreground controls separately from complete footer loading and
from the immediate loading chrome. Completely uncached loads on slow networks
can still exceed one second; never report a placeholder as fully ready content.
