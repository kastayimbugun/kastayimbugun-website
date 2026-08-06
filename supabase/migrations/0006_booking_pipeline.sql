-- Faz 5.7 (Dalga 2): talep notları, satış hattı durumları, yanıt süresi.
--
-- Neden: online ödeme yok → satışın tamamı telefonda geçiyor. Panel bugün
-- "kiminle ne konuşuldu"yu tutmuyor; personel değişiminde bilgi kayboluyor.
-- Ayrıca mevcut 4 durumda "fiyat verdim, bekliyorum" hali görünmüyor.
--
-- Çalıştırma: Supabase > SQL Editor > bu dosyanın tamamını yapıştır > Run

-- ---------------------------------------------------------------
-- 1) Satış hattı: quoted + lost durumları
-- ---------------------------------------------------------------
-- new → contacted → quoted → confirmed / lost
-- 'cancelled' korunuyor: onaylanmış bir rezervasyonun iptali ile
-- hiç kazanılamamış bir talep (lost) farklı şeyler.

alter table booking_requests drop constraint if exists booking_requests_status_check;

alter table booking_requests add constraint booking_requests_status_check
  check (status in ('new', 'contacted', 'quoted', 'confirmed', 'cancelled', 'lost'));

-- Kayıp sebebi: yapılandırılmış liste. Araştırma bu alanın hiçbir sektör
-- ürününde bulunmadığını gösterdi; 3 ayda "%40 tarih doluydu" gibi bir sonuç
-- doğrudan fiyat/stok kararına dönüşür.
alter table booking_requests
  add column if not exists lost_reason text
    check (lost_reason in ('price', 'dates_unavailable', 'no_response', 'chose_other', 'gave_up'));

-- Sebep yalnızca kayıp taleplerde anlamlı, orada da zorunlu.
alter table booking_requests drop constraint if exists booking_requests_lost_reason_required;

alter table booking_requests add constraint booking_requests_lost_reason_required
  check (
    (status = 'lost' and lost_reason is not null)
    or (status <> 'lost' and lost_reason is null)
  );

-- ---------------------------------------------------------------
-- 2) Yanıt süresi ölçümü
-- ---------------------------------------------------------------
-- İlk durum değişiminde uygulama yazar. Ölçmek tek başına davranışı değiştirir.

alter table booking_requests
  add column if not exists first_response_at timestamptz;

-- ---------------------------------------------------------------
-- 3) Sonraki takip tarihi
-- ---------------------------------------------------------------
-- Notun değil talebin alanı: "bugün aranacaklar" listesi tek sorguyla çıksın.

alter table booking_requests
  add column if not exists next_follow_up_at timestamptz;

-- Kısmi index: takip bekleyen talepler azınlıkta, tüm tabloyu indekslemeye gerek yok.
create index if not exists booking_requests_follow_up_idx
  on booking_requests (next_follow_up_at)
  where next_follow_up_at is not null;

-- ---------------------------------------------------------------
-- 4) Arama notu geçmişi
-- ---------------------------------------------------------------

create table if not exists booking_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking_requests(id) on delete cascade,
  -- Notu yazan personel. Hesap silinse de not kalsın (kim yazdı bilgisi düşer).
  author_id uuid references profiles(id) on delete set null,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists booking_notes_booking_idx
  on booking_notes (booking_id, created_at desc);

alter table booking_notes enable row level security;

-- Notlar tamamen iç veri: herkese açık okuma yok, yalnızca personel.
drop policy if exists "staff writes booking notes" on booking_notes;

create policy "staff writes booking notes"
  on booking_notes for all using (is_staff()) with check (is_staff());
