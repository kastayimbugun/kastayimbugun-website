-- Personel yönetimi + granüler modül izinleri.
--
-- Bugün yetki tek boyutlu: profiles.role = admin | editor ve is_staff() ikisine de
-- her şeyi açıyor. Bu göç, kişiye göre modül izni ekler ("birisi sadece Villalar,
-- birisi Rezervasyonlar").
--
-- İzin uygulama katmanlarında zorlanır (sayfa + action guard'ları). RLS bilerek
-- is_staff()'te kalır: "Talepler" ve "Rezervasyonlar" aynı tabloyu (booking_requests)
-- paylaşır, "Takvim" birden çok tabloya dokunur → modül-bazlı RLS pratik değil. RLS
-- tüm personel-DIŞI erişimi zaten kesiyor (docs/panel-kurallari.md güncellendi).
--
-- Çalıştırma: Supabase > SQL Editor > bu dosyanın tamamını yapıştır > Run

-- ---------------------------------------------------------------
-- 1) İzin kolonu + denormalize e-posta
-- ---------------------------------------------------------------
-- permissions: erişilebilen modül anahtarları. Boş = izin yok. 'admin' rolü bu
-- listeyi yok sayar (her şeye erişir; kontrol uygulama katmanında).
alter table profiles
  add column if not exists permissions text[] not null default '{}';

-- E-posta profiles'a kopyalanır: personel listesini auth.admin API'sine gitmeden
-- göstermek için. Kaynak yine auth.users; bu yalnızca gösterim kopyası.
alter table profiles
  add column if not exists email text;

-- ---------------------------------------------------------------
-- 2) Geriye dönük uyum
-- ---------------------------------------------------------------
-- Mevcut editörler bu göçle yetkisiz kalmasın → tüm modüller verilir. Adminler
-- etkilenmez (rol zaten her şeyi kapsıyor). Yalnızca izni hiç atanmamış (boş)
-- editörlere dokunulur; sonradan admin tarafından daraltılabilir.
update profiles
set permissions = array[
  'villas','reservations','applications','regions','categories','pages','settings'
]
where role = 'editor'
  and (permissions is null or cardinality(permissions) = 0);

-- E-posta backfill (auth.users'tan).
update profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or p.email = '');

-- NOT: profiles'a yeni RLS politikası eklenmez. Personel yazma işlemleri (kullanıcı
-- oluşturma/silme/şifre) admin-doğrulamalı service_role ile yapılır — auth.admin.*
-- zaten service_role gerektirir. Mevcut "own profile read / is_staff" politikası korunur.
