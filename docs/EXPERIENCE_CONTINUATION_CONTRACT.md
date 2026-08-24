# Vehicle Experience continuation contract

- Status: implementation-ready β contract; no production schema, RLS, RPC, UI continuation action, or record backfill has been applied.
- Scope: a minimum `VehicleExperience` / `ExperienceEntry` contract for appending an owner’s later observation, work, result, recurrence, or Drive note without turning a Journal link into causal evidence.
- Non-goal: this is not an Evidence Graph, a diagnostic system, an automatic episode detector, or an inferred repair timeline.

## Why the current relation is insufficient

`GarageJournalPost.linkedRecordId` and `JournalMaintenanceLink` mean only that the Journal author chose to show selected fields from one existing Maintenance record. They do **not** state that two Journals belong to the same experience; they carry no append order, participant role, occurrence ordering, revision history, entry-level rights, or causal/result assertion. A Journal title, matching vehicle, nearby date, shared capture intent, or similar prose cannot supply those facts.

The current Garage therefore remains a chronological Vehicle history. A future button labelled 「続きを残す」 / “Add a follow-up” must be introduced only after it can append an explicit Entry to a durable Experience.

## Minimum domain contract

```text
VehicleExperience 1 ── * ExperienceEntry 1 ── * EntryMediaAttachment
        │                       │
        ├── * ExperienceMaintenanceRelation
        ├── * ExperienceRevisionEvent
        └── * Public / member / owner rights projections
```

### `VehicleExperience`

| Field | Contract |
| --- | --- |
| `id` | opaque, stable, non-sequential internal ID; never derived from a Journal ID or displayed as a share token. |
| `vehicleId` | required internal Vehicle anchor. An old Journal without a vehicle remains a legacy Journal rather than inventing a Vehicle Experience. |
| `kind` | optional owner-chosen broad context (`issue`, `service`, `drive`, `memory`, `other`, `unspecified`). It is not a diagnosis and is not inferred from prose. |
| `lifecycleState` | `active`, `closed`, or `archived`; distinct from any Issue result/status. |
| `createdByUserId` / `createdAt` / `updatedAt` | creation accountability and lifecycle timestamps. |
| `rightsState` | a private source-of-truth rights state; separate projections determine member sharing, anonymous public sharing, and transferability. |
| `origin` | explicit provenance such as `new_capture`, `journal_backfill`, `maintenance_backfill`, `import`, or `manual_link`; preserves how the container arose. |

An Experience is a container, not a claim that every Entry has one cause, one repair, one author, or a resolved outcome.

### `ExperienceEntry`

| Field | Contract |
| --- | --- |
| `id` / `experienceId` | opaque durable IDs; `experienceId` is immutable after finalization. |
| `appendOrder` | server-assigned, monotonic integer unique within an Experience. It records append order, not the time an event occurred. Entries are not silently renumbered or reordered. |
| `appendIntentId` | client-generated idempotency key scoped to an author and Experience; retries return the same Entry. |
| `occurredAt` + precision / `occurredPeriodNote` | actual event time only as known by the contributor (`day`, `month`, `year`, `unknown`) and never fabricated from `createdAt`. |
| `recordedAt` | server creation time; remains distinct from occurrence time. |
| `authorUserId` | authenticated account that wrote this Entry. |
| `actor` | optional separately-attributed participant/role snapshot. It is not assumed to be the author, owner, mechanic, or legal owner. |
| `originalContent` / `sourceLanguage` / `contentBlocks` | authored original text and ordered presentation blocks. Translations and AI outputs are versioned derivatives, never replacements. |
| `provenance` | owner-entered, mechanic-entered, imported, official source, or other explicit source type with a minimal reference where applicable. Confidence/verification stays separate. |
| `entryState` | `active`, `superseded`, `withdrawn`, or `redacted`; deletion and publication are separate operations. |

`ExperienceEntry` may represent an observation, a workshop visit, a result report, or a Drive note. A subtype-specific relation holds structured maintenance, route, or measurement data; a generic Entry is not expanded into a speculative all-purpose schema.

### Results, recurrence, and issue state

An Entry can explicitly report an outcome using an owner-selected value such as `improved`, `unchanged`, `worsened`, `resolved_reported`, `recurred_reported`, or `unknown`. It must carry the source Entry and timestamp. The Experience’s current display status is a derived, explainable projection from explicit state updates—not from temporal proximity or text classification. A later `recurred_reported` does not erase the previous result.

The existing Quick Record `issueStatus` maps only when the author explicitly selected it. `issue/open` remains an entry-level legacy fact during migration; no currently-open Experience is inferred merely because a Journal has the `issue` intent.

### Revisions and relations

- `ExperienceEntryRevision` is append-only: `entryId`, revision number, editor, timestamp, changed-field references, reason code, and a reference to the prior/current content version. It avoids copying unrestricted personal content into an audit log.
- `ExperienceMaintenanceRelation` explicitly connects an Experience or Entry to a `MaintenanceEvent` / legacy Maintenance record with a role (`described_by`, `performed_as`, `result_of`, `related_context`) and creator. The relation neither publishes the record nor grants the maintenance provider access to the Experience.
- `EntryMediaAttachment` is the ordered relation defined in `docs/MEDIA_NORMALIZATION_ARCHITECTURE.md`. Media belongs to the Entry by default, not to the whole Experience. A representative Experience photo is a projection selection, not a duplicated attachment.
- `Evidence` is later normalized from particular Entries or Maintenance data with provenance/revision. One Experience is never automatically one Evidence item.

## Append/write protocol

1. The user creates a new Experience explicitly, or chooses an existing one from a clear continuation UI. The selection is saved as an explicit `experienceId`; no matching heuristic runs.
2. The client sends the stable `appendIntentId`, content, occurrence precision, author context, and finalized/private attachment references.
3. A server operation authorizes the writer, reserves the next `appendOrder`, validates attachment ownership/rights, and persists the Entry once. A duplicate intent returns the original result.
4. The client may retry an interrupted request without creating a second Entry or duplicate media relation. UI shows pending/retry state rather than claiming that the follow-up was saved.
5. Editing an Entry produces the revision behavior above. Changing a title or correcting a date does not relink its Experience. Moving an Entry to another Experience requires a separately audited, explicit operation and is outside the first vertical slice.

Concurrent append order is about contribution sequence. Timeline display can primarily sort by the contributor’s occurrence precision with a deterministic `appendOrder` tie-breaker, while retaining both values in the UI/API.

## Compatibility and migration plan

| Legacy source | β treatment | Explicitly not inferred |
| --- | --- | --- |
| Quick Record with a Vehicle | one singleton Experience plus one Entry during backfill | relationship to another Quick Record, result/resolution, actor, or cause. |
| Detailed `GarageJournalPost` with a Vehicle | one singleton Experience plus one Entry; preserve title, original blocks, dates, author, visibility and media descriptors through adapters | membership with another Journal based on body/date/vehicle similarity. |
| Journal without a Vehicle | retain as legacy Journal until the author supplies a Vehicle or a separate policy exists | a Vehicle anchor. |
| `linkedRecordId` / `JournalMaintenanceLink` | retain as legacy display link; create a typed maintenance relation only from the existing explicit link and label its provenance | continuation, causality, shared access, or a public maintenance projection. |
| `MaintenanceRecord` | remains its structured source of truth; can be represented by a singleton Experience only under an explicit backfill policy | a Journal entry, author identity, or public permission. |
| `alpha_inline`, `local_blob`, `alpha_shared` media | remain readable through media compatibility adapters; new Entry attachments wait for media normalization stages | public-safe media rights or cross-device recovery of absent IndexedDB blobs. |

Migration is staged: (1) finalise this contract and rights/media dependencies; (2) create normalized entities and RLS/RPC tests; (3) dual-read with old presentation adapters; (4) create singleton backfill records idempotently without deleting the legacy source; (5) make newly created captures write an Experience/Entry; (6) expose explicit continuation; (7) migrate old media only through its own verified plan. Backfill results must have a source reference and be repeat-safe.

## Required tests and human validation

- Unit: no implicit continuation from journal text/date/vehicle; append-order uniqueness; duplicate intent idempotency; occurrence precision; revision/relation validity; legacy adapter compatibility.
- Integration: author and collaborator authorization, concurrent append, retry after timeout, attachment authorization, no disclosure through a maintenance relation, and unpublish/delete/revision boundaries.
- Migration: singleton backfill is deterministic, idempotent, resumable, and leaves legacy data readable; an unanchored Journal is reported rather than coerced.
- Human QA: create an issue, append observation, add a workshop/result Entry, report recurrence, correct a past date, view same Experience on another device, and verify that a user can distinguish “related record” from “continuation.”

## Manual gates and risks

- **P1:** physical schema/RLS/RPC and any backfill are required for durable continuation; a Journal-to-Journal UI link before them would create misleading history.
- **P1:** revision, author/actor, visibility, and media rights must stay separate. A Vehicle relationship alone cannot grant access to every Entry.
- **P2:** user experience must keep the low-friction Quick Record path; creating/selecting an Experience should not become a required pre-write form.
- **MANUAL_NEXT:** owner approval is required before database migration, backfill of real records, RLS/RPC, change to retention/rights, or a public/participant continuation UI is enabled.
