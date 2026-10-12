# Optional vehicle details are not a lookup prerequisite

Required lookup inputs are make, model, and the main vehicle year only. No VIN, trim, engine code, market or extra model-year field is needed to retrieve reference specifications.

- No market supplied: use the general/reference library (`...|global`), not an implicit Thai-market-only gate. Explicit Thai requests keep the legacy three-part key, separately from reference results.
- Explicit regional refinement that cannot return a usable record can fall back to reference data. The UI labels that fallback; it does not silently rewrite the car's saved market, select a trim, or use a reference consumption value for personal mileage estimates.
- View all discovered powertrains without filling a form or selecting a variant. Selecting a matching variant remains optional and is required only to apply variant-specific estimates to the personal vehicle.
- Remove the error-state "Check model year & market" action. Failed document retrieval is a system/source issue, not evidence that optional inputs are required.
- Normalize valid evidence representations (lists, single proof objects, nested maps) before verifying exact quotations, source IDs, years, numerical bounds and units. Missing/false/fabricated IDs are not source zero. Wikipedia measurement templates are made readable without calculating new numbers or collapsing ranges.
- Sourced body/generation information can be a usable partial record even when numerical fields are absent. Unconfirmed numbers remain blank; no body-type defaults or AI-memory values are added.
- Auth confirmation, fail-closed bearer handling, daily attempt caps, successful-library reuse, and refunds for failed new searches are retained. No credential, billing, account/onboarding or technician-screening changes are part of this release.

A reference record is not a guarantee of the owner's exact local-market equipment or trim. The app must label that distinction without making extra inputs mandatory. Five independent sites remain a retrieval target, not a claim that one document or two extraction passes satisfy it.
