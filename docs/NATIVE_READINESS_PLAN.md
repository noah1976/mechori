# Native readiness plan

- Status: detailed planning only. No Expo/React Native project, Apple/Google configuration, OAuth change, Native dependency, or external service setting has been created.
- Start condition: Web and Native can safely read and write the same Vehicle Experience data contract. “Web is complete” is not the criterion.

## Dependency order

```text
Home IA human QA
      │
Experience / Entry contract ── Media normalization ── Data normalization
      │                              │                       │
      └──────── Rights / projection / Public Share ──────────┤
                                                              ↓
Production identity ── Multi-identity Auth ── Offline / Sync contract
                                                              ↓
                  Web ↔ Native shared-data vertical slice
                                                              ↓
                 Native sharing, stronger offline, Drive, Voice
```

Drive, audio, background location, CarPlay, and Android Auto are downstream product hypotheses, not shortcuts around these gates.

## Gates, definition of done, and human QA

| Gate | Current state | Definition of done | Human QA |
| --- | --- | --- | --- |
| Home IA | PARTIAL / Human QA | Following-feed home, capture entry, Garage continuity, and navigation roles are stable enough that Native is not built against an experiment in flux. | iPhone Safari: first understanding, capture, post-save destination, four-tab navigation, safe area, 320–430px. |
| Experience continuation | NOT READY | Durable Experience and append-only Entry IDs; explicit continuation choice; occurrence vs append order; author/actor/provenance; revision; result/recurrence; Maintenance relation; no inferred links. | Create/follow up/correct/recur on the same vehicle and distinguish a maintenance link from continuation. |
| Media normalization | NOT READY | Private normalized asset + ordered Entry attachment + audience variants; retry/idempotency/delete/orphan contract; resource controls; legacy read path. | Multi-photo queue/remove/reorder/retry, interruption/reload, another device, owner/public boundary. |
| Data normalization | NOT READY | Required Vehicle/Experience/Entry/media writes no longer depend on one mutable workspace JSON document; paged/read projections and idempotent writes have defined failure behavior. | Slow network, concurrent device writes, retry after timeout, old data compatibility. |
| Rights / Public Share | NOT READY | Owner-private, member, anonymous public, transfer-safe candidate, revoke/unpublish, provenance, and audit boundaries are independently enforceable. | Private fields/media never appear in public preview/URL/OGP; revoke works before cleanup. |
| `mechori.com` identity | MANUAL | Approved production domain, HTTPS, canonical-origin policy, redirect/cookie rules, monitoring/rollback ownership. | Direct canonical URL and auth return path from mobile/desktop. |
| Multi-identity Auth | NOT READY | MECHORI User separated from Google/Apple/etc. identity; explicit link/unlink; no email-equality merge; recovery and last-login-method protection. | Existing user signs in through linked methods and cannot accidentally create/merge accounts. |
| Offline / Sync | NOT READY | Durable local operation log, idempotency keys, conflict/display policy, attachment upload retry, sync state, cancellation, and safe logout behavior. Full offline browsing is not required. | Airplane-mode capture, background/resume, duplicate retry, conflict explanation, sign-out/login recovery. |

## Implementation sequence

1. Finish current Web human QA and record observed capture/continuation/media demand. Do not expand Native scope while Home IA remains unvalidated.
2. Approve and implement the Experience / Entry and Media contracts together at the storage/write boundary; use compatibility readers for current Journal and Maintenance data.
3. Replace required JSON-monolith writes with normalized, idempotent backend operations; test migration, RLS, failure, and rollback before enabling cross-device media or continuation.
4. Implement rights/projection and a revocable public-share contract. This establishes the canonical URL that both Web and Native will use.
5. Establish production identity and provider-neutral multi-identity account contract; do not copy auth state into a Native-specific user model.
6. Implement the shared offline/sync protocol in domain/API terms first. Native and Web can have different local stores and UI, but they send the same intent IDs and consume the same server states.
7. Only then create the first native vertical slice: login, Garage read, Vehicle selection, one Entry capture with media, save/retry, and bidirectional Web↔Native visibility.
8. Evaluate post-slice evidence before adding share-sheet polish, stronger offline, Drive session/location, voice/audio, video, CarPlay, or Android Auto.

## First native vertical-slice acceptance criteria

- A pre-existing MECHORI user signs in without creating a second account.
- The Native app reads a Web-created Vehicle Experience and its ordered approved attachment projection.
- A Native capture writes one Entry with an idempotency key and private media; Web displays it after sync.
- Interrupted entry/media upload is recoverable without a duplicate Entry or public leak.
- Logout/login preserves the same server data and clears only local private caches according to the retention policy.
- No WebView wrapper is used for primary Garage, record, or media-capture flows. WebView stays limited to explicitly web-only/external browser needs.

## Out of scope before the gate

No Native app shell, app-store submission, Apple OAuth, push, background GPS, Drive route recording, voice/audio capture, video sharing, CarPlay, Android Auto, AI diagnosis, Professional workflow, MCP, or full Web screen parity is implied by this plan.

## Manual gates

Production auth/provider configuration, mobile signing/certificates, app-store accounts, permission declarations, production deployment, DB/RLS/Storage migration, and any cost-bearing provider remain owner-approved external actions. Technology/version selection for React Native, Expo, development builds, and native modules is deferred until step 7 and must be re-evaluated against current official platform documentation.
