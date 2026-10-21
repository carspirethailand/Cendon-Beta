# Interaction stability fixes — 2026-10-21

Scope: mechanic application / LINE entry, account sync, Garage input validation,
Chat navigation, inline call results and Valet message preparation.

- Open the partner/LINE screen before waiting for auth/status requests. Reuse
  in-flight status/policy requests; ignore responses for a different account or
  a sheet the user has already closed.
- Preserve the Didit callback before changing the sheet URL. Bind the submit
  button before awaiting policy. Check the displayed consent version and actual
  optional checkbox, prevent duplicate clicks, and do not encourage resubmission
  if the application succeeded but status refresh was unavailable.
- A pending Home tour no longer redirects an already signed-in Chat/Garage page
  through Home. An offline uncached page never returns Home HTML at a Chat URL.
- Place call result/Valet cards outside the rotating search-card face. No reverse
  transform is applied to text, controls or hit targets.
- Cloud sync waits 400ms to batch edits and marks only acknowledged snapshots as
  synced. Rejected records and newer in-flight edits remain unsynced.
- Garage money uses finite limits and at most two decimal places, including
  receipt imports. Missing validators do not silently accept input. Custom
  titles keep length/obvious-junk checks; this is not a semantic truth detector.
- Use an exact model/year price reference where one is available. Otherwise the
  category/job ceiling is explicitly a preliminary guard, not a claim to know
  every vehicle's current resale value. Do not silently clamp a money amount.
- Valet recognizes more explicit Thai message requests and prepares a recipient
  and editable message card. Sending still requires the user to confirm; the
  mechanic endpoint still authorizes the signed-in account.
- Version paired scripts and the service-worker cache to avoid stale helpers.

Validation:

- Frontend: all 562 Node tests passed.
- Backend: all 500 Node tests passed (paired backend commit).
- Real headless Chrome, mobile viewport 390 × 844: first-click submission,
  duplicate-click protection, optional AI consent true/false, changed consent
  version, account-switch cancellation, shared delayed LINE status request,
  readable unflipped call results, and reviewed Valet message submission passed.
- Browser tests used only synthetic accounts/endpoints. No real application,
  identity document, LINE link or message to a mechanic was submitted.
- Existing Windows-CRLF-sensitive source tests were normalized; the previous
  offline-Home expectation was updated to the corrected route-safe behavior.

These checks are not production-device performance measurements or an evaluation
of model diagnostic accuracy. No model was trained by this bug-fix batch.
