# Receipt Collector security policy

Receipt images and expenditure records are private financial data. Please report security issues privately to the repository owner rather than opening a public issue containing receipt samples, credentials, or personal information.

## Security properties

- Original files use a private storage bucket and per-owner paths.
- Every exposed database table has row-level security.
- OCR credentials and the Supabase service-role key are server-only secrets.
- The browser receives only the Supabase publishable key.
- File MIME type, size, count, and SHA-256 are validated before persistence.
- OCR output remains untrusted until a person confirms the expense.
- Money is stored as integer minor units (sen), never binary floating point.

## Deployment requirements

Before production deployment, run the database policy tests against a disposable Supabase project, configure rate limits for the OCR function, enable platform logging/alerts without logging receipt contents, and complete a backup-and-restore drill.

Never commit `.env`, Azure keys, Supabase service-role keys, real receipts, or database exports.

