# Cloud-authoritative mechanic account recovery

Fixes the membership regression introduced in bc2d489. That release treated
the absence of a new local `registered` flag as "not registered" and excluded
trial shops that the server already permits their owners to manage. Its tests
encoded that mistaken business expectation; those expectations are now corrected.

## Source of truth

- The authenticated Cloudflare `GET /api/tech/me` response is authoritative for
  the current Firebase UID. No database migration or backend deployment is needed.
- Every shared Settings entry restores status from this endpoint on sign-in/page
  load, Settings open, and foreground/online resume. Concurrent readers share a
  request. Recent successful reads can be reused for 30 seconds; resumes are
  bounded to one attempt per 5 seconds, and foreground status refreshes each minute.
- `spire_partner` is only an account-scoped paint hint. Legacy/trial `shop` hints
  remain valid hints even without `registered`. Cached `none`/`withdrawn`, missing
  cache, and an empty/new browser are unknown until Cloudflare confirms the state.
- Existing server technician profiles open Studio, including approved test shops.
  Public visibility, verification, suspension and backend authorization do not change.
- Existing applications show their status instead of starting a second application.

## Failure and privacy behavior

- `/join` enables a new application only after a successful fresh status check.
  Offline, timed-out, denied and malformed responses show Retry and explicitly
  tell the user not to reapply. Failed requests never overwrite a shop hint with none.
- Requests use the live Firebase token in an Authorization header, `no-store`,
  a 12-second whole-request deadline (including token retrieval), and abort signals.
- Both the request identity and response UID are checked. An old account's late
  response cannot display or overwrite the new account's status. Sign-out clears
  in-memory state; the existing account-scope code continues to isolate local data.
- Only UID, status, result-reveal hint and cache timestamp are stored locally.
  Shop content, applications, documents and tokens are not persisted by this module.
- This repair does not submit applications, recreate shops, approve technicians,
  delete data, edit user rows or touch the production database.

## Validation

- 579 frontend Node tests, including fresh/empty/legacy/negative/foreign-account
  caches, trial shops, application statuses, malformed/denied/offline responses,
  token timeouts, concurrent readers, account changes, sign-out and online resume.
- Real Chrome, mobile 390 × 844, actual shared Settings/status code and actual
  `/join`/introduction functions: 12 local synthetic scenarios, five source pages,
  recovery without Apply flashes, existing shops/applications, offline retries,
  mid-request identity change and a confirmed new applicant. No application writes.
- Separate instant-entry Chrome regression: five source pages with 1,200ms page
  and status delays, with five immediate introduction paints and no Studio detour.
- Tests use synthetic users/local read-only endpoints. No production account
  documents or private applications are used, and no real-account approval is tested.

Assets: Settings v5, shared partner-state v1, home translations v11, SW v340.
