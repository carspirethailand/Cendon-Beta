# Account and settings feedback — 2026-10-22

## Mechanic membership is not public visibility

Cloudflare's authenticated `/api/tech/me` remains authoritative for the current Firebase UID. Local storage is only a minimal, UID-scoped paint hint. Missing/stale local storage, a failed request, or a malformed response must not be treated as a fresh application. Trial or suspended shops remain existing shops and keep the Studio link. Public visibility and suspension are separate moderation decisions; this release does not lift suspensions, verify trial shops, or move ownership.

The shared state now exposes the server's suspension/trial flags in memory. Home and Settings explain a suspended shop instead of inviting it to register again. Regression coverage includes clearing the cache, a new browser context, account switches during requests, offline status, existing applications, and suspended trial shops. No production applications or account records were modified in testing.

## Other feedback included

- Saved language changes are committed before repaint and then remount the current page. An active call is not reloaded; some captured-language screens finish updating after the call. This is not a claim that every pre-existing phrase in every language has been translated.
- Read-only, commonly formatted distances and prices follow the signed-in account's saved preferences. Stored Garage values remain kilometres and THB. Explicitly labelled form inputs, public passports, chat text and identity headings are not reinterpreted.
- Foreign-currency amounts are approximate reference conversions, not payment quotes. The browser asks only the Cendon backend for public rates; it sends no user amounts or credentials. If a usable rate is unavailable, the original THB remains visible. Ambiguous number formats are left unchanged rather than partially converted.
- Car Passport's expense-sharing label and switch no longer compete for the same grid column. This does not change whether an owner has consented to share expenses.
- Numeric email OTP signup uses the existing backend only when it reports ready. Otherwise password signup clearly describes the Firebase verification link; delivery failures are not silently presented as success.

## External blockers and deliberate limits

Production `/api/auth/config` reported `emailOtpReady:false` on 2026-10-22. Secure mail-sending configuration, OTP pepper and Firebase service-account configuration are absent. No real numeric OTP delivery is claimed, no fake code is introduced, and no credentials should be posted in chat.

Read-only production inspection confirmed that the reported shop record and its application still exist. That record is a suspended trial shop, so it remains intentionally absent from the public directory. Re-enabling it or making it a verified customer-facing shop requires an explicit moderation decision; a UI release must not do that automatically.

## Validation

- Frontend Node suite: 587 passing tests, zero failures.
- Backend Node suite: 503 passing tests, zero failures, including the membership regression.
- Real Chrome fixtures: presentation conversion/reversal, unchanged canonical input and chat, no observer loop, and Passport layouts at 320/390/1280 px.
- Membership/entry fixtures use synthetic UIDs and local GET-only endpoints; they are not proof that a real user completed sign-in or that numeric OTP was delivered.

Publishing must use committed public assets only. Do not upload `.qa`, private Backyard files, local credentials or research/test fixtures as static assets. Deploy the rates backend before the frontend adapter; preserve existing Worker variables and secrets.
