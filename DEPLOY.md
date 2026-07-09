# SpireONE — Deployment & Security Setup

## 1. Backend (Cloudflare Worker) — do this FIRST

```bash
cd SpireONE-backend

# a) Apply the new admin-system database tables
wrangler d1 migrations apply spireone --remote

# b) Store the API key as a SECRET (never in code — this repo is PUBLIC)
wrangler secret put GEMINI_KEY
#   → paste your Gemini key when prompted (the only AI key the system needs now)

# c) Deploy
wrangler deploy
```

### Environment variables (in `wrangler.jsonc` → `vars`)
| Key | Meaning | Default |
|-----|---------|---------|
| `OWNERS` | Comma-separated owner emails (highest role, cannot be demoted) | the 2 accounts |
| `AI_DAILY_LIMIT` | AI messages/user/day (admins & owners exempt) | `60` |
| `ALLOWED_ORIGINS` | CORS allow-list. **Set to your real domain** once live, e.g. `https://spireone.pages.dev` | `*` |
| `GEMINI_MODEL` | Chat/diagnose model | `gemini-3.5-flash` |
| `GEMINI_LIVE_MODEL` | Realtime voice/video call model (`/api/ai/live-token`) — change this var if Google renames the id | `gemini-live-2.5-flash-native-audio` |
| `AI_ANON_DAILY_LIMIT` | /api/diagnose quota per IP for anonymous callers | `15` |

> `GEMINI_KEY` is a **secret**, not a var — set it with `wrangler secret put`, never commit it.

## 2. Frontend — push all three together
`index.html`, `chat.html`, `admin.html` → the frontend repo. They link by relative URL and share auth/session.

## 3. Roles
`owner > admin > moderator > user`
- **Owner** (the 2 emails in `OWNERS`): full control, only owner can grant/revoke **admin**.
- **Admin**: manages moderators/users, magazine, site config, audit log.
- **Moderator**: overview stats + magazine management.
- **User**: normal app access.

Give a role: sign in to **admin.html** → *ผู้ใช้ & ยศ* → pick from the dropdown on their row.

## Security summary (what protects your data)
1. **No secrets in the browser** — Gemini key lives only in the Worker. Inspecting the page reveals nothing sensitive.
2. **Every privileged API verifies the Firebase ID token server-side** — you can't call another user's data by editing JS.
3. **Role checks run on the backend**, not just the UI — forging a request still gets rejected.
4. **AI is login-gated + quota-limited** — no anonymous abuse of your Gemini bill.
5. **Banned users are rejected everywhere**; maintenance mode locks out non-staff.
6. **Audit log** records every admin action (who / what / when).

## Note on "hiding" HTML
Static HTML/JS is always visible via inspect — this is true of every website. Security here comes from the backend enforcing auth + roles, **not** from hiding code. That is the correct, industry-standard model.
