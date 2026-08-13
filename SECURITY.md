# Receipt Collector security policy

Receipts, bank statements, tax evidence, identity details, and ledger records are private financial information. Never place real financial samples, passwords, recovery secrets, signing keys, or production credentials in this repository.

## Current security boundary

The preserved browser prototype stores data in IndexedDB. It is local-first but it is not an encrypted native vault, is not protected by an application PIN, and is not a backup. The checked-in Supabase and Azure files are inactive historical prototypes and must not be deployed for production use.

## Approved target boundary

The offline native prototype will:

- encrypt database records, documents, thumbnails, recovery archives, and backups with reviewed authenticated-encryption libraries;
- generate a random vault master key and protect it with platform key facilities;
- use the application PIN as an app lock, never as the only encryption secret;
- optionally use Android biometrics, Apple Face ID/Touch ID, or Windows Hello to authorize access;
- avoid persistent plaintext OCR intermediates, statement passwords, or decrypted temporary files;
- require a separate high-entropy recovery secret for cross-device recovery;
- perform normal processing without cloud services, analytics, or telemetry.

Same-user malware, operating-system administrators, rooted or jailbroken devices, screen capture, and access while the vault is already unlocked remain outside the complete protection boundary. These limitations must be visible in the threat model and user documentation.

## Development rules

- Do not invent cryptography or silently change a vault format.
- Pin and review native, OCR, PDF, spreadsheet, and cryptographic dependencies before adoption.
- Treat every receipt, e-Invoice, PDF, spreadsheet, archive, QR payload, and backup as untrusted input.
- Never log document content, secrets, biometric information, PINs, recovery material, or statement passwords.
- Keep source evidence separate from financial transactions and require human confirmation before imported values become trusted.
- Verify migrations and backup restoration transactionally before deleting an older data copy.

## Reporting issues

Report security issues privately to the repository owner. Do not open a public issue containing personal documents, credentials, recovery material, exploit samples derived from real financial records, or other sensitive information.

The design requirements and unresolved implementation selections are maintained in [docs/security](docs/security).
