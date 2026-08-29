-- 0023_rate_limits.sql
--
-- Herkese açık formlar için IP başına hız sınırı.
--
-- Sorun: `createBookingRequest` ve `createVillaApplication` kimlik gerektirmiyor,
-- `service_role` ile yazıyor (RLS devre dışı) ve hiçbir hız sınırı yok
-- (`actions/booking.ts` içinde "TODO (Faz 4 sonrası): gerçek hız sınırı (Upstash)").
-- Bir saldırgan döngüye sokup tabloyu sahte PII ile doldurabilir, her istekte
-- Storage'a ~9 MB dosya yazdırabilir ve her kayıtta Resend üzerinden e-posta
-- tetikleyerek acentenin kutusunu ve e-posta kotasını tüketebilir.
--
-- Neden Upstash değil: tek bağımlılık daha eklemeye gerek yok — sayaç zaten
-- sahip olduğumuz Postgres'te atomik tutulabiliyor. Bellek-içi bir Map ise
-- serverless'ta işe yaramaz (her örnek kendi sayacını tutar).

create table if not exists public.rate_limits (
  bucket       text        not null,          -- 'booking' | 'application'
  key          text        not null,          -- IP'nin sha256 özeti (ham IP saklanmaz)
  window_start timestamptz not null,
  count        int         not null default 1,
  primary key (bucket, key, window_start)
);

comment on table public.rate_limits is
  'Herkese açık form gönderim sayacı. Yalnızca service_role erişir; RLS açık ve politika YOK.';

-- Temizlik taramaları için.
create index if not exists rate_limits_window_idx
  on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
-- Bilerek hiçbir politika tanımlanmadı: RLS varsayılanı "reddet", yani anon ve
-- authenticated bu tabloyu göremez. Yalnızca service_role (RLS'i atlar) yazar.

-- ---------------------------------------------------------------------------
-- Atomik sayaç: aynı pencerede sayacı artırır ve sınırın altında mı söyler.
--
-- `security definer`: yalnızca service_role çağırsa da fonksiyonun tabloya
-- erişimi kendi sahibinden gelsin; `search_path = ''` ile şema gölgelemesi kapalı.
-- ---------------------------------------------------------------------------
drop function if exists public.rate_limit_hit(text, text, int, int);

create function public.rate_limit_hit(
  p_bucket         text,
  p_key            text,
  p_window_minutes int,
  p_max            int
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count  int;
begin
  -- Sabit pencere: ör. 60 dk için saat başı, 15 dk için çeyrek saat.
  v_window := date_trunc('hour', now())
            + (floor(extract(minute from now())::int / p_window_minutes)
               * p_window_minutes) * interval '1 minute';

  insert into public.rate_limits (bucket, key, window_start, count)
  values (p_bucket, p_key, v_window, 1)
  on conflict (bucket, key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- Yeni pencere açıldığında eski satırları temizle (ucuz, seyrek çalışır).
  if v_count = 1 then
    delete from public.rate_limits
     where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, text, int, int) from public, anon, authenticated;
-- service_role zaten tüm fonksiyonları çalıştırabilir; açıkça vermeye gerek yok.
