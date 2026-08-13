# ADR 0005: Document retention and deletion

- Status: Accepted with policy review required
- Date: 2026-08-13

## Decision

Receipt Collector will never claim that scanning a paper receipt authorizes destruction of its original. Capture, review, deletion, export, and tax-evidence views will display appropriate retention warnings.

Documents record their origin (born digital, scanned paper, imported statement, structured e-Invoice), applicable Year of Assessment when known, retention metadata, and whether an original may still be required.

Deletion operations are separate:

- Removing a source file preserves its confirmed financial transaction.
- Deleting a transaction removes its splits and links but does not silently delete evidence.
- Unreferenced evidence may be deleted only through a separate explicit confirmation.
- Deleting receipt evidence never silently deletes a bank-imported transaction.

IRBM supporting-document retention requirements and original-document rules must be traced to the versioned official source register before implementation. The app provides record-management assistance, not legal advice.
