# ADR 0001: Product scope

- Status: Accepted
- Date: 2026-08-13

## Decision

Receipt Collector is a personal, single-user, offline financial-record assistant rather than a business accounting system.

The prototype must support MYR, Asia/Kuala_Lumpur, receipts and invoices, receipt line items, transaction splits, income, expenses, refunds, owned-account transfers, receipt/statement reconciliation, optional monthly income or savings targets, and spending limits.

Imported or OCR-derived values remain untrusted until the user reviews and confirms them. Source evidence remains separate from financial transactions so that correcting or removing one does not silently corrupt the other.

## Supported intake target

- English, Malay, and Traditional Chinese receipt OCR.
- Secondary Simplified Chinese compatibility coverage.
- Malaysian e-Invoice XML/JSON plus visual PDF/image evidence.
- Maybank personal statement imports.
- XLSX, CSV, TSV, and ODS spreadsheet imports.
- Legacy XLS only if the Stage 1 library and device-security review accepts it.

## Excluded from the prototype

- Multi-user or business accounts.
- Cloud synchronization or online document storage.
- Automatic tax filing or legal/tax advice.
- MyInvois submission or live document-status verification.
- Trusting bank credits as taxable income without user classification.
