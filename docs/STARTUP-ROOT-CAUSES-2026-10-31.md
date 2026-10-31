# Startup root-cause release — 31 October 2026

## Scope and preservation

This is a frontend performance correction, not a redesign or data migration. All
20 existing HTML app pages remain. No account, shop, service, Garage record,
application, document, message, moderation decision or ownership is deleted,
reset, recreated or changed by this release. The existing backend Worker and D1
binding are not redeployed. The team's latest job-form UI changes through
`aedbd8d` are merged, not replaced by an older performance checkout.

No replacement loading screen, fabricated account readiness, new paid provider,
blanket local-storage reset or automatic approval is introduced.

## Measured causes and corrections

1. **Startup contention:** service-worker installation could fetch public code
   while the first actual app view was still opening. Registration now waits
   for real initial-view readiness, document load and an idle opportunity, once.
   Existing identity/onboarding gates are retained.
2. **Hidden layout work:** four page headers measured desktop navigation even on
   phones. Mobile exits before those reads. Desktop still gets the original
   synchronous first-frame indicator position, without an initial slide.
3. **Repeated geometry:** Home/category pagination measured hidden rails and
   repeated mutation callbacks. Measurements are coalesced per frame, hidden
   rails are skipped, and resize/reveal recomputes them. Home viewport CSS is
   only changed when the measured value actually differs.
4. **Decoration on the critical path:** Home's decorative canvas previously
   measured/drew during opening. It starts after the real view, load and idle,
   pauses offscreen, and caps only that background decoration at 30 fps. Reduced
   motion still renders a static background. Live call/waveform animation is not
   disabled. A browser assertion verifies that the decoration actually draws.
5. **External map dependency:** the same Leaflet 1.9.4 is served locally with its
   official JS/CSS SHA-256 integrity, license and all five PNG marker/layer
   assets. This is not a version upgrade or removal of the map. The independent
   main map no longer polls for up to six seconds for a fallback library.
6. **Parser-blocking request chains:** small, ordered header helper pairs share
   the existing production runtime bundles (18 header bundles vs 11). A broader
   deferred-script bundling experiment did not consistently help and was
   reverted; no blanket concatenation or exception-swallowing wrapper remains.
7. **Map lifecycle faults exposed by testing:** reverse-geocode, location,
   water/resize and move callbacks from a disposed form cannot update a newer
   form with reused element IDs. Nearby-job responses are validated before
   replacing successful inventory; stale responses do not paint another tab.
   Bad coordinates skip only the map marker, not the corresponding job record.

## Before/after cold-start measurements

Chrome, fresh isolated contexts, 393 × 852 viewport, synthetic completed account
and APIs, 60 ms delay per local static request, service worker blocked for equal
cold-cache conditions. Baseline is the team's `aedbd8d` production build;
candidate is the public package from `14098c0`. Both execute real Leaflet,
including the baseline, so blocking the old CDN cannot create a misleading fast
baseline by skipping the map code. Three paired runs per configuration,
alternating run order; medians below. No other audit suite ran concurrently.

| Home mode | CPU | Before: real view ready | After | Before: visible main controls | After |
| --- | --- | ---: | ---: | ---: | ---: |
| Default | Normal | 1,703 ms | 927 ms | 1,798 ms | 961 ms |
| Default | 4× slowdown | 5,103 ms | 4,463 ms | 6,402 ms | 4,869 ms |
| Saved AI mode | Normal | 1,632 ms | 942 ms | 1,667 ms | 997 ms |
| Saved AI mode | 4× slowdown | 3,864 ms | 3,838 ms | 4,479 ms | 4,186 ms |

These are synthetic laboratory results, not field Core Web Vitals, provider
latency measurements, real sign-in proof or a universal sub-second guarantee.
CPU-throttled cold Home remains materially over one second; the AI-mode
readiness improvement there is small and not evidence of a substantial gain.
Individual paired runs vary, including occasional candidate regressions. Raw
results stay in ignored local QA storage; they are not deployed.

### First navigation from a loaded Home

Separate sequential lab pass with the same synthetic account and static-request
latency. Time ends when the target's actual primary controls are visible;
returning to an already-open page uses the retained view. These are single-run
route checks, not statistical p95 claims.

| Destination | First use, normal CPU | Revisit, normal CPU | First use, 4× slowdown | Revisit, 4× slowdown |
| --- | ---: | ---: | ---: | ---: |
| Garage | 432 ms | 19 ms | 1,533 ms | 111 ms |
| Account | 325 ms | 13 ms | 941 ms | 102 ms |
| Shop | 576 ms | 19 ms | 1,101 ms | 90 ms |
| Magazine | 289 ms | 11 ms | 576 ms | 104 ms |
| Chat | 704 ms | 20 ms | 1,999 ms | 107 ms |

The all-device/all-network one-second goal is **not yet met**. Cold parsing,
style/layout, optional feature initialization, real identity/network latency and
the hosting device's load remain relevant. This release does not claim that a
ready page means an AI answer, live map tiles or every remote image is loaded.

## Validation and release procedure

- Frontend unit checks: 796 passed; backend safety suite: 646 passed.
- Actual source and built public package: 85 route/panel cases passed, including
  deep Garage, account, Studio, job, attachment and Chat entry points. This is
  broad route coverage, not every possible user state or real-provider workflow.
- All assertion-based browser suites are rerun before publication. The focused
  startup test verifies actual local Leaflet markers, a valid nearby-job map,
  old/new map-form isolation, preserved synthetic Garage inventory, no early
  decorative draw, and one service-worker registration after readiness/load.
- Source audit: 82 JS files, 187 inline scripts and 515 local static references,
  with no syntax/missing-static-resource issues. Dynamic URLs still require
  runtime/provider checks.
- Pages Functions compile successfully with installed Wrangler 4.152.0. Public
  packaging excludes Backyard, tests, tools, research, private QA, credentials
  and the internal handbook source. All 20 HTML pages remain public assets.
- Immediately before publication, capture the existing read-only mechanic-data
  release guard with logging disabled. Check it afterward; never restore or
  rewrite data automatically. A separate hashed companion can distinguish live
  GPS updates from changes to durable job data without retaining raw records.
- After publication, verify served asset/runtime hashes, all six shell/document
  variants, denied private endpoints, the protected shop's existing visibility,
  and browser navigation against production static files with all business APIs
  intercepted. No real user is signed in and no real message/job is submitted.

The previous build/configuration correction remains in place: Git-connected
Pages builds run `node tools/build-public.mjs` and publish `.pages-output`, so
team pushes do not silently replace optimized assets with raw source pages.
