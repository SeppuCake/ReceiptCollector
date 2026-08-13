# ADR 0004: Offline boundary

- Status: Accepted
- Date: 2026-08-13

## Decision

After installation, all ordinary Receipt Collector workflows must work with the network unavailable. Documents, OCR content, ledger data, tax data, telemetry, and diagnostics must not leave the device.

The prototype will not contain cloud synchronization, email verification, analytics, advertising, remote OCR, MyInvois submission, live status checks, or an automatic network updater.

OCR models, fonts, schemas, parsing profiles, and active regulatory rule packs must be bundled in the application package. Updated rules are delivered only through a separately obtained, integrity-checked application package.

Network-denial and packet-monitoring tests begin when native adapters are introduced and continue through every package candidate.
