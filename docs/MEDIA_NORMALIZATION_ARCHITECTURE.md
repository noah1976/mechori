# Media normalization architecture

- Status: implementation-ready design; no production migration, Storage policy, RLS, or bucket change has been applied.
- Scope: the media contract for `GarageJournalPost`, Quick Record, detailed Journal, shared α projection, and the future `VehicleExperience` / `ExperienceEntry` model.
- Product rule: there is no permanent product-level photo-count limit. Resource guardrails, not an arbitrary lifetime count, protect cost, reliability, and abuse resistance.

## Current state

| Path | Current representation | Ownership / access | Important constraint |
| --- | --- | --- | --- |
| Quick Record private save | one `PreparedImage` as `alpha_inline` data URL inside `AppData` / `alpha_private_workspaces.payload` | author workspace | `files?.[0]` deliberately accepts one photo; the data URL inflates the whole JSON row and every rewrite retries it. |
| Detailed Journal private save | `JournalMediaAttachment[]` plus ordered `contentBlocks`; blobs in origin-local IndexedDB as `local_blob` | browser origin and current device | Files are not in workspace JSON, so another device cannot read them before a shared copy exists. |
| Shared α Journal | `alpha_shared` object paths inside a bounded JSON payload | authenticated active α members only, through the shared row and Storage policy | only `public_ready` images are re-generated/uploaded. The shared transport limit is six images and 512 KB each. |
| Draft | text/settings in local storage; no file body or preview URL | current browser | a restored draft intentionally asks the owner to select media again. |
| Garage display | `media[]` plus `contentBlocks` | viewer rules derive visibility | array order and block order can diverge after a detailed-Journal reorder unless explicitly normalized at read time. |

The current shared upload creates a fresh, user/journal/revision-scoped object path with `upsert: false`, publishes the shared payload only after upload, removes freshly uploaded objects if the RPC fails, and attempts stale-object cleanup after a successful publish. This is a useful α safety boundary, but it is not a general private-media lifecycle: the private canonical asset is still an inline URL or IndexedDB blob.

`alpha_shared` is a participant-only projection, not anonymous public media. `local_blob` is a legacy origin-local fallback and must remain readable during migration. Existing `alpha_inline` content must likewise remain readable until an explicit, verified migration has completed.

## Target state

The normalized model separates binary assets, the ordered relationship to an Entry, and each audience-specific derivative. It does not reuse a public derivative as the private original.

```text
VehicleExperience
  └─ ExperienceEntry (append order)
       └─ EntryMediaAttachment (position, caption, relationship rights)
            └─ MediaAsset (private normalized binary / lifecycle owner)
                 └─ MediaVariant (private display, α share, public share, thumbnail)
```

### Contract

- `MediaAsset` has an opaque stable ID, owner/tenant boundary, MIME type, byte size, normalized dimensions or duration where applicable, creation state, deletion state, and privacy-review state. It contains no user-facing pathname and no public URL.
- `EntryMediaAttachment` is the ordered relation. It has an opaque ID, `entryId`, a stable non-negative position, caption/alt text, optional media occurrence time, author of the relation, and its own deletion/revision state. The `position` order is the source of truth for an Entry; content blocks may reference attachment IDs for rich layout but do not create a second attachment relationship.
- `MediaVariant` points to a concrete object and declares its purpose (`private_display`, `alpha_shared`, `public_share`, `thumbnail`, later `streaming`), source asset/version, MIME, dimensions/duration, review/rights state, and deletion state. A public or shared variant can be revoked without changing the private asset.
- Rights are evaluated from both the Entry/Experience projection and the selected variant. An asset is never made public merely because its Entry is public. `owner_private`, α-member sharing, anonymous public share, vehicle-transferable candidate, and future professional access remain distinct rights decisions.
- Audio and video use the same asset/attachment/variant envelope. Their release gates are separate: duration/size and MIME validation, thumbnail/poster, transcode or streaming policy, audio/privacy review, retry semantics, bandwidth budget, and public-delivery review. This design does not enable either format now.

### Object paths and object authority

Object paths are opaque implementation details, for example `private/<tenant-id>/<asset-id>/<variant-id>` and `shared/<projection-id>/<variant-id>`. They must never contain vehicle labels, Journal titles, email addresses, or raw user-entered filenames. They are not authorization: every read/write remains mediated by owner/tenant and projection policy.

Use a client-generated upload intent ID for retry/idempotency, but let the server/RPC reserve the durable asset and attachment IDs. A retry with the same intent ID must return the same pending asset/attachment rather than creating another logical attachment. Storage upload uses a revisioned immutable object key; replacement produces a new variant and switches the durable reference only after finalization.

### Save, failure, deletion, and cleanup

1. The client creates an upload intent and a private attachment in `pending_upload` state. It keeps the selected local file and a durable local operation record until finalization.
2. The client uploads the normalized private derivative to its reserved object key. A repeat uses the same intent/key or asks the service for the already-finalized result.
3. A server-side finalize operation verifies owner, byte/MIME metadata, privacy state, and object presence, then atomically makes the attachment available to the Entry. The Entry write references only finalized attachments.
4. Sharing creates a separate approved variant/projection. A shared/public failure leaves the private attachment and Entry intact; it does not silently remove the owner record.
5. Removing media first removes the attachment from the Entry projection and records a deletion request. The object is deleted only after reference counting/retention checks; retryable cleanup jobs handle crashes and network failures. Public/shared variants are revoked before their object cleanup.
6. An orphan scanner works only on objects carrying an upload intent with no finalized asset after a conservative retention window. It must not infer ownership from filenames or delete objects still referenced by a pending operation.

This turns partial failures into observable states (`pending_upload`, `uploaded_unfinalized`, `finalized`, `share_pending`, `share_failed`, `delete_pending`, `deleted`) rather than a binary success/failure hidden inside one `AppData` write.

## Migration stages and compatibility

| Stage | Change | Compatibility and exit condition |
| --- | --- | --- |
| 0 — current α | Preserve Quick Record one-photo `alpha_inline`, detailed Journal `local_blob`, and the six-file shared transport guardrail. | Baseline behavior remains available. |
| 1 — contract/read adapters | Add shared domain types, order/read helpers, and telemetry-free local tests. No DB, Storage, or UI write-path change. | Existing attachment sources render unchanged. |
| 2 — private asset foundation | Add private bucket, `MediaAsset` / attachment metadata, owner-only RLS, finalize/delete RPCs, and bounded cleanup work. | New tables/policies must pass RLS isolation and failure-injection tests before any UI uses them. |
| 3 — new-write cutover | New detailed Journal saves write private normalized attachments. `GarageJournalPost.media[]` remains a compatibility projection through an adapter. | `local_blob` and `alpha_inline` still read; no bulk rewrite. |
| 4 — migration-on-touch | Offer/perform resumable migration only for an owner-selected legacy item with idempotency and verification. Never infer that a missing IndexedDB blob can be recovered. | Retain legacy descriptors until both object and metadata finalization are confirmed. |
| 5 — shared/public projection | Generate participant/public variants from finalized private assets and attach only approved references to the corresponding projection. | Existing α shared rows keep their current parser and cleanup path until a versioned projection reader is live. |
| 6 — multi-photo Quick Record | Replace the single picker state with an ordered private upload queue, per-item removal/retry, and bounded batch/resource controls. | Do not enable this before stages 2–5 prove private save, retry, and recovery. |
| 7 — audio/video | Add only after the separate format, privacy, bandwidth, and delivery gates pass. | No implicit use of legacy video blobs for shared/public delivery. |

The compatibility adapter must recognize `demo_asset`, `alpha_inline`, `local_blob`, and `alpha_shared` alongside normalized attachment references. Old Journal IDs, block IDs, and captions stay stable. A backfill must not create Experience relationships, alter public status, remove old assets, or treat a data URL as a public-safe derivative.

## Rollback

- Feature-flag the *write* path by client capability/version; retain old readers throughout the migration window.
- A failed new-write rollout routes new captures back to the established α path only before any new attachment has been finalized. Once finalized, the compatibility reader renders the normalized attachment; it is never converted back into a data URL.
- Disable a projection writer independently from private writes. Revoking a projection must remove access before cleanup and must not delete the private owner record.
- Do not run a destructive backfill. Each stage is reversible by switching readers/writers while keeping immutable assets and metadata intact.

## Required tests before each destructive boundary

- Unit: ordered attachment projection, duplicate/missing block IDs, visibility filtering, MIME/size validation, opaque path validation, and legacy descriptor compatibility.
- Integration: owner isolation, cross-user denial, attachment/Entry atomic finalization, idempotent retry, interrupted upload, duplicate submit, deletion/retry, and orphan scanner conservatism.
- Projection: private attachment never appears in α or anonymous public output; an unpublish/revoke removes read access before object deletion; first-public-photo selection only uses eligible ordered attachments.
- Device: iPhone Safari and Android selection, cancellation, background interruption, poor-network retry, browser reload, and another-device read behavior.
- Load/cost: batch concurrency, object and payload bounds, storage/bandwidth accounting, rate limiting, and no uncontrolled JSON payload growth.

## Risks and manual gates

- **P1 — current JSON inflation:** Quick Record data URLs make a single private workspace row scale with image bytes. Multiple picker UI must remain disabled until private attachments are the canonical store.
- **P1 — rights leakage:** A public projection cannot read raw Workspace JSON, a `local_blob`, or a generic private object. It must consume only an explicit approved variant.
- **P1 — non-atomic cross-service work:** Database metadata and object upload fail independently. Finalization, idempotency, retained local intent, and cleanup are required; a best-effort client loop alone is not sufficient for β.
- **P2 — legacy availability:** IndexedDB data may already be absent after a browser reset. Migration must show an unavailable-media state, never fabricate a replacement or claim preservation.
- **MANUAL_NEXT:** owner approval is required before any Supabase migration, Storage bucket/policy/RLS/RPC change, lifecycle/cleanup job, resource budget, real-data backfill, or external media processing is applied.
