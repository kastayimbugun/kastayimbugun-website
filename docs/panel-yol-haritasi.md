# Yönetim Paneli — Denetim Raporu ve Yol Haritası

Hazırlanma tarihi: 04.08.2026
Kapsam: `/yonetim` paneli (12 sayfa, 12 bileşen, 7 action, 6 veri modülü — ~4.800 satır)
Yöntem: (1) kodun `docs/panel-kurallari.md` §4–§5'e karşı denetimi, (2) sektör referans
panellerinin araştırması (Lodgify, Guesty, Hostaway, Smoobu, Beds24, OwnerRez, Uplisting,
Hostfully, Airbnb Host, Booking.com Pulse, Vrbo + Türkiye: Agentsoft, GoİzDigital, Travsis).

> Bu belge `docs/panel-kurallari.md`'nin (değişmez kurallar) yerine geçmez, onun **uygulanma
> durumunu** ölçer ve eksikleri iş sırasına dizer. Kural değişikliği gerekirse önce o belge
> güncellenir.

---

## 0. Eski sistemle (kaspanel26) kıyas — 04.08.2026

Acentenin önceki, gerçek verili sitesinin (hazır şablon panel) ekran görüntüleri incelendi.
Orada olup bizde olmayan iki özellik eklendi; üçüncüsü **kritik bir go-live ön koşulu**
olarak not edildi (henüz yapılmadı — bilinçli olarak sona bırakıldı, villa/rezervasyon
alanları bitmeden veri göçü anlamsız).

**Eklenenler:**
- **Ödeme/depozito takibi** — `booking_requests`'e `paid_amount`, `damage_deposit`,
  `deposit_note` (`0004_booking_payments.sql`). Online ödeme entegrasyonu DEĞİL (o Faz 8) —
  acente banka transferiyle kapora alıyor, panelden elle kaydediyor. Talepler listesinde
  her satırda "Ödenen ₺X" + tek tıkla düzenleme (`BookingRow.tsx`).
- **Rezervasyon konfirmasyon sayfası** — `/yonetim/talepler/[id]/konfirmasyon`, eski
  sistemdeki PDF'in karşılığı: misafir + villa + tarih + tutar/ödeme/depozito özeti +
  giriş-çıkış kuralları + villa evcil hayvan kabul etmiyorsa uyarı. `PrintButton.tsx` ile
  tarayıcının "PDF olarak kaydet"i kullanılıyor — ayrı bir PDF kütüphanesi gerekmedi.
  `AdminShell`'e `print:hidden` eklendi (menü/üst bar çıktıya karışmasın).

**🔴 Kritik — yayına çıkmadan önce yapılmalı:** Eski sistemde ileri tarihli, gerçek onaylı
100+ rezervasyon var (ör. 2026-08-25 – 2026-08-31). Bunlar yeni sisteme `villa_blocks`
kaydı olarak aktarılmadan yayına geçilirse, aynı tarihlere ikinci bir talep onaylanabilir —
**çift rezervasyon**. Villa adı + tarih eşleştirmesiyle tek seferlik bir aktarım scripti
gerekiyor; villalar panelde tam girildikten sonra yapılacak.

**Talepler / Rezervasyonlar ayrımı ✅ TAMAM (04.08.2026).** Kullanıcı isteği üzerine:
tek tablo (`booking_requests`), iki görünüm — veri iki tabloya bölünmedi, çünkü onaylama/
iptal mantığı zaten tek satır üzerinde çalışıyor; bölmek senkron riski yaratırdı.
- `/yonetim/talepler` artık **Onaylandı**'yı göstermez (Yeni/Görüşüldü/İptal) — bir talep
  onaylanınca otomatik olarak Rezervasyonlar'a "geçmiş" gibi görünür. Arama yapılırken bu
  sınır kalkar (eski/onaylı müşteriyi ararken durum engeli olmasın).
- Yeni sayfa `/yonetim/rezervasyonlar` — yalnızca **Onaylandı**, varsayılan sıralama
  Talepler'in tersine **en yakın giriş tarihi** (yeni talep değil, "kim geliyor" sorusuna cevap).
- **Manuel rezervasyon girişi** (`/yonetim/rezervasyonlar/yeni`) — telefonla gelen
  rezervasyon talep aşamasını atlayıp doğrudan onaylı olarak açılabiliyor. Villa fiyatına
  göre tutar öneriliyor (`calcPrice` — public sitedeki fiyat hesabıyla aynı saf fonksiyon,
  panel için `PricingInput` adıyla daraltıldı), staff isterse elle değiştirebiliyor.
  İki yazma (talep + takvim bloğu) atomik ele alınıyor: takvim çakışması olursa talep
  kaydı geri siliniyor, yetim satır kalmıyor.
- Menüye "Rezervasyonlar" eklendi, dashboard'daki bugün giriş/çıkış kartları oraya bağlandı.

**Kullanılmayacaklar (bilinçli karar):** "Sayfalar" (statik içerik) modülü kopyalanmadı —
başlıkları ("Denize Yakın Villa", "Havuz Isıtmalı Villa" vb.) Faz 6 bölge/kategori sayfası
planlamasında anahtar kelime girdisi olarak kullanılacak, ama tam bir sayfa-editörü inşa
etmek §5 "yapmayın" ilkesiyle çelişir. Yalnızca zaman zaman değişen hukuki metinler
(KVKK, Çerez Politikası) Faz 6'da editable olacak.

---

## 1. Teşhis

Panel **işlevsel olarak tamam** — Faz 5.0–5.5'te vaat edilen her modül çalışıyor. Sorun
eksik özellik değil, **olgunluk**. İki ayrı boşluk sınıfı var ve karıştırılmamalı:

**A. Kendi kurallarına karşı borç.** `docs/panel-kurallari.md` §4 ve §5'te yazılı olan ama
kodda karşılığı olmayan şeyler. Bunlar "iyi olurdu" değil, **yazılı taahhüdün ihlali** ve
bir kısmı veri kaybettiriyor.

**B. Sektöre karşı boşluk.** Panel bugün bir *veri giriş aracı*. Sektördeki muadilleri
*operasyon aracı* — "bugün ne yapmam lazım" sorusuna cevap veriyorlar. Bu, acentenin günlük
kullanımını belirleyen fark.

### Neyin iyi olduğu (korunacak)

Bunlar sağlam kurulmuş, dokunulmamalı:

- **Katman disiplini kusursuz.** Hiçbir `components/admin/*` dosyası Supabase import etmiyor.
  Her Server Action ilk satırında `getStaffUser()` çağırıyor (`villas.ts:73`, `bookings.ts:23`,
  `images.ts:32`, `categories.ts:40`, `regions.ts:38`, `site.ts:31`). ARCHITECTURE.md §1/§4 ihlali yok.
- **Çift gönderim koruması istisnasız her formda** (`disabled={pending}` — 8 dosya).
- **Talepler ekranı** filtresi sunucu tarafında ve URL'de (`talepler/page.tsx:28-39`) —
  paylaşılabilir, geri tuşu çalışır, Zod ile doğrulanıyor. Panelin en olgun ekranı.
- **Talep durumu iyimser güncelleme + hata halinde geri alma** (`BookingStatusSelect.tsx:34-46`).
- **Takvim editörü** (`BlockEditor.tsx`) sitedeki `AvailabilityCalendar`'ı yeniden kullanıyor,
  dolu günün üstünde "kime kapatıldı" notu çıkıyor.
- **Görsel hattı**: istemcide boyut ön elemesi, sunucuda EXIF temizliği, DB kaydı başarısızsa
  Storage dosyasının geri alınması (`images.ts:85-89`).
- **Hata sözleşmesi tutarlı**: tüm action'lar `{ok:true} | {ok:false, error}` döndürüyor.

### Kök neden: ortak bileşen katmanı hiç yazılmamış

`panel-kurallari.md:147` altı ortak bileşen vaat ediyor. **Altısından biri bile yok:**

| Vaat | Durum | Sonucu |
|---|---|---|
| `AdminTable` | ❌ | Her liste elle `<ul>/<li>` grid |
| `FormField` | ❌ | `VillaForm.tsx:78-94`'te yerel `Field`, dışa açılmamış |
| `StatusBadge` | ❌ | `statusMeta` iki dosyada kopya |
| `ConfirmDialog` | ❌ | 3 yerde `window.confirm`, 5 yerde hiç onay yok |
| `Toast` | ❌ | Grep `Toast\|sonner\|react-hot-toast` → 0 sonuç |
| `AdminNav` | ⚠️ | `AdminShell.tsx:19-26` içine gömülü, aktif durum yok |

Ölçülebilir sonuçları:

- Aynı input CSS dizesi **9 yerde**, üçü birbirinden farklı — stil zaten sürüklenmeye başlamış
- `slugify` **3 dosyada kopya** (`VillaForm:136`, `CategoryForm:21`, `RegionsManager:18`),
  üçünde de aynı hata: `İ` ele alınmıyor → "İzmir Villa" → `zmir-villa`
- Toast yerine **3 ayrı geri bildirim dili**: yapışkan yeşil yazı / satır içi hata / `window.alert`
- Yapışkan kaydet çubuğu 18 satır birebir kopya (`VillaForm:331-348` = `CategoryForm:168-185`)
- `revalidateVilla` kopyası davranış farkı yaratmış: görsel eklenince ana sayfa tazeleniyor,
  villa kaydedilince tazelenmiyor (`villas.ts:22-33` vs `images.ts:19-28`)

Bu tek kök neden, aşağıdaki 45 bulgunun yaklaşık üçte birini besliyor.

---

## 2. Sektör kıyası — panel nerede duruyor

Araştırmanın en net çıkarımı: **Türkiye'de bu segmentte modern, mobil öncelikli, "bugün ne
yapmam lazım" odaklı bir panel yok.** Yerli ürünler (Agentsoft, GoİzDigital, Travsis)
acente-merkezli ve muhasebe ağırlıklı (cari, komisyon, fatura); dashboard/UX tarafı zayıf.
Yani kıyaslanacak referans yerli rakip değil, **Airbnb Host ve Booking.com Pulse'un mobil
deneyimi**.

| Sektör standardı | Bizde | Boşluk |
|---|---|---|
| Ana ekran = bugünkü giriş/çıkış + bekleyen iş | 3 sayaç (yeni talep, toplam villa, yayında villa) | **Büyük** |
| Multi-calendar (satır=villa, sütun=gün, tek ekran) | Villa başına ayrı takvim sayfası | **Büyük** |
| Talep = satış hattı (aşamalar + iletişim geçmişi) | 4 durumlu select, not alanı yok | **Büyük** |
| Yanıt süresi ölçümü | Yok | Orta |
| Fiyat kuralları (hafta sonu, LOS indirimi, son dakika) | Sadece sezon fiyatı | Orta |
| Tarih aralığı + çoklu villa toplu güncelleme | Yok | Orta |
| İlan kalite skoru (Booking Property Page Score) | Yok | Orta |
| Sürükle-bırak yükleme + kapak seçimi | Yukarı/aşağı ok butonları | Orta |
| Mobil kullanım | **Menü tamamen gizli** — panel telefonda kullanılamıyor | **Büyük** |

Sektörden iki sayısal dayanak:

- **Booking.com Property Page Score:** %100 skorlu ilanlar, eksik içerikli ilanlara göre
  **%18'e kadar daha fazla rezervasyon** alıyor. Yüzdelik skor + "şunu ekle" listesi, teknik
  bilgisi düşük kullanıcıyı eğitim gerektirmeden doğru davranışa itiyor.
- **Yanıt süresi:** 1 saat içinde yanıt verenlerde dönüşüm oranı ~%25 daha yüksek. Bağımsız
  operatörlerde medyan yanıt süresi 2–8 saat; taleplerin %30'undan fazlası aynı gün yanıtlanmıyor.

Sektörün en yaygın **şikayeti** de kayda değer, çünkü bizi neyden koruyacağını söylüyor:
"dik öğrenme eğrisi" (Hostaway, Beds24, Guesty), "karmaşık fiyat kurulumu" (Lodgify — 117
yorumun %60'ı olumsuz), "raporlama sezgisel değil". Yani **özellik eklemek her zaman iyi değil**;
bkz. §5.

---

## 3. Yapılacaklar — dalgalar

Dalgalar sırayla yapılmalı: her biri bir sonrakini ucuzlatıyor.

### Dalga 0 — Kanamayı durdur ✅ TAMAM (04.08.2026)

Bunlar hata düzeltmesi, iyileştirme değil. Veri kaybettiren veya yanlış bilgi veren şeyler.
Sıralama tersine çevrildi: önce Dalga 1'in ortak bileşenleri yazıldı, Dalga 0 düzeltmeleri
onların üstüne kuruldu (görsel silme onayı zaten `ConfirmDialog` istiyordu).

| # | İş | Referans |
|---|---|---|
| 0.1 | **Mobil menü.** Sol menü `sm:` altında tamamen gizli, yerine hiçbir şey yok. Telefondan panele giren acente açtığı sayfada kilitli kalıyor. Hamburger veya alt sekme çubuğu ekle. `panel-kurallari §4` ihlali | `AdminShell.tsx:43` |
| 0.2 | **Görsel silmede onay.** Onaysız çalışıyor, hem DB satırını hem Storage dosyasını kalıcı siliyor, geri dönüş yok. Buton yukarı/aşağı oklarının hemen yanında. `panel-kurallari §3` ismen yasaklamış | `ImageManager.tsx:150`, `images.ts:107-117` |
| 0.3 | **Görsel işlemlerinin sonucunu oku.** `remove`, `move`, `saveAlt` action'dan dönen `{ok:false}` sonucunu hiç kontrol etmiyor. Oturum düşse/RLS reddetse kullanıcı hiçbir şey görmüyor, `router.refresh()` eski değeri geri getiriyor → sessiz veri kaybı | `ImageManager.tsx:62,75,84` |
| 0.4 | **Talep durumu değişiminde onay.** "Onaylandı" takvime blok yazıyor, "İptal" o bloğu **siliyor** (tarihler siteye tekrar açılıyor). Düz select, uyarı yok → yanlış tıklama = çift rezervasyon riski | `BookingStatusSelect.tsx:52`, `bookings.ts:49-72` |
| 0.5 | **`getBookingCounts` sayımını düzelt.** 4 rozet sayısı için tüm tablo çekilip JS'te sayılıyor. Supabase `max-rows` (tipik 1000) sınırına takılırsa sayı **sessizce yanlış** olur. `count:"exact", head:true` deseni `stats.ts:17-27`'de zaten doğru yazılmış | `bookings.ts:84-96` |
| 0.6 | **`CategoryForm` yalancı başarı mesajı.** `setCategoryVillas` sonucu atılıyor, "Kaydedildi." koşulsuz yazılıyor. Villa ataması başarısız olsa da başarı görünüyor. Ayrıca iki yazma atomik değil (`§3` ihlali) | `CategoryForm.tsx:81-85` |
| 0.7 | **Bayat dashboard metni.** Ana ekranda hâlâ "Talep, villa, bölge ve kategori yönetimi sonraki adımlarda eklenecek" yazıyor — hepsi bitti | `(panel)/page.tsx:54-56` |
| 0.8 | **Villalar listesinde boş durum yok.** Diğer 6 listede var, panelin en önemli listesinde yok — boş beyaz kart | `villalar/page.tsx:36-68` |
| 0.9 | **Menüde aktif sayfa vurgusu yok.** `usePathname` grep → 0 sonuç. Kullanıcı nerede olduğunu `<h1>`'den anlıyor | `AdminShell.tsx:55-62` |
| 0.10 | **`loading.tsx` / `error.tsx` yok.** Menüden tıklayınca sunucu sorgusu bitene kadar ekran donmuş görünüyor. Veri katmanı hata fırlatınca Next'in çıplak hata sayfası çıkıyor | `src/app/yonetim/**` |
| 0.11 | **`/yonetim` `noindex` değil.** `panel-kurallari §1:47` ve §6 kontrol listesi istiyor | `robots` grep → 0 |
| 0.12 | **`slugify` `İ` hatası** — 3 kopyanın üçünde de var. Dalga 1'de tekleşecek ama hata şimdi düzeltilmeli | `VillaForm:139` |
| 0.13 | Ölü kod: `setVillaStatus` hiç çağrılmıyor (21 satır), menüdeki "yakında" dalı hiç çalışmıyor (13 satır) | `villas.ts:121`, `AdminShell.tsx:63-75` |

### Dalga 1 — Ortak bileşen katmanı ✅ TAMAM (04.08.2026)

`panel-kurallari.md:147`'nin vaat ettiği altı bileşeni yaz. **Bu dalga tek başına 10+ ayrı
bulguyu kapatıyor**, çünkü hepsi aynı kök nedenden geliyor.

| # | Bileşen | Kapattığı bulgular |
|---|---|---|
| 1.1 | `Toast` (+ `useToast`) | 3 farklı geri bildirim dili; 4 işlemde hiç başarı bildirimi olmaması (`ImageManager`, `SeasonEditor`, `BlockEditor`, `RegionsManager`); başarı mesajının hiç temizlenmemesi (`VillaForm:156`) |
| 1.2 | `ConfirmDialog` | 3 `window.confirm` + 1 `window.alert`; onaysız yıkıcı işlemler (villa arşivleme, sezon silme, görsel silme) |
| 1.3 | `FormField` | 9 kopya input sınıfı; zorunlu alan işareti (`*`, `aria-required`) yokluğu; etiketsiz alanlar (`SeasonEditor:107-126`, `BlockEditor:158`, `ImageManager:121`, `SiteSettingsForm:74`); alan altı hata mesajı yeri |
| 1.4 | `StatusBadge` | `statusMeta` kopyası (`villalar/page.tsx:8` = `villalar/[id]/page.tsx:18`) |
| 1.5 | `AdminTable` | 10 sayfa başlık kopyası, 4 "Geri" linki kopyası, boş durum tutarsızlığı, tablo semantiği |
| 1.6 | `AdminNav` | Aktif sayfa vurgusu (0.9 buraya taşınabilir), mobil menü (0.1 buraya taşınabilir) |
| 1.7 | **Alan bazlı hata mesajları.** Zod şeması Türkçe mesajları zaten yazmış (`adminVilla.ts:45-82`: "Bölge seçin", "SS:DD biçiminde", "Küçük harf, rakam ve tire"). Action `parsed.error`'ı atıyor (`villas.ts:77`), istemci tek cümleye indiriyor (`VillaForm.tsx:166`). 47 kontrollü formda hangi alanın hatalı olduğu söylenmiyor — **yazılmış mesajlar ölü kod** | `villas.ts:77`, `VillaForm.tsx:166` |
| 1.8 | **Kaydedilmemiş değişiklik uyarısı.** `beforeunload\|isDirty` grep → 0. 47 alan doldur, menüden başka sayfaya tıkla → hepsi gider. `panel-kurallari §4:108` istiyor | Panel geneli |
| 1.9 | **`<form>` semantiği.** `VillaForm`/`CategoryForm` `<form>` kullanmıyor, kaydet düz `<button onClick>`. Metin alanındayken **Enter çalışmıyor**. `giris/page.tsx:22` doğru yapıyor | `VillaForm.tsx:341` |
| 1.10 | **Kontrast düzeltmesi.** `text-brand-900/55` ≈ 3.1:1, `/45` ≈ 2.5:1, `/40` ≈ 2.2:1 — hepsi WCAG AA (4.5:1) altında. En kötüsü talepler sütun başlıkları: 11px + 2.2:1. Odak halkası `brand-100` (#fdecce) beyazda görünmez. PLAN.md:412 hedefi "Erişilebilirlik ≥ 90" bu skalayla geçilemez | `globals.css:8,12` |

### Dalga 2 — Günlük operasyon (~2 gün)

Panelin "veri giriş aracı"ndan "operasyon aracı"na dönüştüğü yer. Sektör araştırmasının
en yüksek getirili üç maddesi burada.

**2.1 — Dashboard'ı "Bugün" ekranına çevir ✅ TAMAM (04.08.2026)**
*Esin: Airbnb "Today" sekmesinin 4 bloklu yapısı, Beds24 Arrivals/Departures/Current Guests*

Dört blok, bu sırayla:
1. **Yanıt bekleyen talepler** — yaşına göre renklenmiş (2 sa altı yeşil, 2–8 sa sarı, 8 sa üstü kırmızı), tıklanabilir
2. **Bugün giriş / bugün çıkış / şu an dolu villalar** — `villa_blocks.starts_on` / `ends_on` ile
3. **Son 7 günün talep akışı** — kronolojik
4. **Doluluk oranı + bu ay onaylı rezervasyon tutarı**

Şu anki 3 sayaç "kimi aramam lazım, bugün kim geliyor" sorusuna cevap vermiyor. Kartlar da
tıklanabilir değil — "Yeni talep: 7" görüp üstüne tıklayamıyorsun. Gerekli verinin **tamamı
DB'de zaten var**; `stats.ts` deseni (ucuz `count` sorguları) doğru, sadece 3 metrikte kalmış.

> **Yapıldı:** `getDashboardOverview()` (`data/admin/stats.ts`) tek seferde bugünkü
> giriş/çıkış listesi (misafir+villa adı), şu an dolu villa sayısı (`villa_blocks`
> üstünden, tam tablo taraması yok), en eski 5 "yanıt bekleyen" talep (bekleme süresi
> rozetiyle — `lib/bookingWaiting.ts`, `BookingRow.tsx` ile paylaşılan tek kaynak),
> son 7 gün talep sayısı, bu ay talep→onay dönüşüm oranı ve bu ay onaylı rezervasyon
> tutarını döndürüyor. Kartlar artık tıklanabilir (`/yonetim/talepler?durum=new` gibi
> filtreli listeye gidiyor). "Yapmayın" ilkesine uyularak RevPAR/pickup/pace gibi
> gürültülü metrikler eklenmedi — bu ay özeti yalnızca 3 sayı.

**2.2 — Talep detay sayfası + arama notu geçmişi**
*Esin: OwnerRez communication history, Hostfully lead detail*

Online ödeme yok → değerin tamamı telefon görüşmesinde. Her talebin altında tarihli not akışı
("14:20 aradım, meşguldü" / "15:00 fiyat gönderildi") + sonraki takip tarihi. Personel
değişiminde bilgi kaybını sıfırlar. **Bugünkü en büyük operasyonel eksik.**

Ek olarak: talepten villanın **panel** sayfasına link yok — şu an sadece herkese açık
`/villa/{slug}`'a gidiyor (`talepler/page.tsx:109`), takvime bakmak için Villalar'dan elle
bulmak gerekiyor.

**2.3 — Talep durumlarını satış hattına genişlet**
*Esin: Hostfully pipeline (Quote→Hold→Booked→Archived)*

`new → contacted → quoted (fiyat verildi) → confirmed / lost`

`lost` seçilince **zorunlu sebep listesi**: fiyat / tarih doluydu / cevap vermedi / başka villa
buldu / vazgeçti. Mevcut 4 durumda "fiyat verdim, bekliyorum" hali görünmüyor.

> Not: Araştırma, yapılandırılmış "kayıp sebebi" alanının **hiçbir sektör ürününde
> bulunmadığını** gösterdi (en yakını Hostfully'nin Declined/Ignored/Expired durumları).
> Yani bu kopya değil, boşluk doldurma — 3 ayda "%40 tarih doluydu" gibi bir gerçek çıkarsa
> doğrudan fiyat/stok kararına dönüşür.

**2.4 — Yanıt süresi göstergesi**
*Esin: Vrbo responsiveness metrics, Airbnb yanıt oranı*

Talep listesinde her satırda "3 sa 20 dk bekliyor" rozeti + dashboard'da "ortalama ilk yanıt
süresi (30 gün)". Ölçmek tek başına davranışı değiştirir; 1–2 personelde hesap verebilirlik sağlar.

**2.5 — Mobil öncelikli talep akışı**
*Esin: Booking.com Pulse*

Talep kartında `tel:` "Ara" ve `wa.me` "WhatsApp" butonları, tek dokunuşla durum değişimi,
yeni talepte e-posta/tarayıcı bildirimi. Talep gece ve hafta sonu geliyor, acente sahibi masada
değil — **yanıt süresini saatlerden dakikalara indiren tek müdahale bu.**

### Dalga 3 — Ölçek (~2,5 gün)

**3.1 — Listelerde sunucu tarafı arama + filtre + sayfalama**

> **Talepler ekranı ✅ TAMAM (04.08.2026).** Sunucu tarafı arama (ad/telefon/e-posta),
> villa filtresi, giriş tarihi aralığı, sıralama (en yeni talep / yaklaşan giriş), 25'lik
> sayfalama. Filtrelerin tamamı URL'de (`?durum=&q=&villa=&baslangic=&bitis=&sirala=&sayfa=`)
> → paylaşılabilir, geri tuşu çalışır. Bozuk parametre `bookingQuerySchema` içinde
> `.catch(undefined)` ile yutulur, sorgu patlamaz. Durum rozetleri diğer filtreleri
> paylaşır, yani rozetteki sayı listedekiyle tutarlı.
> Ek olarak: bekleme süresi rozeti (2 sa altı yeşil / 8 sa altı sarı / üstü kırmızı —
> Dalga 2.4'ten öne alındı), gece sayısı, tek dokunuşla Ara + WhatsApp, talepten villanın
> panel takvimine bağlantı, talep tarihinde yıl + saat (Europe/Istanbul'a sabit).
> **Villalar listesi hâlâ açık.**

- **Talepler**: ~~1000 talep = 1000 satır telefon ve e-posta dahil tek sayfada~~ → çözüldü
- **Villalar**: arama/filtre/sıralama/sayfalama yok **ve arşivlenmiş villalar aktiflerle karışık**
  (`villas.ts:158` durum filtresi yok) — soft-delete'in kullanılabilirlik tarafı eksik kalmış
- `getAdminRegions` villa sayısı için **tüm villa tablosunu** çekip JS'te sayıyor (`regions.ts:45-49`);
  `getAdminCategories` aynı şeyi ilişki tablosuyla yapıyor; `getVillaPicks` 200 villa = aramasız
  200 onay kutusu

`panel-kurallari §5:162` bunu zaten şart koşuyor, talepler dışında hiçbir yerde uygulanmamış.

**3.2 — Multi-calendar**
*Esin: Lodgify multi-calendar, OwnerRez Ribbon sürükle-seç*

Satırlar = villalar, sütunlar = günler, 8 haftalık görünüm. Sürükleyerek aralık seç →
kapat/aç/fiyat gir. 10–50 villada tek tek villa sayfasına girmek gerçekçi değil.

Asıl kazanç sektörün kendi ifadesiyle: **boş kalan 2–3 gecelik delikleri (gap nights) görmek** —
telefonla satış yapan bir acentenin en kârlı hamlesi. Dalganın en büyük tek işi.

**3.3 — Tarih aralığı + çoklu villa toplu güncelleme**
*Esin: Uplisting bulk MLOS paneli, Lodgify bulk edit*

"1–31 Ağustos, seçili 6 villa → fiyat X, min. gece 7, kapat/aç". Sezon başında 30 villanın
fiyatını tek tek girmek yılın en yoğun panel işi.

**3.4 — Eşzamanlı düzenleme kararı**

`panel-kurallari §3:88-91` `updated_at` kontrolü istiyor *"veya küçük ekipte bilinçli kabul;
**kararı belgele**"*. Ne kontrol var ne belgelenmiş karar. `updateVilla` koşulsuz `.update()` —
son yazan sessizce kazanıyor. En az kararı belgele.

İlgili somut hata: villa detayında "Bilgiler" sekmesinde düzenle → "Görseller"e geç → görsel
yükle → `router.refresh()`. Sekme `hidden` ile saklandığından form state'i hayatta kalır ama
`useState` başlatıcısı yeniden çalışmaz → form **bayat veri** gösterir, kaydedilirse başkasının
değişikliğini ezer (`VillaForm.tsx:121`, `Tabs.tsx:32`).

### Dalga 4 — Kalite ve büyüme (~2 gün)

**4.1 — Villa içerik kalite skoru**
*Esin: Booking.com Property Page Score (%100 skor → %18'e kadar daha fazla rezervasyon)*

Villa kartında %0–100 + eksikler listesi: kapak fotoğrafı yok · 8'den az fotoğraf · EN açıklama
boş · sezon fiyatı tanımsız · konum girilmemiş · min. gece yok. **Araştırmanın en ucuz/en yüksek
getirili maddesi** — teknik bilgisi düşük kullanıcıyı eğitim vermeden doğru davranışa itiyor.

**4.2 — Fotoğraf yönetimini tamamla**

- **"Kapak yap" eylemi.** Şu an kapak örtük: sadece `i === 0` olan rozet alıyor (`ImageManager.tsx:109`).
  12. fotoğrafı kapak yapmak **11 tıklama + 11 sunucu gidiş-dönüşü**. En sık yapılacak işlem, en zor yol
- **Sürükle-bırak sıralama.** `PLAN.md:335` bunu vaat etmiş, yukarı/aşağı ok olarak yapılmış.
  (Sektörde de sonradan gelen bir "acı noktası" çözümü: Lodgify 2025'te ekledi)
- **Sürükle-bırak dosya yükleme + ilerleme göstergesi.** 20 fotoğrafta tek dönen çark var,
  kaçıncıda olduğu belli değil; bir dosya hata verirse `break` ve hangisinde durulduğu yazmıyor
  (`ImageManager.tsx:41-56`)
- **Oda etiketi** (salon/yatak odası/havuz/manzara) — *Airbnb Photo Tour*. Opsiyonel

**4.3 — Fiyat kurallarını genişlet**
*Esin: Lodgify fiyat ayarları*

Hafta sonu farkı (haftanın günü bazlı, tipik %15–25 prim) · uzun konaklama indirimi (7+ gece
%10–25, 30+ gece %25–35) · son dakika indirimi (≤7 gün %10–15) · kapasite üstü kişi başı ücret.

`discount_percent` ve `deal_tag` şemada zaten var ama kural motoru yok. Villa fiyatlaması
haftalık mantıkla çalışır; hafta sonu farkı ve LOS indirimi Türkiye'de fiilen standart.

> **Dikkat:** Lodgify'ın Capterra yorumlarında "karmaşık fiyatlandırma" 117 yorumun %60'ında
> olumsuz geçiyor. Bu dalgayı yaparken kural sayısını dört ile sınırla, her kuralın yanına
> canlı örnek hesap koy ("Cuma–Cumartesi: 12.000 → 14.400 TL").

**4.4 — Kalanlar**

Giriş kaba kuvvet koruması (`panel-kurallari §1:46`, `auth.ts:19-50` sınırsız deneme kabul
ediyor) · `Tabs` ARIA rolleri + sekmenin URL'de tutulması · `formatDateShort` yılsız
(`talepler:122,166` — farklı yılların talepleri ayırt edilemiyor, saat de yok) · VillaForm'da
bölüm gezinmesi (47 kontrol tek scroll'da, ~1500px) · yardım metni 24 alandan 4'ünde ·
geniş ekranda form sayfaları `max-w-3xl`, listeler tam genişlik (tutarsız).

---

## 4. Şema değişikliği gerektirenler

Aşağıdakiler `supabase/migrations/` altında yeni dosya ister (`ARCHITECTURE.md §8`: Studio'dan
elle değil):

| İş | Değişiklik |
|---|---|
| 2.2 Talep notları | Yeni tablo `booking_notes` (booking_id, author_id, body, created_at) + RLS |
| 2.3 Satış hattı | `booking_requests.status` check kısıtına `quoted`, `lost` ekle; `lost_reason` sütunu |
| 2.4 Yanıt süresi | `booking_requests.first_response_at` (ilk durum değişiminde yazılır) |
| 4.1 Kalite skoru | Şema değişikliği gerekmez — mevcut alanlardan hesaplanır |
| 4.3 Fiyat kuralları | Yeni tablo `villa_price_rules` (tip, gün maskesi/eşik, değer) veya villa sütunları |

---

## 5. Yapmayacaklarımız

Araştırmanın en değerli çıktılarından biri. Bunlar sektörde var ama **bu ölçekte zarar verir** —
üstelik kullanıcı şikayetlerinin ana kaynakları:

1. **Kanal yöneticisi / OTA senkronizasyonu.** Tek kanal (kendi site) varken tüm karmaşıklığı
   getirir. Lodgify'ın en ağır kullanıcı şikayetleri (yanlış eşleme, **dolu daireye misafir
   gönderilmesi**) tam buradan çıkıyor. Gerekirse sadece tek yönlü **iCal içe aktarma** —
   `villa_blocks.source` alanında `ical` zaten hazır.
2. **Otomasyon / tetikleyici kural motoru.** Hostaway ve Guesty'de dik öğrenme eğrisinin tek
   başına en büyük sebebi. Yerine 2–3 sabit WhatsApp/e-posta şablonu + "kopyala" butonu.
3. **Dinamik / piyasa verisiyle otomatik fiyatlandırma.** Sezon + hafta sonu + son dakika
   kuralıyla ihtiyacın %95'i karşılanır.
4. **Muhasebe modülü** (cari, komisyon dağıtımı, fatura, sahip ekstresi). Türk rakiplerin
   ağırlık merkezi burası ama o iş modeli acente-tedarikçi ilişkisi gerektiriyor. Acente kendi
   villalarını yönetiyorsa muhasebe zaten ayrı programda; panelde yarım muhasebe = iki kayıt yeri.
5. **Analitik panosu** (RevPAR, pickup, pace, kanal kırılımı, çoklu grafik). "Raporlama sezgisel
   değil" en yaygın şikayetlerden biri ve 10–50 villada bu metrikler istatistiksel gürültü.
   Üç sayı yeter: doluluk, talep→onay dönüşümü, bu ay onaylı tutar. Bonus: CSV dışa aktarma.
6. **Rol/izin yönetimi ekranı.** 3 kullanıcıda Supabase panelinden davet yeterli — projede
   bu karar zaten verilmiş (`PLAN.md:316`), doğru karar.
7. **Birleşik gelen kutusu.** İletişim telefonla yürüyorsa mesajlaşma altyapısı yerine
   "arama notu" (2.2) 10 kat daha ucuz ve daha çok kullanılır.

---

## 5.5 Dalga 0 + 1 sonrası durum (04.08.2026)

Yapılanlar, denetim maddelerine karşılık:

| Madde | Ne yapıldı |
|---|---|
| 0.1 | `AdminShell` istemci bileşenine çevrildi; hamburger + mobil çekmece eklendi. Çekmecenin açık olduğu yol state'te tutuluyor, adres değişince kendiliğinden kapanıyor (pathname dinleyen efekt yok) |
| 0.2 | Görsel silme `ConfirmDialog`'a bağlandı; kapak fotoğrafı siliniyorsa metin ayrıca uyarıyor |
| 0.3 | `remove`/`move`/`saveAlt` artık `{ok:false}` sonucunu okuyup toast gösteriyor; oturum düşmesi ayrı mesaj |
| 0.4 | Durum değişiminin takvim yan etkisi onay diyaloğunda **açıkça yazılıyor** ("tarihler sitede yeniden müsait görünecek") |
| 0.5 | `getBookingCounts` durum başına `count:"exact", head:true` — tablo taşınmıyor, sayı sessizce yanlışlanamıyor |
| 0.6 | `setCategoryVillas` sonucu kontrol ediliyor; başarısızsa "Kategori kaydedildi ancak villa ataması yapılamadı" |
| 0.7 | Bayat metin kaldırıldı; kartlar tıklanabilir (yeni talep → filtreli liste) |
| 0.8 | Villalar/kategoriler/bölgeler/talepler için eylem çağrılı `EmptyState` |
| 0.9 | `usePathname` ile aktif menü vurgusu + `aria-current="page"` |
| 0.10 | `(panel)/loading.tsx` iskelet + `(panel)/error.tsx` hata sınırı |
| 0.11 | `app/yonetim/layout.tsx` → `robots: noindex, nofollow, nocache` (canlıda doğrulandı) |
| 0.12 | `lib/slugify.ts` tek kaynak; `İ` düzeltildi + NFD ile kalan aksanlar |
| 0.13 | `setVillaStatus` (21 satır) ve menüdeki "yakında" dalı (13 satır) silindi |
| 1.1–1.6 | `components/admin/ui/` altında altı ilkel yazıldı; `window.confirm`/`alert` kalmadı |
| 1.7 | Zod mesajları `toFieldErrors` ile forma taşındı — alan altında satır içi |
| 1.8 | `useUnsavedGuard`: `beforeunload` + panel içi link yakalama (onaylanırsa `router.push`) |
| 1.9 | `VillaForm`/`CategoryForm`/`SeasonEditor` gerçek `<form>` — Enter çalışıyor |
| 1.10 | İkincil metinlerde alt sınır `text-brand-900/70` (≈4.7:1); global `:focus-visible` halkası |

Ek olarak kapsam dışı iken ucuz olduğu için yapıldılar: `Tabs` ARIA rolleri + ok tuşu
gezinmesi, `revalidateVilla` tek kaynağa indi (villa kaydında ana sayfa artık tazeleniyor),
talepler listesine 200 kayıt sınırı + "daha eskisi için filtre kullanın" notu, bölge
düzenlemede dar ekranda forma kaydırma.

**Doğrulama:** `next build` ve `eslint` temiz. `/yonetim` `noindex` tarayıcıda doğrulandı,
herkese açık sitede konsol hatası yok. Panel ekranlarının görsel doğrulaması giriş
gerektirdiği için acentede yapılacak.

**Hâlâ açık:** talepler/villalar sayfalama ve arama (3.1), eşzamanlı düzenleme koruması
(3.4) ve villa formundaki bayat veri sorunu — Dalga 3'te.

---

## 6. Öneri: sıra ve gerekçe

**Dalga 0 → 1 → 2** çekirdek. Bu üçü bittiğinde panel hem kendi yazılı kurallarına uyar hem
de acentenin günlük iş aracı olur.

- **Dalga 0 pazarlığa kapalı** — içinde veri kaybettiren üç hata var (0.2, 0.3, 0.4) ve
  0.1 olmadan panel telefonda kullanılamıyor.
- **Dalga 1 kendini hemen amorti eder** — 10+ bulguyu tek seferde kapatıyor ve Dalga 2–4'teki
  her ekranı daha ucuz yazdırıyor. Dalga 2'ye Dalga 1'siz girilirse kopya-yapıştır borcu ikiye katlanır.
- **Dalga 3 ve 4 villa sayısına bağlı.** 10–15 villayla açılıyorsanız ertelenebilir; 30+ villa
  hedefleniyorsa 3.1 (sayfalama) ve 3.2 (multi-calendar) yayın öncesi şart.

**Toplam tahmin:** Dalga 0+1 ≈ 2,5 gün · +Dalga 2 ≈ 4,5 gün · hepsi ≈ 9 gün.

`PLAN.md`'de bu iş "Faz 5.6 dashboard zenginleştirme (opsiyonel)" olarak geçiyor — bu rapordan
sonra **5.6 opsiyonel değil**; Dalga 0 yayın öncesi kapatılması gereken bir borç kalemidir.
