# MKB Growth voice-engine integration — pilot

This folder is the **first, read-only integration** between the independent MKB Growth AI Toolkit and the LobbyStack voice runtime. The upstream MIT license remains unchanged.

## System separation

- **MKB Growth website:** sells the CRM and AI Receptionist packages; customer billing/consent.
- **MKB Growth AI Toolkit (Base44):** internal customer workspaces, module entitlements, onboarding manifests and operating dashboard. The admin-only `lobby-stack` function is deployed in the Toolkit.
- **This LobbyStack fork:** voice calls, agent rules, knowledge, service/availability checks, transfers, call history and appointments.
- **DGACC:** only internal support/sales, connected later via scoped APIs, never a shared customer database.

The Toolkit's `Workspace.id` is mapped to one LobbyStack business ID. Do not copy or promote untrusted `workspace_id` or `business_id` from client requests into access decisions. The backend must resolve the authenticated user's organization membership and verify the mapping for every customer action.

## Read-only smoke test

Set on a trusted development terminal or deployment secret store:

- `LOBBYSTACK_BASE_URL` = public HTTPS base URL of **our** hosted runtime (not `app.lobbystack.com`).
- `LOBBYSTACK_PLATFORM_KEY` = generated platform key with the **minimum required scopes**.

Run:

```bash
node integrations/mkbgrowth/check-runtime.mjs
node --test integrations/mkbgrowth/check-runtime.test.mjs
```

The script only sends `GET /api/v1/me`. It never purchases numbers, creates businesses, or produces call traffic. It emits connection metadata without logging the secret.

## Deployment order

1. Run the forked LobbyStack stack on a dedicated host using its maintained Docker Compose or Railway guide. Never deploy the entire monorepo inside Base44.
2. Configure PostgreSQL with RLS, Redis, persistent storage, TLS, SMTP and backups. Ensure billing/overages do not accidentally run against production accounts while testing.
3. Set OpenAI project API key and signed webhook. A browser-call smoke test can precede SIP numbering.
4. Create dedicated **Twilio Elastic SIP** trunk and NL testing number, wire it to the OpenAI project, set webhook signing key and transfer fallback. Test costs and legal number availability first.
5. Create a narrowly scoped platform key for the MKB Growth Toolkit. Set its URL/key as **Base44 server secrets** `LOBBYSTACK_BASE_URL` and `LOBBYSTACK_PLATFORM_KEY`, not browser variables.
6. From Toolkit **Integraties**, run **Test verbinding**. Verify no secret is returned.
7. Generate a per-business manifest. Only add automatic provisioning after server-side auth, verified billing intent, idempotency keys, outbox retries, audit records and explicit operator approval.
8. Connect one calendar and test a Dutch conversation, a booking, an unavailable slot, a caller interrupt and human escalation. Keep recording disabled until disclosures/retention and GDPR data processing are reviewed.

## Pilot acceptance criteria

- [ ] Hosted LobbyStack health checks and secure recovery/backup procedure pass.
- [ ] Read-only API gateway returns authorized scopes without exposing secrets.
- [ ] Tenant A cannot access Tenant B through API, webhooks, media URLs or database.
- [ ] Voice answers reliably in Dutch, includes a clear AI disclosure and does not claim unverified appointment availability.
- [ ] One booked appointment appears once in authoritative calendar and CRM; retries don't duplicate.
- [ ] Failed call or quota exhaustion fails over to human number or defined safe behavior.
- [ ] Provider usage and billing controls are visible per business; no unintended expenses.
- [ ] Signed webhooks are validated, deduplicated and monitored.

## References

- [LobbyStack self-hosting](https://docs.lobbystack.com/self-hosting/overview)
- [Partner API keys](https://docs.lobbystack.com/white-label/api-keys)
- [OpenAI SIP incoming calls](https://developers.openai.com/api/docs/guides/voice-sip)

Do not commit any live credentials or customer records to GitHub.
