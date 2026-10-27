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

## Barba.js decision

Barba swaps containers and does not rerun ordinary inline scripts after navigation. The existing pages use independent authentication, document listeners, global declarations and call lifecycles. Installing it across these pages without mount/dispose contracts would break functionality and would not solve the initial document load. This release keeps those lifecycles intact, fixes readiness, and shares/prefetches static code. The existing opt-in retained-tab mode stays opt-in; no new background private API calls are enabled.

References: https://barba.js.org/docs/getstarted/lifecycle/ and https://barba.js.org/docs/advanced/third-party/.
