# Passwordless account flow: release checklist

The implementation offers Google, Apple and six-digit Email OTP. It replaces the five copies of the old setup wizard with shared paper-style account UI and a server-owned first-use completion record. This branch is not a claim that the external providers are configured.

## Before production

1. Supply the approved privacy-policy URL. `account.js` currently points to `/privacy`, but no policy file exists in this checkout. Do not collect acceptance against a missing or unapproved policy. The existing terms remain unchanged.
2. Configure Email sending and Firebase custom authentication on the Worker. Never paste private keys or API tokens in chat or commit them.
3. Confirm Apple is enabled for the existing Firebase project and that its Apple Developer service configuration and return URL are valid.
4. Verify Google sign-in, Apple sign-in, and actual email delivery on the production domain with an explicitly chosen test recipient.
5. Deploy the backend before the frontend, preserving existing Cloudflare variables and secrets. The backend creates schema 21 through its existing automatic schema mechanism; the onboarding rollout snapshot executes transactionally before account state writes.

## Worker configuration

| Name | Type | Purpose |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | Existing variable | Existing Firebase project; do not change account identity/project. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Secret | Project-matching Firebase service account with RSA key, kept on the server. |
| `AUTH_OTP_PEPPER` | Secret | At least 32 random bytes of entropy, generated privately. |
| `AUTH_EMAIL_FROM` | Variable | Actual verified sender email address. |
| `RESEND_API_KEY` | Secret | Resend sending credential, if using Resend. |
| `EMAIL` | Optional binding | Cloudflare transactional Email Sending; alternative to Resend, not required with Resend. |

The service account needs only the Firebase identity permissions required to look up, create and update users. Do not reuse an unrelated project key. Sender-domain verification must be completed with the chosen email provider. `GET /api/auth/config` returns readiness only and never exposes secrets. Missing configuration fails closed with HTTP 503; no demo code or simulated delivery exists in the production modules.

Existing Firebase email accounts retain their UID after verified OTP, preserving server data. Existing unverified email accounts fail closed and require recovery through their original trusted provider; they are not silently taken over or reset. Apple private relay addresses are never guessed or automatically linked to another email address.

## First use and migration

New first-use setup is: agreement acknowledgement, nickname, Gregorian birthday, language, distance unit, currency, completion, then an optional spotlight tour. The current distance UI uses km / mi, preserving the app's metric / imperial behavior; the user's `m` wording still needs confirmation before changing distance semantics.

Completion is stored in `user_onboarding`, scoped to the verified UID. Browser flags and generic state uploads cannot create completion. Eligible previously completed server setups are grandfathered once at rollout without fabricating new consent or birthday data. An unowned browser-only legacy flag is not proof that a different account completed setup.

Birthday stays in the private canonical profile and is excluded from generic setup/AI projections and the completed local status cache. Changes to nickname, language, distance and currency use the authenticated preferences endpoint. Consent, birthday and completion cannot be overwritten by a stale preference snapshot. Resetting an account explicitly restarts setup; normal login does not.

## Local UI verification

`node test/account-preview.mjs` serves a clearly labelled local mock on `http://127.0.0.1:4176/login`. It does not send email, create Firebase accounts or accept real agreements. Account data exists only in in-memory SQLite. The mock uses actual onboarding validation and actual account/tutorial UI. It is a test harness, not a production fallback.

## Primary references

- [Firebase custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Apple provider setup in Firebase](https://firebase.google.com/docs/auth/web/apple)
- [Cloudflare transactional Email Sending](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email)
