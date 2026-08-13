# Offline regulatory source register

Stage 1 establishes provenance and validation only. The checked-in packs contain no legal, tax-rate, relief, retention, or filing constants and are not active calculation packs.

`register.json` records the ADR 0006 fields and points to immutable local files. `schema.json` documents the format. `npm.cmd run regulatory:validate` validates the main register, a positive fixture, deliberately invalid fixtures, dates, IDs, active-period ambiguity, path containment, and SHA-256 checksums without downloading anything.

The source register currently identifies official HASiL material for record retention, e-Invoice Guideline 4.7, and Form BE YA 2025 explanatory notes. Registration is not legal endorsement: source content still requires implementation review, and qualified Malaysian tax review remains a release gate.

To prove rejection independently:

```powershell
node scripts/regulatory/validate.mjs docs/regulatory/fixtures/invalid/missing-fields.json
```

That command must exit non-zero. Official documents are not mirrored here; `sha256` intentionally covers each committed local rule-pack file, while the official URL identifies the source used to author a future reviewed pack.
