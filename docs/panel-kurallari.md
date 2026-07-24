# Yönetim Paneli — Güvenlik ve Tasarım Kuralları

Bu doküman `/yonetim` panelinin **değişmez kurallarını** tanımlar. Üç garanti verir:
**(1) dışarıdan kimse giremez, (2) veri sızmaz, (3) veri bozulmaz/kaybolmaz** — üstüne
modern ve kolay yönetilebilir bir arayüz. Panelle ilgili her PR bu dokümana uymak zorundadır.

> Genel mimari kurallar için [ARCHITECTURE.md](../ARCHITECTURE.md). Bu doküman onun panele
> özel, sıkılaştırılmış uzantısıdır.

---

## 1. Erişim güvenliği — "dışarıdan kimse giremez"

Güvenlik **tek bir kontrole** değil, üst üste **dört katmana** dayanır (defense in depth).
Bir katman aşılsa bile bir alttaki durdurur.

### Katman 1 — `proxy.ts` (iyimser kapı)
- `/yonetim/*` isteklerinde oturum çerezi yoksa `/yonetim/giris`'e yönlendirir.
- Oturumu tazeler (token yenileme).
- **Tek başına güvenlik DEĞİLDİR** — sadece hızlı ön eleme. Asıl kontrol aşağıda.

### Katman 2 — Panel düzeni (sunucu tarafı)
- `/yonetim/layout.tsx` sunucuda `getStaffUser()` çağırır; sonuç `null` ise render etmez,
  girişe yönlendirir. Tüm panel sayfaları bu düzeni miras alır.

### Katman 3 — Her Server Action / veri fonksiyonu
- Her admin action'ın **ilk satırı** `getStaffUser()` kontrolüdür. "Sayfa zaten kontrol
  etti" varsayımına GÜVENİLMEZ — action doğrudan çağrılabilir.
- Kontrol başarısızsa işlem yapılmadan döner.

### Katman 4 — Veritabanı (RLS) — nihai bariyer
- Tüm uygulama kodu bypass edilse bile Postgres RLS politikaları (`is_staff()`) yetkisiz
  yazmayı/okumayı reddeder. Bu son savunma hattıdır.
- **Panel, `service_role` KULLANMAZ.** Panel işlemleri giriş yapan kullanıcının
  oturumuyla (çerez tabanlı `@supabase/ssr` istemcisi) çalışır; böylece RLS her istekte
  devrededir. (`service_role` yalnızca herkese açık rezervasyon formunda kalır — Faz 4.)

### Kimlik ve oturum
- **Kayıt kapalı, davet usulü.** Kullanıcıları yalnızca admin ekler; kimse kendi kendine
  hesap açamaz. (Supabase: "Allow new users to sign up" kapalı.)
- Oturum çerezleri **httpOnly + Secure + SameSite** — token asla JavaScript'e açılmaz,
  XSS ile çalınamaz.
- Giriş: e-posta + şifre (`signInWithPassword`). Şifreler Supabase'de hash'li tutulur,
  bizim tarafta hiçbir yerde saklanmaz/loglanmaz.
- **Kaba kuvvet koruması:** giriş formunda deneme sınırı + gerekirse Turnstile.
- `/yonetim` yollarına `noindex` (robots) — arama motorlarına düşmez, dışarıya link verilmez.

### Rol ayrımı (yetki kademesi)
- `admin` > `editor` > `viewer`. RLS ve action guard'ları rolü doğrular.
- **Rol yükseltme (privilege escalation) engeli:** `profiles.role` yalnızca admin tarafından
  değiştirilebilir; bir kullanıcı **kendi rolünü değiştiremez**. (Şu an `profiles`'a API'den
  yazma politikası yok → rol ataması yalnızca yönetimsel yolla yapılır; bu bilinçli.)
- Rol bazlı yetkiler netleşince RLS'te ayrıştırılır (ör. silme yalnızca admin).

---

## 2. Gizlilik — "veri sızmaz"

Panelde müşteri **PII'si** (telefon, e-posta, ad) var. Sızıntı yüzeyini sıfıra indir.

- **`service_role` anahtarı** yalnızca sunucuda, `NEXT_PUBLIC_` ile başlamaz, `server-only`
  ile korunur. İstemci paketine asla girmez. (ARCHITECTURE.md §2.)
- **Oturumlu istemci + RLS** sayesinde bir kod hatası bile staff yetkisinin ötesine veri
  çekemez — RLS sınırı zorlar.
- **Alan seçimi (DTO):** sorgularda yalnızca gereken sütunlar seçilir. Ham satırlar,
  gereksiz alanlarla istemciye gönderilmez. PII yalnızca gerektiği ekranda, gerektiği kadar.
- **URL / log / hata mesajı:** PII asla URL'de (query string) veya logda taşınmaz.
  İstemciye dönen hatalar **genel** ("İşlem başarısız"); ayrıntılı hata yalnızca sunucu logunda.
- **Stack trace / iç detay** istemciye sızmaz.
- **CSRF:** Next Server Action'ların origin kontrolü açık kalır.
- **Güvenlik başlıkları + CSP** (Faz 6/7): oturum çalmaya yönelik XSS/enjeksiyon yüzeyini kapatır.
- **Storage:** `villa-images` public-read'dir (fotoğraflar zaten herkese açık), ama yükleme
  staff'e kapalı. Public bucket'a **asla** özel veri konmaz.

---

## 3. Bütünlük — "veri bozulmaz, kaybolmaz"

- **Kalıcı silme YOK (soft delete):**
  - Villa silinmez, `status='archived'` olur.
  - Rezervasyon talebi silinmez, `status='cancelled'` olur.
  - Böylece geçmiş (audit izi) korunur, yanlış tıklama veri kaybettirmez.
- **Sınırda doğrulama + DB kısıtları (çift kemer):** her yazmada Zod; üstüne DB'deki
  `check`, `foreign key`, `unique`, tarih `exclude` (GIST) kısıtları son savunma.
  Uygulama hata yapsa bile DB tutarsız veriyi reddeder.
- **Çok adımlı işlemler atomik:** ör. talebi "onayla → `villa_blocks` ekle" tek bütün olarak
  yapılır; blok yazılamazsa talep de onaylanmış sayılmaz (transaction/RPC veya sıralı + geri alma).
- **Eşzamanlı düzenleme:** iki editör aynı villayı düzenlerse son yazan kazanır ve veri
  kaybolabilir → `updated_at` kontrolü ile "bu kayıt değişti" uyarısı (veya küçük ekipte
  bilinçli kabul; kararı belgele).
- **Yıkıcı işlemlerde onay:** arşivleme, görsel silme, talep iptali → açık "emin misiniz?" adımı.
- **Çift gönderim koruması:** form gönderilirken buton kilitlenir (pending durumu).
- **Yedekler:** canlıya gerçek veriyle çıkınca Supabase Pro günlük yedek (+ mümkünse PITR) — Faz 7.
- **(Opsiyonel, kurumsal)** Denetim kaydı (audit log): kim, neyi, ne zaman değiştirdi —
  ayrı bir tabloda. İz sürülebilirlik için önerilir.

---

## 4. Tasarım — "modern ve kolay yönetilebilir"

- **Yerleşim:** solda daraltılabilir menü, üstte kullanıcı + çıkış, ortada içerik. Herkese
  açık header/footer paneldede YOK (ayrı, sade admin düzeni).
- **Marka uyumu:** sitenin renk/biçim dili (brand/sun/sand, yuvarlatılmış kartlar) ama
  panelde daha yoğun ve sakin — iş ekranı gibi.
- **Geri bildirim:** her işlemde toast (başarı/hata), yükleniyor durumu, buton kilitleme.
- **Listeler:** sıralama, filtre, çok kayıtta sayfalama; net durum rozetleri.
- **Formlar:** hata mesajları alan altında satır içi; kaydedilmemiş değişiklik uyarısı.
- **Duyarlı (responsive):** tablet/telefonda çalışır — acente telefondan da yönetebilmeli.
- **Erişilebilirlik:** etiketler, odak halkaları, klavye ile gezinme, yeterli kontrast.
- **Boş durumlar / onay diyalogları / net durum renkleri** hep bulunur.

---

## 5. Panel PR kontrol listesi

Panelle ilgili her değişiklik yayına gitmeden önce:

- [ ] Yeni sayfa layout'un yetki kontrolünü miras alıyor mu?
- [ ] Yeni Server Action ilk satırında `getStaffUser()` çağırıyor mu?
- [ ] İşlem oturumlu istemciyle mi (RLS devrede), `service_role` sızmadı mı?
- [ ] Yazma girişi Zod ile doğrulandı mı? DB kısıtı var mı?
- [ ] İstemciye dönen veri minimal mi (gereksiz PII/sütun yok)?
- [ ] Hata mesajı istemciye genel, sunucuda detaylı mı?
- [ ] Yıkıcı işlemde onay + soft delete uygulandı mı?
- [ ] Yazma sonrası `revalidatePath` ile ilgili sayfa tazelendi mi?
- [ ] `/yonetim` yolu `noindex` mi?
