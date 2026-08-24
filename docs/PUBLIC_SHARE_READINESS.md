# Public Experience Share readiness

- Status: architecture gap audit only. No anonymous Experience reader, public projection table, OGP route, metadata API, or public-media policy has been implemented.
- Scope: future unauthenticated sharing of a public Vehicle Experience while retaining the separate current α Vehicle share.

## Current repository state

`/v/[slug]` is an existing α **Vehicle** share. An explicit owner action writes a privacy-minimized snapshot to `alpha_public_vehicle_shares`; an active snapshot is readable anonymously and can be disabled with `is_active = false`. It has a random slug and a browser-native share action. This is useful precedent for explicit publish/revoke, but it is not an Experience Share foundation:

- It contains Vehicle fields and a data-URL main photo, not `VehicleExperience` / Entry content or normalized media.
- `/v/[slug]` is a client component that fetches after load. It does not provide server-generated canonical metadata/OGP for a specific Experience.
- Its picture is a snapshot copy, not a rights-reviewed `MediaVariant`; it must not become the mechanism for publishing Journal/Experience attachments.
- α shared Journals are deliberately authenticated-member content. Their `alpha_shared` objects and payloads must never be read from an anonymous route.
- Current `GarageJournalPost.visibility = public` means the current participant-facing Journal projection, not a grant for Internet publication or OGP use.

Therefore a read-only Public Experience implementation is intentionally **not** safe on the current architecture: it needs a new normalized rights/projection contract and DB/RLS work. No UI or route is added in this branch.

## Target public projection

```text
private Experience / Entry / MediaAsset
  → explicit public-share eligibility review
  → PublicExperienceProjection (minimal denormalized snapshot)
  → anonymous read route + server metadata / OGP
```

`PublicExperienceProjection` is the sole input to unauthenticated pages and metadata. It carries an opaque share ID/slug, current publication state (`published`, `revoked`, `temporarily_hidden`, `expired`), version, canonical path, minimal Vehicle label, selected Experience/Entry display fields, public-safe author attribution when allowed, selected media-variant IDs, published/revoked timestamps, and audit references. It does not contain raw workspace JSON, private IDs, email, member-only content, original media paths, exact locations, raw route, maintenance display links, internal actor data, or fallback queries to private tables.

### Eligibility and rights rules

1. The owner explicitly requests a public projection; a participant-only setting cannot be promoted automatically.
2. Every selected Entry is public-eligible and not withdrawn/temporarily hidden. Omitted private Entries are not mentioned or counted.
3. Every selected media item is an approved `public_share` derivative under the media privacy policy. Owner-private original, `local_blob`, `alpha_inline`, `alpha_shared`, or member-only variants are never candidates.
4. Vehicle representative media can be used only when its own anonymous-public right and privacy review are true; it does not inherit eligibility from the Experience.
5. Drive pages consume a separately sanitized Share Route only. Raw GPS, exact start/finish, and privacy-zone data are excluded by construction.
6. The anonymous reader has access only to the projection/RPC return shape. It does not have a client fallback that fetches Journal, workspace, user profile, or Storage paths directly.

## URL, OGP, and Native handoff

- Canonical URL candidate: `https://mechori.com/e/<opaque-share-slug>`. It is independent of Journal, Vehicle, profile, or Storage IDs, and survives a display-title edit. The exact production origin is blocked on the separate domain/hosting manual configuration.
- The route is server-rendered or metadata-capable server code. Canonical, `og:url`, title, description, `og:image`, Twitter metadata, and robots state are derived solely from the current public projection.
- Image selection is deterministic: first ordered eligible photo of the selected Experience/Entry → eligible Vehicle representative photo → versioned MECHORI default OGP. “First” means the normalized Entry attachment order, not creation order or a guessed photo.
- OGP image delivery uses the approved public derivative; no source/original URL leaks through image metadata, redirects, error responses, or image optimization. Crop/focal-point data, if later added, belongs to the approved variant/projection.
- A revoke/temporary hide immediately removes the projection from anonymous reads and returns a not-found/noindex response. Existing third-party OGP caches cannot be guaranteed to purge; cache headers, short revalidation, and owner-facing expectations must make that limit clear.
- Native OS Share Sheet receives only title/text/canonical URL from the same projection. Universal/App Links may later map that URL to the native Experience screen after app installation, with the web projection remaining the unauthenticated fallback.

## Implementation stages

| Stage | Required result | Not in this branch |
| --- | --- | --- |
| 0 | Media normalization and Experience contract have a finalized private-write basis. | UI-only share buttons or an anonymous reader. |
| 1 | Public rights/variant eligibility schema, projection state machine, audit/revoke contract, and RLS/RPC tests. | Reading `alpha_shared` or workspace JSON anonymously. |
| 2 | A minimal `PublicExperienceProjection` writer that consumes only explicitly selected eligible fields/variants. | General Journal visibility migration. |
| 3 | Server-side read route with canonical metadata, OGP fallback sequence, unavailable state, and safe cache controls. | Dynamic OGP artwork, route animation, or social-platform APIs. |
| 4 | Owner publish/unpublish UI with preview, consent/review explanation, and auditable revoke. | Automatic publicization or inference from profile settings. |
| 5 | Native share/deep-link integration after shared identity and URL contracts pass. | Separate Native-only sharing data. |

## Required tests and QA

- Anonymous requests never receive a private Entry/media/profile/workspace field, including error responses and metadata.
- First-entry photo, Vehicle fallback, and default OGP use only allowed variants and preserve attachment order.
- Revoked, hidden, deleted, stale, malformed, and unauthorized slugs return the same safe unavailable boundary.
- Owner update/revoke races cannot restore an outdated OGP pointer or an old public media path.
- OGP crawler request, no-JavaScript request, desktop/mobile browser, copy/share, and later Universal/App Link fallback are manually checked.

## Gaps and manual gates

- **P1:** anonymous public read requires new DB/RLS/RPC and a projection writer; it is not safe to layer onto participant sharing.
- **P1:** public media privacy review and derivative lifecycle are prerequisites; current α image confirmation does not meet the documented anonymous-public gate.
- **P1:** the production `mechori.com` canonical origin is manual DNS/hosting work and remains separate from local code.
- **P2:** current Vehicle sharing offers a useful revoke precedent, but conversion of its data URL snapshot to normalized media needs a separate owner-approved migration plan.
- **MANUAL_NEXT:** owner approval is required before DB/RLS/Storage changes, external crawler-visible routes, production domain settings, deployment, or real public content is enabled.
