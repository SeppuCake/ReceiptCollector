# Receipt Collector

Receipt Collector is an offline-first personal finance prototype for keeping receipt evidence, reviewing extracted values, and building a trustworthy MYR ledger with minimal typing.

## Current prototype

The checked-in application is the preserved browser prototype. It currently provides:

- camera and image/PDF intake;
- IndexedDB storage of receipt metadata and original files;
- SHA-256 duplicate detection;
- multi-file receipts;
- local English/Malay OCR for JPEG, PNG, and WebP receipts, with review-only suggestions for merchant, date, total, tax, and MYR currency;
- receipt search, filters, review, deletion, monthly totals, and CSV export;
- an installable PWA shell and Android/Chromium Share Target.

Important: the current IndexedDB data is not an encrypted native vault. Browser storage may be cleared or evicted and is not a backup. Do not rely on the prototype for irreplaceable records yet.

## Approved prototype direction

The target is a private, single-user application sharing one React/TypeScript core across:

- Android 12 and later through Capacitor;
- iPhone through Capacitor;
- Windows 10 22H2 x64 and Windows 11 x64 through Tauri.

Normal operation, OCR, imports, ledger calculations, tax estimates, and backup creation must work without internet. No receipt, statement, OCR, ledger, or telemetry data may be uploaded. Email verification, cloud synchronization, MyInvois submission, and live MyInvois status checks are outside the approved prototype.

The planned prototype still includes encrypted local storage and recovery, local PIN with optional platform authentication, Traditional/Simplified Chinese OCR and native OCR adapters, Malaysian e-Invoice intake, Maybank and spreadsheet imports, line items and splits, reconciliation, monthly targets, Form BE estimates, and an auditable workbook. These are roadmap commitments, not current implementation claims.

The `supabase/` schema and function remain checked in only as historical, non-deployed prototype source. No cloud client, browser credentials, or Supabase runtime dependency ships in the application.

## Development

Use the pinned Node and npm versions:

```powershell
node --version
npm.cmd --version
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run verify
```

Individual checks are available as `typecheck`, `lint`, `test`, `regulatory:validate`, `build`, `test:e2e`, and `test:ocr` scripts. OCR and E2E tests use synthetic receipts, exercise the production service worker offline, and fail on any non-loopback request.

The first OCR model load is intentionally sizeable because its worker, WASM core, and English/Malay models are bundled locally. OCR never confirms an expense: every suggestion remains editable and requires human confirmation. PDFs and HEIC/HEIF files still use manual review because PDF rendering and HEIC decoding are not part of this slice.

## Product safeguards

- Source documents remain separate from financial transactions.
- Money is stored as integer sen.
- OCR and imported values remain untrusted until a person confirms them.
- Imports must be previewed and committed atomically.
- Removing evidence must never silently remove its financial transaction.
- Scanning a paper document is not presented as permission to destroy the original. Users must follow the applicable IRBM retention requirements.

Architecture decisions are recorded in [docs/decisions](docs/decisions), security boundaries in [docs/security](docs/security), dependency evidence in [docs/dependencies](docs/dependencies), the offline regulatory register in [docs/regulatory](docs/regulatory), and baseline evidence in [docs/baseline](docs/baseline).

## Stage 1 platform boundary

Application code consumes typed capability contracts from `src/platform/contracts`. Deterministic fakes and reusable failure-oriented contract suites live in `src/platform/testing`. The current Dexie implementation is isolated in a browser baseline adapter and remains explicitly unencrypted and non-durable; it preserves prototype behavior while native vault work proceeds.

## Release boundary

This repository is preparing an internal prototype candidate only. No public release, store submission, production signing, remote deployment, or stable-release claim is authorized until device testing and user acceptance are complete.
