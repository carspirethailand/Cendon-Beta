# Cendon account and Studio data safety

- Cloudflare's authenticated own-account endpoints are authoritative. Local storage and the public shop/service directories must never decide whether a user has an existing shop or services.
- Public visibility, trial status, suspension and membership are different states. Restore the owner's management view without automatically publishing, unsuspending, approving or moving ownership.
- Treat errors and incomplete responses as unknown/retryable, never as an empty account. Keep successful owner inventory separate from the public feed and scoped to the live UID and stable shop ID. Discard stale responses when accounts change.
- Do not put authentication tokens in image URLs. Hidden shop previews use authenticated, no-store owner requests; national-ID, selfie and certificate images must never use shop-image routes or local storage.
- Preserve typed forms when saving fails. A full service quota is an inventory conflict, not an incomplete-form error. Offer editing of existing services instead of deleting them or bypassing the quota.
- Before release, run the existing frontend suite and relevant real-browser fixtures, including `test/studio-services-browser.mjs` and account-restoration fixtures. Bump affected asset/cache versions. Publish only committed public assets; exclude Backyard, local test artifacts, credentials and research snapshots.
- Coordinate production releases with the backend mechanic-data release guard documented in its repository. Do not claim that fixture tests prove real-user sign-in or that software can guarantee zero data loss forever.
