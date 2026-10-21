# Direct, immediate mechanic-application entry

- Apply-labelled cards always target `/join`, not `/studio`, including stale
  settings markup and cached trial-shop records. A cached `shop` status alone
  does not establish a registered, verified real shop.
- The Home account menu now uses the same real-shop predicate for its label and
  its click handler. Previously a staff trial shop could produce an Apply label
  but enter Studio when clicked.
- Shared public entry paints on the source page before cross-page navigation.
  The real `/join` introduction paints before account/policy requests complete.
  The preview is not a hidden iframe, an application, or an authorization check.
- The selected identity provider and document details are shown only after the
  current backend policy arrives. No document or application is auto-submitted.
- Closed entries and different accounts remain protected from late responses.
  Existing real-shop result/reveal and explicit Studio navigation are preserved.
- Updated settings assets and service-worker cache version.

Validation: 567 frontend tests; real Chrome with a mobile 390 × 844 viewport.
Profile/Settings, Garage, Chat, News and Shop each painted the entry before a
1,200ms simulated destination delay, followed by 1,200ms simulated status/policy
delays. All five stayed out of Studio, with no application submission or page
errors. Additional tests cover stale/foreign-account cache, staff trial records,
unverified records and the matching menu-label/click conditions.

The browser tests use public local fixtures and synthetic accounts, not real
applications. They are not production-phone Core Web Vitals measurements.
