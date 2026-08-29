# Yönetim Paneli — Güvenlik ve Tasarım Kuralları

Bu doküman `/yonetim` panelinin **değişmez kurallarını** tanımlar. Üç garanti verir:
**(1) dışarıdan kimse giremez, (2) veri sızmaz, (3) veri bozulmaz/kaybolmaz** — üstüne
**kurumsal mimari** (modüler, bakımı kolay, ölçeklenebilir) ve modern, kolay yönetilebilir
bir arayüz. Panelle ilgili her PR bu dokümana uymak zorundadır.

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

### Granüler modül izinleri (Faz — personel yönetimi)
- `profiles.permissions text[]` her personelin erişebildiği **modül** listesini tutar
  (`villas`, `reservations`, `applications`, `regions`, `categories`, `pages`, `settings`).
  Tek kaynak: `src/lib/auth/permissions.ts` (`MODULE_KEYS`, `can()`). **admin** rolü listeyi
  yok sayar (hepsine erişir). **Personel** ekranı yalnızca `admin`e açıktır (izinle verilmez).
- **İzin nerede zorlanır:**
  - **Katman 2 (sayfa):** her modül klasöründe `layout.tsx` → `requireModule(key)`; izinsiz
    personel `/yonetim`'e döner. Nav (`AdminShell`) yalnızca izinli öğeleri gösterir.
  - **Katman 3 (action):** her admin action ilk satırda `requirePermission(key)` çağırır
    (dosya→modül birebir; `bookings.ts`→`reservations`, `villas/images/bulk`→`villas`, …).
  - **Katman 4 (RLS):** **bilerek `is_staff()`'te kalır** (modül-bazlı değil). Neden: Talepler
    ve Rezervasyonlar aynı tabloyu (`booking_requests`) paylaşır, Takvim birden çok tabloya
    dokunur → temiz modül-tablo eşlemesi yok. RLS tüm **personel-dışı** erişimi keser; personel-
    **içi** ayrım küçük/güvenilir ekip için app katmanında (2+3) yeterli. Büyürse RLS'e taşınır.
- **`service_role` istisnası (yalnızca personel yönetimi):** kullanıcı oluşturma/silme/şifre
  `auth.admin.*` gerektirdiğinden `src/lib/actions/admin/staff.ts` `service_role` kullanır —
  **her action önce `role==='admin'` doğrular.** Panelin başka hiçbir yeri `service_role`
  kullanmaz. (Genel kural: panel oturumlu istemci + RLS ile çalışır.)
- **Kilitlenme koruması (değişmezler):** son admin editöre düşürülemez/silinemez; admin kendi
  rolünü düşüremez ve kendini silemez. Bu kontroller staff action'larında zorlanır.

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
  > **Karar (05.08.2026) — villa formunda kontrol uygulandı.** Form açılışta okuduğu
  > `updated_at`'i kaydederken geri gönderir; `updateVilla` bunu `WHERE`'e koyar. Satır o
  > sırada başkası tarafından değiştirilmişse güncelleme hiçbir satırla eşleşmez, yazma
  > sessizce kaybolmak yerine "başka bir yerden kaydedilmiş" uyarısıyla reddedilir.
  > Aynı kapsamda: sekmeler `hidden` ile ayakta tutulduğundan form bileşeni unmount olmuyor
  > ve tazelenen veriyi almıyordu — kullanıcı hiçbir alana dokunmadıysa artık kendiliğinden
  > alıyor, dokunduysa yazdıkları korunuyor.
  > Kategori/sezon/site ayarları formlarında **bilinçli olarak uygulanmadı**: tek editörle
  > çakışma olasılığı düşük, kayıp da villa kaydı kadar pahalı değil. Ekip büyürse aynı desen
  > oraya taşınır.
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

## 5. Kurumsal mimari — modüler, bakımı kolay, ölçeklenebilir

Panel, "bir özellik eklerken başkasını bozmayan" ve yeni gelen yazılımcının hızlı
kavrayacağı biçimde kurulur. Her modül aynı katman desenini izler; ortak parçalar tek
yerde durur.

### Katmanlar (her panel modülü aynı deseni izler)
```
Sayfa (app/yonetim/**)        → routing + ince sunucu bileşeni; yetki + veri çeker
  ├─ Okuma:  lib/data/admin/**   → oturumlu istemci (RLS), sadece gereken sütunlar
  ├─ Yazma:  lib/actions/admin/** → Server Action; guard + Zod + revalidate
  ├─ Şema:   lib/schemas/**       → Zod (istemci + sunucu tek kaynak)
  └─ Sunum:  components/admin/**  → veriyi prop alır, kendi veri çekmez
```

### Klasör yapısı (öngörülebilir — herkes nerede ne olduğunu bilir)
```
app/yonetim/
  layout.tsx            # yetki kontrolü + admin kabuk (menü, üst bar)
  giris/page.tsx        # giriş
  talepler/page.tsx     # her özellik kendi klasöründe, izole
  villalar/page.tsx  villalar/[id]/page.tsx
  bolgeler/  kategoriler/  ...
lib/
  auth/                 # getStaffUser(), oturum yardımcıları
  supabase/
    server.ts           # anon (herkese açık okuma)
    session.ts          # çerezli oturum istemcisi (PANEL bunu kullanır)
    admin.ts            # service_role (yalnızca herkese açık form; panel KULLANMAZ)
  data/admin/           # bookings.ts, villas.ts ... (okuma)
  actions/admin/        # bookings.ts, villas.ts ... (yazma, "use server")
  schemas/              # booking.ts, villa.ts ... (Zod) + fieldErrors.ts
  slugify.ts            # ortak yardımcılar (kopyalanmaz)
components/admin/
  ui/                   # tasarım sistemi — ilkeller, özellik bilgisi taşımaz
    styles.ts           #   input/buton/kart sınıfları, kontrast alt sınırı
    Toast.tsx           #   ToastProvider + useToast
    ConfirmDialog.tsx   #   ConfirmProvider + useConfirm (window.confirm YOK)
    FormField.tsx       #   Field (etiket + zorunluluk + hata) + Section
    StatusBadge.tsx     #   durum rozeti
    PageHeader.tsx      #   PageHeader + BackLink + EmptyState
    SaveBar.tsx         #   yapışkan kaydet çubuğu
    useUnsavedGuard.ts  #   kaydedilmemiş değişiklik uyarısı
  *.tsx                 # özellik bileşenleri (VillaForm, ImageManager, …)
```

**Kural:** yeni bir input/buton/rozet/onay/bildirim ihtiyacı çıktığında önce
`components/admin/ui/` içine bakılır. Orada yoksa oraya eklenir — özellik
bileşeninin içine gömülmez. Toast ve onay diyaloğu sağlayıcıları `AdminShell`
içinde mount edilir, tüm panel ekranları erişir.

### İlkeler
- **Özellik izolasyonu:** Talepler, Villalar, Kategoriler ayrı modüllerdir. Birini
  değiştirmek diğerinin dosyalarına dokunmayı gerektirmez. Modüller birbiriyle **yalnızca
  tiplenmiş fonksiyon/prop arayüzü** üzerinden konuşur (ARCHITECTURE.md §9).
- **DRY / tasarım sistemi:** tablo, form alanı, durum rozeti, onay diyaloğu, toast **bir kez**
  `components/admin/` altında yazılır ve her yerde yeniden kullanılır. Kopyala-yapıştır yok.
- **Uçtan uca tip güvenliği:** DB tipleri → veri katmanı → action → bileşen aynı tiplerle
  akar. (İleride `supabase gen types` ile DB'den tip üretimi — tek doğruluk kaynağı.)
- **Saf mantık ayrı:** iş kuralları (fiyat, doğrulama, uygunluk) IO'dan ayrı saf
  fonksiyonlardadır → birim test edilebilir, panelden bağımsız (bkz. `pricing.ts`, `schemas/`).
- **Tutarlı hata sözleşmesi:** action'lar tek tip sonuç döndürür
  (`{ ok: true, ... } | { ok: false, error }`); istemci bunu tek biçimde işler.
- **Ölçeklenebilirlik:** listeler **sunucu tarafı** filtre + sayfalama kullanır (villa/talep
  sayısı büyüyünce yavaşlamasın); sık sorgulanan sütunlarda DB index'i.
- **Sihirli sabit yok:** ücret/oran gibi değerler koda gömülmez, veriden gelir
  (ör. temizlik bedeli villa kaydında — Faz 4'te taşındı).
- **Migration disiplini:** şema değişikliği yalnızca `supabase/migrations/` dosyasıyla,
  Studio'dan elle değil (ARCHITECTURE.md §8).

## 6. Panel PR kontrol listesi

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
- [ ] Modül izole mi (başka modülün dosyasına dokunmadan eklendi mi)?
- [ ] Ortak UI parçası tekrar yazılmadı, `components/admin/`'den mi kullanıldı?
- [ ] Liste sunucu tarafı filtre + sayfalama kullanıyor mu (ölçek)?
