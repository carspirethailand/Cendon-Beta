# Customer Console, 18 October 2026

- `/console` is an unlisted, noindex static customer tool catalogue: 38 entries in 5 searchable categories, immediate HTML links without a JavaScript loading gate.
- No navigation link is added to existing app menus. Unlisted is not an access-control mechanism. Private tools retain the existing account, vehicle, feature and backend authorization checks.
- No account records, tokens, images, audio, location, provider keys, analytics or arbitrary command execution exist in the catalogue.
- A self-only Content Security Policy with `connect-src 'none'` prevents host-injected third-party analytics from executing in the Console. Other app pages are unchanged.
- A narrow, allowlisted handoff captures intent before chat strips query parameters. It waits for canonical account completion and a selected car. A pending handoff cancels on identity change; it never forces a locked feature.
- Five existing real tool modules open inline in chat. Ten Garage tabs open the current account's current car. No car ID or user ID is accepted from the Console query.
- Call/scanner launch instructions require a separate explicit Start call button. The user then enables the camera and starts scanning in the existing call. Nothing captures media, sends a model request, posts a job or messages a mechanic automatically.
- Fonts and original chat wordmark are self-hosted with the Kanit OFL license. Search is local, text-only and not persisted.
- Shared hidden-scrollbar styling, reduced motion, focus states, 320/390/1280px layout checks and a service-worker cache revision are included.

## Verification

- `node --test` across all `test/*.test.mjs`: 452 passing tests at preparation time.
- `node test/console-browser.mjs`: real Edge browser checks catalogue/search/keyboard/overflow, auth/car wait, feature gate, identity switch, explicit-call initiation and the five real ledger/feature modules in isolated synthetic-account fixtures.
- No real AI/vision accuracy, physical sensor/microphone/camera session, LINE account changes, real mechanic messages or production data writes are claimed by these tests.
- Backend is unchanged. Existing provider availability, quotas and device permissions still apply.

## LINE slot B

Use URI action: `https://cendon-beta.pages.dev/console?openExternalBrowser=1`.
Keep the current four-region image/bounds. This release does not update the LINE rich-menu account itself.
