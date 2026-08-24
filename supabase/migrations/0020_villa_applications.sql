-- Villa sahibi başvuru formu (ana sayfa "Hemen Başvurun" CTA).
--
-- Villa sahipleri villalarını listelenmek üzere başvurur: iletişim + villa bilgisi
-- + konum + fotoğraflar + panelden yönetilen villa özellikleri (dinamik sorular).
--
-- Güvenlik deseni booking_requests ile aynı (ARCHITECTURE.md §5): herkese açık form
-- DB'ye doğrudan yazmaz; kayıt yalnızca Next Server Action üzerinden service_role ile
-- atılır. Bu yüzden villa_applications'a anon INSERT politikası BİLEREK yoktur.
--
-- Çalıştırma: Supabase > SQL Editor > bu dosyanın tamamını yapıştır > Run

-- ---------------------------------------------------------------
-- 1) Panelden yönetilen dinamik sorular
-- ---------------------------------------------------------------
-- Villa özellikleri (kaç oda, banyo, havuz var mı, kaç kişilik ...) koda gömülü
-- değil: personel panelden soru ekler/çıkarır, zorunlu yapar, sıralar. Cevaplar
-- villa_applications.answers (jsonb) içinde qkey -> değer olarak tutulur.

create table if not exists villa_application_questions (
  id uuid primary key default gen_random_uuid(),
  -- Stabil anahtar (jsonb cevap anahtarı). Etiket değişse de cevaplar bozulmasın.
  qkey text not null unique check (qkey ~ '^[a-z0-9_]+$'),
  label_tr text not null,
  label_en text not null,
  help_tr text,
  help_en text,
  -- Girdi tipi. 'select' için options doldurulur.
  type text not null default 'text'
    check (type in ('text', 'textarea', 'number', 'boolean', 'select')),
  -- select seçenekleri: [{ "value": "...", "label_tr": "...", "label_en": "..." }]
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists villa_application_questions_active_idx
  on villa_application_questions (active, sort_order);

alter table villa_application_questions enable row level security;

-- Form aktif soruları okuyabilmeli (PII değil); personel hepsini görür/yazar.
drop policy if exists "public reads active questions" on villa_application_questions;
create policy "public reads active questions"
  on villa_application_questions for select
  using (active or is_staff());

drop policy if exists "staff writes questions" on villa_application_questions;
create policy "staff writes questions"
  on villa_application_questions for all
  using (is_staff()) with check (is_staff());

-- Varsayılan sorular — kurulumda form boş kalmasın. qkey çakışırsa dokunma
-- (personel bunları düzenlemiş/silmiş olabilir).
insert into villa_application_questions
  (qkey, label_tr, label_en, type, options, required, sort_order)
values
  ('capacity', 'Kaç kişilik?', 'Sleeps how many?', 'number', '[]'::jsonb, true, 10),
  ('bedrooms', 'Yatak odası sayısı', 'Bedrooms', 'number', '[]'::jsonb, true, 20),
  ('bathrooms', 'Banyo sayısı', 'Bathrooms', 'number', '[]'::jsonb, true, 30),
  ('pool', 'Havuz', 'Pool', 'select',
    '[{"value":"private","label_tr":"Özel havuz","label_en":"Private pool"},
      {"value":"shared","label_tr":"Ortak havuz","label_en":"Shared pool"},
      {"value":"none","label_tr":"Havuz yok","label_en":"No pool"}]'::jsonb,
    true, 40),
  ('sea_view', 'Deniz manzarası var mı?', 'Sea view?', 'boolean', '[]'::jsonb, false, 50),
  ('listed_elsewhere', 'Başka bir acente/platformda kayıtlı mı?',
    'Listed with another agency/platform?', 'boolean', '[]'::jsonb, false, 60)
on conflict (qkey) do nothing;

-- ---------------------------------------------------------------
-- 2) Başvurular
-- ---------------------------------------------------------------
-- PII içerir (ad, telefon, adres) → staff-only. Kalıcı silme yok: iptal/red
-- 'archived' durumuyla yapılır (docs/panel-kurallari.md §3, soft delete).

create table if not exists villa_applications (
  id uuid primary key default gen_random_uuid(),
  -- İletişim
  owner_name text not null,
  phone text not null,
  email text,
  -- Villa
  villa_name text not null,
  location text not null,          -- il / ilçe / bölge (serbest metin)
  address text,                    -- açık adres (opsiyonel, PII)
  description text,
  -- Panelden yönetilen soruların cevapları (qkey -> değer)
  answers jsonb not null default '{}'::jsonb,
  -- villa-applications bucket'ındaki yollar
  photo_paths text[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'accepted', 'rejected', 'archived')),
  source text not null default 'home_cta',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists villa_applications_status_idx
  on villa_applications (status, created_at desc);

alter table villa_applications enable row level security;

-- Yalnızca personel okur/yazar. Anon INSERT YOK — kayıt Server Action'dan
-- service_role ile atılır (booking_requests ile aynı desen).
drop policy if exists "staff manages applications" on villa_applications;
create policy "staff manages applications"
  on villa_applications for all
  using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------
-- 3) Storage: başvuru fotoğrafları
-- ---------------------------------------------------------------
-- villa-images ile aynı desen: public read (fotoğraflar işlenmiş/EXIF'siz, gizli
-- değil; panelde göstermeyi basitleştirir), yükleme personele/servise kapalı.
-- Herkese açık formdaki yüklemeler Server Action içinde service_role ile yapılır.

insert into storage.buckets (id, name, public)
values ('villa-applications', 'villa-applications', true)
on conflict (id) do nothing;

drop policy if exists "public reads application photos" on storage.objects;
create policy "public reads application photos"
  on storage.objects for select
  using (bucket_id = 'villa-applications');

drop policy if exists "staff uploads application photos" on storage.objects;
create policy "staff uploads application photos"
  on storage.objects for insert
  with check (bucket_id = 'villa-applications' and is_staff());

drop policy if exists "staff updates application photos" on storage.objects;
create policy "staff updates application photos"
  on storage.objects for update
  using (bucket_id = 'villa-applications' and is_staff());

drop policy if exists "staff deletes application photos" on storage.objects;
create policy "staff deletes application photos"
  on storage.objects for delete
  using (bucket_id = 'villa-applications' and is_staff());
