-- 0022_atomic_operations.sql
--
-- Sil-sonra-yaz çiftlerini tek transaction'a alır.
--
-- Sorun: Supabase JS istemcisinde transaction yok. `delete()` + `insert()` iki ayrı
-- HTTP isteğidir; araya bir hata girerse (JWT süresi dolması, ağ kopması, timeout)
-- silme kalıcı olur, yazma olmaz ve geri alma yoktur. 29.08.2026 denetimi bunu dört
-- yerde buldu; en pahalısı `bulkSetSeason`: tek tıkla 200 villanın sezon fiyatı
-- silinip yerine yenisi yazılmayabiliyordu ve kullanıcı yalnızca
-- "İşlem başarısız" görüyordu.
--
-- Çözüm: her işlem bir plpgsql fonksiyonu. Fonksiyon gövdesi tek transaction'dır;
-- ortada hata olursa tamamı geri alınır.
--
-- Güvenlik: hepsi `security invoker` (varsayılan) — yani RLS çağıran kullanıcının
-- kimliğiyle uygulanır. Panel `service_role` KULLANMAZ (docs/panel-kurallari.md §1,
-- Katman 4). `search_path = ''` ile şema gölgelemesi kapatıldı; tüm nesneler tam
-- nitelenmiş yazıldı.

-- ---------------------------------------------------------------------------
-- 1. Toplu sezon fiyatı: aralığa değen sezonları sil + tek sezon yaz
-- ---------------------------------------------------------------------------
drop function if exists public.bulk_set_season(uuid[], date, date, numeric, int, text);

create function public.bulk_set_season(
  p_villa_ids  uuid[],
  p_from       date,
  p_to         date,
  p_price      numeric,
  p_min_nights int,
  p_label      text
) returns int
language plpgsql
set search_path = ''
as $$
declare
  v_applied int;
begin
  if p_villa_ids is null or array_length(p_villa_ids, 1) is null then
    return 0;
  end if;

  -- Aralığa DEĞEN sezonlar (yarı-açık aralık mantığı: starts_on < to and ends_on > from)
  delete from public.villa_seasons
   where villa_id = any(p_villa_ids)
     and starts_on < p_to
     and ends_on   > p_from;

  insert into public.villa_seasons
    (villa_id, label_tr, label_en, starts_on, ends_on, price, min_nights)
  select v, p_label, p_label, p_from, p_to, p_price, p_min_nights
    from unnest(p_villa_ids) as v;

  get diagnostics v_applied = row_count;
  return v_applied;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Villanın kategori bağlarını eşitle
--    Eski hâli kategori başına ayrı bir "max(sort_order)" sorgusu atıyordu (N+1)
--    ve hiçbirinin hatası kontrol edilmiyordu. Burada sıra tek sorguda hesaplanıyor.
-- ---------------------------------------------------------------------------
drop function if exists public.sync_villa_categories(uuid, uuid[]);

create function public.sync_villa_categories(
  p_villa_id     uuid,
  p_category_ids uuid[]
) returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.villa_categories where villa_id = p_villa_id;

  if p_category_ids is null or array_length(p_category_ids, 1) is null then
    return;
  end if;

  -- Villa, seçilen her kategorinin SONUNA eklenir; kategori içi mevcut sıra bozulmaz.
  insert into public.villa_categories (villa_id, category_id, sort_order)
  select
    p_villa_id,
    c.cid,
    coalesce(
      (select max(vc.sort_order) + 1
         from public.villa_categories vc
        where vc.category_id = c.cid),
      0
    )
  from unnest(p_category_ids) as c(cid);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Kategorinin villa listesini eşitle (sıra = gelen dizinin sırası)
-- ---------------------------------------------------------------------------
drop function if exists public.set_category_villas(uuid, uuid[]);

create function public.set_category_villas(
  p_category_id uuid,
  p_villa_ids   uuid[]
) returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.villa_categories where category_id = p_category_id;

  if p_villa_ids is null or array_length(p_villa_ids, 1) is null then
    return;
  end if;

  insert into public.villa_categories (category_id, villa_id, sort_order)
  select p_category_id, v.villa_id, v.ord - 1
    from unnest(p_villa_ids) with ordinality as v(villa_id, ord);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Rezervasyon güncelleme + takvim bloğunu taşıma
--    Eski hâlde blok taşınıp kayıt güncellemesi başarısız olabiliyordu; sonuçta
--    kayıt 1–8 Ağustos derken blok 1–10 Ağustos'u kapatıyor ve iptal sırasında
--    tarih eşleşmediği için blok hiç silinemiyordu (kalıcı satılamaz gece).
--    Artık ikisi tek transaction: blok çakışırsa (23P01) kayıt da değişmez.
-- ---------------------------------------------------------------------------
drop function if exists public.update_booking_with_block(
  uuid, uuid, date, date, boolean, uuid, date, date,
  int, int, int, text, text, text, numeric, numeric, numeric, text, text
);

create function public.update_booking_with_block(
  p_id             uuid,
  p_villa_id       uuid,
  p_check_in       date,
  p_check_out      date,
  p_move_block     boolean,
  p_old_villa_id   uuid,
  p_old_check_in   date,
  p_old_check_out  date,
  p_adults         int,
  p_children       int,
  p_babies         int,
  p_full_name      text,
  p_phone          text,
  p_email          text,
  p_price_estimate numeric,
  p_paid_amount    numeric,
  p_damage_deposit numeric,
  p_deposit_note   text,
  p_note           text
) returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_move_block and p_old_villa_id is not null then
    delete from public.villa_blocks
     where villa_id  = p_old_villa_id
       and starts_on = p_old_check_in
       and ends_on   = p_old_check_out
       and source    = 'booking';

    -- Çakışma varsa 23P01 fırlar ve fonksiyonun tamamı geri alınır:
    -- eski blok yerinde kalır, kayıt değişmez. Elle geri yazmaya gerek yok.
    insert into public.villa_blocks (villa_id, starts_on, ends_on, source, note)
    values (p_villa_id, p_check_in, p_check_out, 'booking',
            'Onaylanan rezervasyon (düzenlendi)');
  end if;

  update public.booking_requests
     set villa_id       = p_villa_id,
         check_in       = p_check_in,
         check_out      = p_check_out,
         adults         = p_adults,
         children       = p_children,
         babies         = p_babies,
         full_name      = p_full_name,
         phone          = p_phone,
         email          = p_email,
         price_estimate = p_price_estimate,
         paid_amount    = p_paid_amount,
         damage_deposit = p_damage_deposit,
         deposit_note   = p_deposit_note,
         note           = p_note
   where id = p_id;

  if not found then
    -- Kayıt yoksa blok taşımasını da geri al.
    raise exception 'booking_not_found' using errcode = 'no_data_found';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Tarih aralığını aç — kesişen elle blokları SİLMEZ, BÖLER
--
--    Eski davranış: aralığa "değen" her elle blok tümüyle siliniyordu. Personel
--    takvimden yalnızca 5–6 Ağustos'u seçip "aç"a bastığında, 1 Haziran – 30 Eylül'lük
--    bir acente tahsis bloğunun TAMAMI siteye açılıyor ve toast "Tarihler yeniden
--    müsait." diyordu. Artık yalnızca seçilen aralık açılır; blok dışarı taşıyorsa
--    kalan parçalar korunur.
--
--    Onaylı rezervasyon blokları (source='booking') korunur — onlar Talepler
--    ekranından yönetilir.
-- ---------------------------------------------------------------------------
drop function if exists public.open_villa_dates(uuid[], date, date);

create function public.open_villa_dates(
  p_villa_ids uuid[],
  p_from      date,
  p_to        date
) returns int
language plpgsql
set search_path = ''
as $$
declare
  r       record;
  v_count int := 0;
begin
  if p_villa_ids is null or array_length(p_villa_ids, 1) is null then
    return 0;
  end if;

  -- Döngü kendi anlık görüntüsü üzerinde çalışır; içeride yapılan
  -- silme/eklemeler yinelemeyi etkilemez.
  for r in
    select id, villa_id, starts_on, ends_on, note
      from public.villa_blocks
     where villa_id  = any(p_villa_ids)
       and source    = 'manual'
       and starts_on < p_to
       and ends_on   > p_from
  loop
    delete from public.villa_blocks where id = r.id;
    v_count := v_count + 1;

    -- Seçimden ÖNCE kalan parça korunur.
    if r.starts_on < p_from then
      insert into public.villa_blocks (villa_id, starts_on, ends_on, source, note)
      values (r.villa_id, r.starts_on, p_from, 'manual', r.note);
    end if;

    -- Seçimden SONRA kalan parça korunur.
    if r.ends_on > p_to then
      insert into public.villa_blocks (villa_id, starts_on, ends_on, source, note)
      values (r.villa_id, p_to, r.ends_on, 'manual', r.note);
    end if;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Yetkiler: yalnızca giriş yapmış kullanıcılar. RLS zaten personel-dışını keser.
-- ---------------------------------------------------------------------------
revoke all on function public.open_villa_dates(uuid[], date, date) from public, anon;
grant execute on function public.open_villa_dates(uuid[], date, date) to authenticated;

revoke all on function public.bulk_set_season(uuid[], date, date, numeric, int, text) from public, anon;
revoke all on function public.sync_villa_categories(uuid, uuid[]) from public, anon;
revoke all on function public.set_category_villas(uuid, uuid[]) from public, anon;
revoke all on function public.update_booking_with_block(
  uuid, uuid, date, date, boolean, uuid, date, date,
  int, int, int, text, text, text, numeric, numeric, numeric, text, text
) from public, anon;

grant execute on function public.bulk_set_season(uuid[], date, date, numeric, int, text) to authenticated;
grant execute on function public.sync_villa_categories(uuid, uuid[]) to authenticated;
grant execute on function public.set_category_villas(uuid, uuid[]) to authenticated;
grant execute on function public.update_booking_with_block(
  uuid, uuid, date, date, boolean, uuid, date, date,
  int, int, int, text, text, text, numeric, numeric, numeric, text, text
) to authenticated;
