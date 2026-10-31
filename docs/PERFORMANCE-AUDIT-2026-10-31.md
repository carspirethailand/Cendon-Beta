# Cendon performance and navigation audit — 31 October 2026

## Outcome and limits

This release fixes measured first-view work, retained-view route/history races,
and the deployment configuration that discarded runtime packaging on later Git
pushes. It does **not** establish that every device, network or application state
loads in less than one second. No new loading-screen substitute or animation was
added. Backend code, ownership, moderation and database bindings are unchanged.

The team changes through `315fa07` (desktop map/call layouts and Passport switch)
were merged and tested, not overwritten.

## Root causes addressed

1. **Release pipeline:** a read-only inspection of the actual `cendon-beta`
   project found empty build command, output and root directories with Git builds
   enabled. A subsequent team push therefore published raw source pages instead
   of the manually packaged version. `tools/build-public.mjs` provides the same
   content-addressed runtime build for future Git and manual releases. Configure
   Pages with `node tools/build-public.mjs`, output `.pages-output`, repository
   root. This uses only Node built-ins and the existing runtime packager. Public
   assets only: no Backyard, test fixtures, research, credentials or internal
   handbook data. Pages Functions still compile from root `functions/` and `lib/`.
2. **Garage car paint:** synchronous canvas tinting plus PNG encoding was on the
   first-view path (`tintURL`, approximately 167 ms sampled self time in the 4x
   baseline CPU profile). Reuse the SVG colour matrix instead. The car image and
   colour appear together; no white-first conversion or PNG serialization.
3. **Display preferences:** repeated storage parsing, formatter construction and
   whole-document text traversal after small insertions. Snapshot preferences
   once, reuse bounded formatters and coalesce changed subtrees. Skip generic
   conversion traversal for canonical km/THB until conversion has been used.
   Keep explicit units, original values, account scoping and user text exclusions.
4. **Home decoration:** stop the canvas animation when its retained view is no
   longer visible. Live call/audio processing is not stopped. Cache the Home
   money formatter rather than constructing it per value.
5. **Retained Chat links:** an entry adapter swallowed deep paths without query
   parameters. Only mark an entry handled when it actually was; allow existing
   handlers to open the requested subpage. Do not replay attachment/AI jobs.
6. **Legacy settings links:** route Garage/News/Shop settings links directly to
   Profile settings rather than waiting for a nonexistent old panel.
7. **History races:** hidden/outgoing child views cannot rewind the active parent
   history while another page loads. Home URL repair only runs in its visible
   view. A closing settings sheet stops being a history layer immediately, not
   after its visual fade; a generation guard prevents an old close timer from
   deleting a newly opened sheet or stealing its focus.
8. **Forgotten source:** `spares.js` contained HTML `<script>` wrappers despite
   its `.js` extension. Removed only those wrappers. No callers were found, so
   this is a source-integrity fix, not a claimed speed saving.

## Verified coverage

- **785 frontend unit/contract tests passed.**
- **642 backend tests passed** without a backend deployment.
- **35 assertion-based browser suites passed**, including owner inventory,
  account restoration, Studio services/jobs, units, Chat navigation, call
  continuity, audio transport, Valet and settings sheet lifecycle.
- **85 actual-document routes/panels passed** with synthetic account/API data.
  Repeated against the generated public build, not just source HTML. These cover
  all six retained tabs, Garage details/add/colour/info and legacy detail tabs,
  settings sections/legacy aliases, Studio edit/post/QR/stats/work tabs, and
  Home/Chat tool-entry sheets. Tests return Home between paths to exercise
  retained state and rapid close/open history transitions.
- Static inventory: **20 HTML documents, 55 literal route registrations, 12
  watched panels, 38 redirect entries and 38 Console links**. Counts describe
  discovered surfaces, not 100% behavioural coverage.
- Static audit: **83 top-level JS files, 187 inline classic scripts and 512
  static local-resource references** checked with no syntax/missing-file issue.
  **53 dynamic references** cannot be resolved statically; the browser suites
  exercise selected dynamic paths rather than pretending all were proven.
- Public-build tests verify cacheable code, source preservation, required pages,
  private-file exclusion, path rejection and refusal to overwrite existing output.

Browser tests use fresh isolated profiles, synthetic UIDs/shops/cars, stubbed
identity/provider responses and blocked external DNS. They do not send real
messages, create bookings, submit/approve applications, delete accounts or reset
user data. Screenshots and detailed logs stay under private `.qa/`.

## Speed measurements

Laboratory Chrome, viewport 393×852, fresh context per target, service worker
blocked, local gzip server with **60 ms added per asset request**, no bandwidth
throttle. CPU 1x and 4x. “First” is actual destination activation; “usable” also
waits for that page's primary real control. Warm visits use the same context.
These are not field Core Web Vitals or physical Android measurements.

Final paired run, CPU 1x:

| Page | First activation | Primary control visible | Warm revisit |
| --- | ---: | ---: | ---: |
| Garage | 498 ms | 548 ms | 26 ms |
| Profile | 355 ms | 393 ms | 19 ms |
| Shop | 596 ms | 632 ms | 22 ms |
| Magazine | 281 ms | 303 ms | 14 ms |
| Chat | 626 ms | 669 ms | 25 ms |

CPU 4x, consecutive before/after runs, primary control visible:

| Page | Before | After |
| --- | ---: | ---: |
| Garage | 3,420 ms | 2,792 ms |
| Profile | 1,392 ms | 1,335 ms |
| Shop | 1,724 ms | 2,087 ms |
| Magazine | 960 ms | 847 ms |
| Chat | 2,343 ms | 1,863 ms |

Do not claim a uniform improvement: Shop regressed in that paired run and 4x
results varied materially across repetitions (the separate final run had Shop
at 1,692 ms). CPU scheduling/background activity and substantial legacy startup
work still affect cold entry. Initial Home startup was 1.5–1.7 seconds at 1x and
2.2–3.0 seconds at 4x. A separate 1.5 Mbps/80 ms/4x fixture was slower still.
The universal sub-second target is therefore **not achieved**. Warm retained
navigation is fast, but hiding cold work behind a new placeholder is not a fix.

Runtime packaging moves about 4.53 MB of inline code out of six HTML documents:
combined HTML 6.74 MB to 2.22 MB uncompressed, with 42 content-addressed JS assets
and 11 order-preserving head bundles. These are packaging sizes, **not** a claim
of equivalent first-load network savings; code still has to load on a cold cache.

## Remaining work before calling the entire app sub-second

- Reduce each legacy page's cold initialization/tool code and request dependency
  waves, with per-tool lifecycle tests. Do not indiscriminately defer handlers or
  auth/account-scope gates; that risks blank panels, lost jobs or cross-account data.
- Investigate and repeat Shop cold-entry measurements on a quiet physical device.
- Measure real Android cold start, service-worker update/reopen, slow mobile
  networks, typing, keyboard/safe-area layouts and permission dialogues.
- Real Google/Apple/OTP delivery, LINE delivery, push permissions, GPS accuracy,
  camera/microphone hardware, screen-off/background calls, AI diagnostic accuracy,
  paid Maps/marketplace integrations and real moderation/transactions were **not**
  proven by synthetic fixtures. No paid services were enabled for these tests.
- Accessibility snapshots are not a full WCAG audit; no field INP/CLS percentile
  or Lighthouse score is asserted in this report.

## Reproduction

Run from the frontend checkout with the existing Node installation:

```text
node --test test/*.test.mjs
node tools/app-inventory.mjs
node tools/check-app-sources.mjs
node tools/test-browser-suite.mjs
node tools/build-public.mjs
node test/app-performance.mjs .pages-output local-comparison
```

Set `CENDON_NODE_PACKAGES` to the installed Playwright `node_modules` directory
before browser tests; no package upgrade is required. The source checker expects
private `.qa/` to exist. For generated-build route coverage, set
`CENDON_QA_DIST=.pages-output` and run `test/app-surface-browser.mjs` with
`--import ./test/local-browser-safety.mjs`. Benchmark one build at a time on an
otherwise quiet machine; compare repeated runs rather than cherry-picking.

Release checks: before/after read-only mechanic-data hashes, unchanged deployed
D1 binding, no `DEV_AUTH`, paid routing disabled, production asset/document hash
comparison and synthetic live-browser smoke checks. Guard mismatches must be
inspected, never automatically restored. A live edit/GPS update is not data loss.
