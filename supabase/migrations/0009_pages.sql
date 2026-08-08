-- Dinamik Yasal ve Kurumsal Sayfalar Tablosu
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_tr text not null,
  title_en text not null,
  content_tr text not null default '',
  content_en text not null default '',
  meta_title_tr text,
  meta_title_en text,
  meta_description_tr text,
  meta_description_en text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  show_in_footer boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index'ler
create index if not exists pages_slug_idx on public.pages (slug);
create index if not exists pages_status_sort_idx on public.pages (status, sort_order);

-- RLS Güvenlik Politikaları
alter table public.pages enable row level security;

-- Anonim ve giriş yapmış herkes yayınlanmış sayfaları okuyabilir
create policy "Published pages are viewable by everyone"
  on public.pages
  for select
  using (status = 'published' or auth.role() = 'authenticated');

-- Admin ve editörler her türlü işlemi yapabilir
create policy "Staff members can insert pages"
  on public.pages
  for insert
  with check (auth.role() = 'authenticated');

create policy "Staff members can update pages"
  on public.pages
  for update
  using (auth.role() = 'authenticated');

create policy "Staff members can delete pages"
  on public.pages
  for delete
  using (auth.role() = 'authenticated');

-- updated_at trigger'ı
create trigger set_pages_updated_at
  before update on public.pages
  for each row
  execute function public.set_updated_at();
