# Studio inventory repair and persistence

The reported production shop still has two active services, both linked to its stable shop ID. The backend's owner list accidentally applied the public suspension filter; its quota correctly counted the records. This release does not delete or recreate them, change ownership, or lift the shop's trial/suspension status.

Owner inventory now comes from the authenticated private endpoint, separately from the public feed. The private snapshot is in memory only, scoped to UID and shop ID, and cannot be repopulated by a late response after account switching. Invalid/error responses show Retry rather than "no services". New-service preflight uses the server quota; existing services remain editable. A concurrent full-quota response is 409, keeps form inputs and does not show the incomplete-form popup.

Private shop-image previews fetch only known owner photo IDs with a bearer header. There are no URL tokens or persistent image caches. Object URLs are revoked on account changes. Images load when visible; unrelated style/audio animation mutations do not trigger image scans. The backend excludes ID/selfie/certificate kinds from this route. Public directory filters remain unchanged.

The browser fixture uses actual inventory, cards, form, API helper and image module with local synthetic data only. It checks two hidden services, photos, edit preservation, reload, quota preflight, draft preservation, offline errors and account separation. Backend tests also repeat cold initialization and preserve existing application/profile/photo/service rows.

Repository AGENTS.md adds release rules for future work. Backend release-guard capture/check compares read-only data fingerprints before/after publication and records a Time Travel bookmark; it is not a raw backup or an automatic restore. These safeguards reduce regressions, not a promise that explicitly deleted data or every future defect can be prevented forever.
