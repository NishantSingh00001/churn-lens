# Security review — 20-point pen-test checklist (2026-11-19)

ChurnLens is a fully static, client-only churn-risk demo — no backend, no
accounts, no database, and no network calls at all (confirmed: no `fetch(`
anywhere outside the bundled `three.min.js` library). All 40 customer
accounts are synthetic data scored in-browser by a real logistic model
(`churnProb`) over six weighted features; the simulator re-scores the whole
book live by adjusting those features. Reviewed `app.js` and `core.js` in
full.

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | HTTP/2 Rapid Reset | N/A | Static site, no backend server, no network calls of any kind. |
| 2 | bcrypt 72-byte limit | N/A | No passwords/accounts. |
| 3 | SAML signature bypass | N/A | No SAML. |
| 4 | nOAuth | N/A | No OAuth. |
| 5 | GraphQL alias batching | N/A | No GraphQL. |
| 6 | TOTP replay | N/A | No TOTP/2FA. |
| 7 | ReDoS | No | The only regex is `esc()`'s `/[&<>]/g` — simple, bounded. |
| 8 | JWT algorithm confusion | N/A | No JWTs. |
| 9 | HTTP request smuggling | N/A | No backend, no network calls at all. |
| 10 | Web cache poisoning | N/A | No backend responses. |
| 11 | Spoofed X-Forwarded-For | N/A | No server-side code, no IP-based logic. |
| 12 | Postgres views bypassing RLS | N/A | No database — the customer book is a hardcoded in-memory JS array. |
| 13 | `Math.random()` for security tokens | N/A | No tokens/ids — no auth, no session. |
| 14 | Timing attacks on secret comparison | N/A | No secret comparison. |
| 15 | Padding oracle | N/A | No encryption. |
| 16 | Server-side prototype pollution | N/A | No backend at all. |
| 17 | Server-side template injection | N/A | No server-side templating. The only free-text input (the Customers search box) filters the app's own fixed account list, and rendered customer/segment names go through `esc()` before insertion into `innerHTML`. |
| 18 | XXE | N/A | No XML parsing. |
| 19 | Cross-site WebSocket hijacking | N/A | No WebSocket endpoint. |
| 20 | Unicode username normalization | N/A | No usernames/login. |

## Summary

No findings. Same pattern as `drift-watch` and `lineage-iq` elsewhere in
this portfolio: a fully static, fully offline demo with no network calls
and no path for untrusted input to reach rendered HTML unescaped.
