# Studio, language and quote regression fixes

- Desktop Studio keeps its navigation rail clickable through any shared sheet depth. Only the sheet panel and its real backdrop consume pointer events. Selecting the current rail tab dismisses nested sheets too.
- UI text uses a consolidated dictionary of existing authored Thai/English pairs and the existing ten additional language packs. Shared components use the same translator. Names, descriptions, Chat content, editable fields and input values are excluded from DOM translation. Missing localized UI phrases fall back to authored English, never an online translation service.
- Chat, feature analysis and Live calls send the selected language. Server-owned language policy prefers explicit language requests/the latest substantive user turn over older messages; vehicle brands and filenames are not language signals. Changing the saved language during a call adds a non-completing context update rather than reconnecting the call.
- Distances use the current account's preferences, including during account setup hydration and document-level auth readiness. Canonical distances remain kilometres.
- Quote/extra-work fields explicitly use Thai baht (THB), matching the existing backend contract. A display currency does not silently reinterpret typed amounts. The form explains this boundary; displayed estimates remain separate.
- Cancellation notifications use `cancelledBy` from the server, not the viewer's role. An account owning both job sides sends its selected operating side. Missing/unknown old attribution stays neutral rather than guessing. Historical records and existing notification text are not rewritten.

Browser fixtures: `studio-feedback-browser.mjs`, `ui-language-browser.mjs`, plus the existing Studio/account-restoration, preferences, Valet, background-chat and mileage fixtures. No real customer/technician messages or account writes are used by these tests.
