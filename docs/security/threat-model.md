# Threat model

- Status: Requirements baseline
- Last reviewed: 2026-08-13

## Assets

- Receipt, invoice, statement, spreadsheet, e-Invoice, and tax-evidence files.
- Ledger records, receipt items, splits, accounts, budgets, tax profiles, and estimates.
- Vault master keys, key envelopes, recovery material, application PIN metadata, and backups.
- Plaintext generated temporarily during OCR, parsing, previews, exports, and restoration.

## Protected scenarios

The design must protect persistent financial content from casual filesystem browsing, another normal OS user, a copied database/document directory, a lost but locked device, modified ciphertext, malicious input documents, unintended network transmission, and recovery with an incorrect secret.

## Explicit limitations

The vault cannot fully protect against same-user malware while the user session can call platform key services, operating-system administrators, rooted or jailbroken devices, kernel compromise, physical screen or camera capture, shoulder surfing, or content accessed while the vault is already unlocked.

The application PIN primarily prevents casual in-app access. It is not the only entropy protecting copied vault data.

## Security invariants

- Persistent financial data is encrypted and authenticated.
- Source documents and financial transactions remain separate.
- Plaintext temporary content is memory-only where practical and crash-cleaned otherwise.
- PINs, recovery secrets, biometric data, statement passwords, and document contents are never logged.
- Every native command uses least-privilege capabilities and constrained filesystem scopes.
- Import parsing is isolated from committing ledger data; commit is atomic after review.
- Network access is denied during normal operation and verified at runtime.

## Verification

Tests must include copied-file inspection, ciphertext modification, another OS user, another device, wrong PIN/recovery secrets, biometric changes, interruption during migration/backup, low storage, malicious archives/PDFs/spreadsheets, temporary-file discovery after crashes, and packet monitoring.
