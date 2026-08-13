# Receipt Collector

Receipt Collector is an offline-first personal finance prototype for keeping receipt evidence, reviewing extracted values, and building a trustworthy MYR ledger with minimal typing.

## Current prototype

The checked-in application is the preserved browser prototype. It currently provides:

- camera and image/PDF intake;
- IndexedDB storage of receipt metadata and original files;
- SHA-256 duplicate detection;
- multi-file receipts;
- receipt search, filters, review, deletion, monthly totals, and CSV export;
- an installable PWA shell and Android/Chromium Share Target.

Important: the current IndexedDB data is not an encrypted native vault. Browser storage may be cleared or evicted and is not a backup. Do not rely on the prototype for irreplaceable records yet.

## Approved prototype direction

The target is a private, single-user application sharing one React/TypeScript core across:

- Android 12 and later through Capacitor;
- iPhone through Capacitor;
- Windows 10 22H2 x64 and Windows 11 x64 through Tauri.

Normal operation, OCR, imports, ledger calculations, tax estimates, and backup creation must work without internet. No receipt, statement, OCR, ledger, or telemetry data may be uploaded. Email verification, cloud synchronization, MyInvois submission, and live MyInvois status checks are outside the approved prototype.

The planned prototype includes encrypted local storage and recovery, local PIN with optional platform authentication, English/Malay/Traditional Chinese OCR, Malaysian e-Invoice intake, Maybank and spreadsheet imports, line items and splits, reconciliation, monthly targets, Form BE estimates, and an auditable workbook. These are roadmap commitments, not current implementation claims.

The Supabase schema and Azure OCR function remain checked in only as historical prototype artifacts. They are inactive in the UI and are not the production direction.

## Development

Use the pinned Node and npm versions:

```powershell
node --version
npm.cmd --version
npm.cmd ci
npm.cmd run verify
```

Individual checks are available as `typecheck`, `lint`, `test`, and `build` scripts.

## Product safeguards

- Source documents remain separate from financial transactions.
- Money is stored as integer sen.
- OCR and imported values remain untrusted until a person confirms them.
- Imports must be previewed and committed atomically.
- Removing evidence must never silently remove its financial transaction.
- Scanning a paper document is not presented as permission to destroy the original. Users must follow the applicable IRBM retention requirements.

Architecture decisions are recorded in [docs/decisions](docs/decisions), security boundaries in [docs/security](docs/security), and baseline evidence in [docs/baseline](docs/baseline).

## Release boundary

This repository is preparing an internal prototype candidate only. No public release, store submission, production signing, remote deployment, or stable-release claim is authorized until device testing and user acceptance are complete.
