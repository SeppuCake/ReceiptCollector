create extension if not exists pgcrypto;

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null check (source in ('camera', 'files', 'share')),
  status text not null default 'needs_review' check (status in ('needs_review', 'processing', 'confirmed', 'failed')),
  merchant text check (char_length(merchant) <= 160),
  transaction_date date,
  total_minor bigint check (total_minor >= 0),
  tax_minor bigint check (tax_minor >= 0),
  currency char(3) not null default 'MYR',
  category text check (char_length(category) <= 80),
  payment_method text check (char_length(payment_method) <= 80),
  notes text check (char_length(notes) <= 1000),
  ocr_confidence numeric(5,4) check (ocr_confidence between 0 and 1),
  failure_reason text,
  unique (owner_id, client_id)
);

create table public.receipt_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  client_id uuid not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 15728640),
  sha256 char(64) not null check (sha256 ~ '^[0-9a-f]{64}$'),
  page_number integer not null check (page_number between 1 and 10),
  created_at timestamptz not null default now(),
  unique (owner_id, client_id),
  unique (owner_id, sha256)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  receipt_id uuid unique references public.receipts(id) on delete restrict,
  transaction_date date not null,
  merchant text not null check (char_length(merchant) between 1 and 160),
  amount_minor bigint not null check (amount_minor >= 0),
  tax_minor bigint check (tax_minor >= 0),
  currency char(3) not null default 'MYR',
  category text not null check (char_length(category) between 1 and 80),
  payment_method text not null check (char_length(payment_method) between 1 and 80),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  category text not null check (char_length(category) between 1 and 80),
  amount_minor bigint not null check (amount_minor > 0),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create table public.ocr_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  provider text not null,
  provider_version text not null,
  idempotency_key text not null,
  status text not null check (status in ('started', 'succeeded', 'failed')),
  normalized_result jsonb,
  raw_result jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (receipt_id, idempotency_key)
);

create index receipts_owner_status_idx on public.receipts (owner_id, status, captured_at desc);
create index receipts_owner_transaction_idx on public.receipts (owner_id, transaction_date desc);
create index receipt_files_receipt_idx on public.receipt_files (receipt_id, page_number);
create index expenses_owner_date_idx on public.expenses (owner_id, transaction_date desc);
create index expense_splits_expense_idx on public.expense_splits (expense_id);
create index ocr_runs_receipt_idx on public.ocr_runs (receipt_id, started_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger receipts_set_updated_at before update on public.receipts
for each row execute function public.set_updated_at();

create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

alter table public.receipts enable row level security;
alter table public.receipt_files enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.ocr_runs enable row level security;

create policy "Owners manage receipts" on public.receipts
for all to authenticated using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners manage receipt files" on public.receipt_files
for all to authenticated using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.receipts r where r.id = receipt_id and r.owner_id = (select auth.uid()))
);

create policy "Owners manage expenses" on public.expenses
for all to authenticated using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and (receipt_id is null or exists (select 1 from public.receipts r where r.id = receipt_id and r.owner_id = (select auth.uid())))
);

create policy "Owners manage expense splits" on public.expense_splits
for all to authenticated using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.expenses e where e.id = expense_id and e.owner_id = (select auth.uid()))
);

create policy "Owners read OCR runs" on public.ocr_runs
for select to authenticated using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners upload receipt objects" on storage.objects
for insert to authenticated
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners read receipt objects" on storage.objects
for select to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners update receipt objects" on storage.objects
for update to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners delete receipt objects" on storage.objects
for delete to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

