# Stage 0 baseline

- Captured: 2026-08-13
- Workspace: `D:\Projects\ReceiptCollector`
- Node: `22.15.0`
- npm: `10.9.2`
- Baseline commit: recorded in Git history as `chore: preserve receipt prototype baseline`

## Baseline state

The first commit preserves the existing application source, configuration, public asset, Supabase prototype, tests, and original documentation. Generated dependencies/output and the local planning transcript are intentionally excluded, so it is an application-source recovery point rather than a byte-for-byte copy of the entire folder.

The current application is a browser PWA using IndexedDB. It is not yet an encrypted native application. Supabase/Azure artifacts are preserved for history but are inactive in the interface.

## Verification commands

Run from a clean local clone:

```powershell
node --version
npm.cmd --version
npm.cmd ci
npm.cmd run verify
git status --short
git ls-files -ci --exclude-standard
git diff HEAD~1 -- src public supabase
```

Expected results:

- installation, TypeScript, ESLint, unit tests, and production build pass;
- the tracked tree remains clean;
- no ignored file is tracked;
- the Stage 0 documentation commit changes no `src`, `public`, or `supabase` file.

## Private-data checks

Before either commit, inspect staged paths for private keys, access tokens, real receipts/statements, database files, backups, signing credentials, and unexpectedly large binaries. `.env.example` may be tracked only with empty or clearly synthetic values.

`src/test/test.txt` is a local planning transcript. It remains on the original workstation, is listed in `.git/info/exclude`, and must be absent from Git history and a clean clone.

## Visual baseline

Stage 0 changes no application behavior. Interactive browser screenshots and browser E2E fixtures will be captured with synthetic data when the Stage 1 browser harness is introduced. No screenshot containing real financial information belongs in this repository.

## Known limitations

- No native Android, iPhone, or Windows shell exists yet.
- No encrypted vault, PIN, biometric unlock, recovery archive, on-device OCR, statement import, ledger reconciliation, tax estimator, or workbook exists yet.
- A clean `npm ci` emits a deprecation warning for transitive `glob@11.1.0` even though `npm audit` reports zero vulnerabilities; Stage 1 must identify its dependency chain and an upgrade path before native packaging.
- The production build currently emits a non-fatal Vite PWA warning that `inlineDynamicImports` is deprecated; Stage 1 must verify the plugin/configuration upgrade path before native packaging.
- Windows 10 acceptance requires a genuine build 19045 machine or VM; this workstation is not sufficient evidence.
- iPhone packaging requires macOS, Xcode, Apple Developer access, registered device identifiers, and provisioning material.
