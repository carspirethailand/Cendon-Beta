# Startup root-cause release — 31 October 2026

## Scope and preservation

This is a frontend performance correction, not a redesign or data migration. All
20 existing HTML app pages remain. No account, shop, service, Garage record,
application, document, message, moderation decision or ownership is deleted,
reset, recreated or changed by this release. The existing backend Worker and D1
binding are not redeployed. The team's latest job-form UI changes through
`5d7105a` (including the shared settings/tab preparation work) are merged, not
replaced by an older performance checkout.

No replacement loading screen added by the optimization, fabricated account readiness, new paid provider,
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
8. **Deep Garage route versus new car animation:** the parent's car layer must
   exist before the nested care/history layer opens. The View Transition returns
   its DOM-swap promise and the router awaits that, not the whole animation.
   This retains the team's new morph but prevents its delayed swap from losing
   a nested route. No car record is changed.

## Before/after cold-start measurements

Chrome, fresh isolated contexts, 393 × 852 viewport, synthetic completed account
and APIs, 60 ms delay per local static request, service worker blocked for equal
cold-cache conditions. Baseline is the team's `5d7105a` production build;
candidate is the public package from `1be2b4b`. Both execute real Leaflet,
including the baseline, so blocking the old CDN cannot create a misleading fast
baseline by skipping the map code. Three paired runs per configuration,
alternating run order; medians below. No other audit suite ran concurrently.

| Home mode | CPU | Before: real view ready | After | Before: visible main controls | After |
| --- | --- | ---: | ---: | ---: | ---: |
| Default | Normal | 1,138 ms | 1,084 ms | 1,170 ms | 1,106 ms |
| Default | 4× slowdown | 2,318 ms | 2,375 ms | 2,413 ms | 2,476 ms |
| Saved AI mode | Normal | 1,119 ms | 1,111 ms | 1,150 ms | 1,142 ms |
| Saved AI mode | 4× slowdown | 2,105 ms | 2,132 ms | 2,217 ms | 2,253 ms |

These are synthetic laboratory results, not field Core Web Vitals, provider
latency measurements, real sign-in proof or a universal sub-second guarantee.
Cold Home remains over one second (this measurement also waits for the team's
300 ms opening fade to be fully hidden). Against the latest, already-improved
team baseline, this release is **not a substantial overall cold-start speedup**:
normal CPU gains are small, and throttled results are slightly slower, within
the run-to-run variation. Earlier comparisons against `aedbd8d` showed larger
gains; those are not the final combined release comparison. Raw
results stay in ignored local QA storage; they are not deployed.

### First navigation from a loaded Home

Separate sequential lab pass with the same synthetic account and static-request
latency. Time ends when the target's actual primary controls are visible;
returning to an already-open page uses the retained view. These are single-run
route checks, not statistical p95 claims.

| Destination | First use, normal CPU | Revisit, normal CPU | First use, 4× slowdown | Revisit, 4× slowdown |
| --- | ---: | ---: | ---: | ---: |
| Garage | 456 ms | 25 ms | 1,325 ms | 114 ms |
| Account | 327 ms | 19 ms | 961 ms | 193 ms |
| Shop | 556 ms | 17 ms | 1,001 ms | 86 ms |
| Magazine | 424 ms | 10 ms | 517 ms | 213 ms |
| Chat | 684 ms | 15 ms | 1,380 ms | 139 ms |

The all-device/all-network one-second goal is **not yet met**. Cold parsing,
style/layout, optional feature initialization, real identity/network latency and
the hosting device's load remain relevant. This release does not claim that a
ready page means an AI answer, live map tiles or every remote image is loaded.

## Validation and release procedure

- Frontend unit checks after integration: 821 passed; backend safety suite: 646 passed.
- Actual source and built public package: 85 route/panel cases passed, including
  deep Garage, account, Studio, job, attachment and Chat entry points. This is
  broad route coverage, not every possible user state or real-provider workflow.
- All assertion-based browser suites are rerun before publication. The focused
  startup test verifies actual local Leaflet markers, a valid nearby-job map,
  old/new map-form isolation, preserved synthetic Garage inventory, no early
  decorative draw, and one service-worker registration after readiness/load.
- Source audit: 83 JS files, 187 inline scripts and 517 local static references,
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
