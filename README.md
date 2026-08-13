# Receipt Collector

A local-first, installable receipt inbox for capturing paper receipts and e-receipts immediately, reviewing extracted details later, and exporting confirmed expenses to a ledger.

## What works locally

- Mobile camera capture and image/PDF import
- Atomic IndexedDB persistence of receipt metadata and original files
- SHA-256 duplicate detection
- Multiple images for a long receipt
- Receipt inbox, search, filters, review, deletion, and monthly totals
- Integer-sen money handling and CSV export
- Responsive desktop/mobile UI and installable PWA shell
- Android/Chromium share-target intake for screenshots and PDFs

The application starts in local-only mode. Browser data is not a backup: cloud synchronization must be configured before relying on multiple devices or clearing browser storage.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

Quality checks:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Cloud and OCR setup

1. Create a Supabase project in the region selected for the privacy requirements.
2. Apply `supabase/migrations/20260813000000_initial_receipt_collector.sql`.
3. Deploy `supabase/functions/process-receipt`.
4. Set server secrets `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` and `AZURE_DOCUMENT_INTELLIGENCE_KEY`.
5. Configure the web deployment with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.example`.
6. Test row-level policies with two disposable users before accepting real receipts.

The checked-in OCR function is an auditable provider adapter, but production synchronization remains deliberately disabled in the UI until authentication, hosting, retention, and OCR-provider choices are approved.

## Architecture

```text
Camera / Files / Android Share Target
                 |
          IndexedDB receipt vault
                 |
       Human review and correction
                 |
      PostgreSQL + private storage
                 |
    server-only receipt OCR adapter
                 |
       confirmed expense + export
```

Receipt files, OCR attempts, and confirmed expenses are separate records. This preserves originals, makes retries idempotent, and keeps OCR output from silently becoming financial truth.

## Current defaults

- Single user
- Malaysian Ringgit (MYR)
- Asia/Kuala_Lumpur
- English interface
- Human confirmation required before export
- Maximum 10 files per receipt and 15 MB per file

