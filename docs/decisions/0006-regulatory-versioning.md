# ADR 0006: Regulatory versioning

- Status: Accepted
- Date: 2026-08-13

## Decision

Malaysian e-Invoice validation and personal-tax estimation will use immutable, versioned rule packs. No code or documentation may silently describe undated constants as the “latest” rules.

Every pack records its authority, title, version, publication and retrieval dates, source URL, checksum, effective period, superseded versions, supported scope, and application release.

The e-Invoice prototype imports and preserves structured document data and visual evidence offline. It does not submit to MyInvois or verify live validity, cancellation, or status.

The initial tax-estimation scope is Form BE for a user-confirmed Malaysian resident individual without business income. Business-income, non-resident, and uncertain profiles receive no unsupported numeric result. Each Year of Assessment requires its own reviewed pack; YA 2025 is the first candidate.

All estimates must identify their YA, pack version, source dates, assumptions, and non-filing/non-advice limitation. Qualified Malaysian tax review remains a stable-release gate.
