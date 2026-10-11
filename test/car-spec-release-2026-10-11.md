# Document-backed car specifications — 2026-10-11

The app layout, authentication, one-time onboarding and navigation first paint are retained. This release changes specification provenance and optional vehicle context, not car ownership or existing account data.

## Data path

- Public library keys: normalized make, model, model year and market (legacy Thai keys unchanged). VIN, plate, nickname and other private car data never enter the public library or Gemini specification requests.
- Default backend mode: free public Wikimedia discovery plus public WordPress search APIs on allowlisted local publishers, followed by reading actual documents and two Gemini JSON extraction passes **without Google Search tools**. No billing or new service credentials are enabled.
- Actual readable documents count; the UI distinguishes documents from independent websites. Five distinct sites are a target, not a guarantee. Blocked, oversized, PDF, wrong-year-title and inaccessible links are not counted as readable specification sources. Bot rules and explicit ai-input/ai-train content signals are respected.
- Extracted values need a real exact quotation and applicable year/market context. Variant values need a nearby name/engine anchor. Unconfirmed numbers stay empty. HP is not silently substituted for PS or kW.
- Public results retain links/source IDs, not document paragraphs. The UI links individual sourced fields to those documents. AI agreement is not manufacturer certification or independent two-source verification.
- One atomic lookup claim per shared key prevents parallel first requests from duplicating work. Cached successful results are reused. Old source-free numeric defaults and arbitrary first-trim selection are not used.
- Research has a 28-second total budget, including document discovery, response bodies, fallback models and JSON handling. Discovery has a 12-second budget and can preserve completed documents when other pages stall. Background work fits the normal Worker waitUntil lifetime. Daily non-refundable attempt caps remain even when provider failures refund successful-lookup allowance.

## Vehicle details

Additional optional model year, market, engine code and drivetrain complement the existing VIN, trim and owner-entered fields. VIN format checks are not vehicle identity/ownership verification. NHTSA decoding occurs only after the user explicitly presses Check and sees the disclosure; Thai VIN coverage is partial.

DB11 resolves to sports car/coupe and Pajero Sport to SUV from exact catalog identity, before old saved generic sedan labels. Unknown vehicles are not defaulted to sedan. Battery/wiper/oil/consumption defaults based only on body type are removed. Generic service reminders remain labelled as general reminders, not factory schedules.

## Limits

This is not a 100%-accurate global car database. Regional brochures, market-specific revisions, exact trims, blocked publishers and PDF-only sources can still leave fields unconfirmed. Manual/dealer verification remains necessary before buying parts or relying on critical maintenance specifications. An unavailable Gemini project can still prevent extraction; the UI reports the actual provider or document failure instead of asking for repeated refreshes.

## Verification

Automated tests cover shared cache/races, quota states, finite deadlines, unknown/body classification, explicit variant choice, private-data exclusion, exact-quote validation, year/market mismatch, SSRF/redirects, robots restrictions, source attribution, no-grounding free mode and existing app regression tests. Network and deployed API checks must be recorded separately from mocked tests; mock preview screenshots are not evidence of successful production AI.

Initial production check: Gemini returned HTTP 200 in the no-Search mode (429 was no longer present in that check). Pajero Sport 2020 extraction initially remained unconfirmed because the initial references were older. Direct publisher discovery was added after that check, finding model-specific Thai articles published in 2020. This does not automatically certify their values or all trims.

Final production check: after correcting generation selection (archive URL digits are not model years), Pajero Sport 2020 returned `ready`, `review=document_extraction`. Three documents from two sites were read; one site/document supplied accepted engine evidence. Unsupported dimensions and fitment stayed null. Single discovered engines now also require explicit user selection; incomplete discovery is not proof that all trims share one engine.
