# Mimari ve Kurallar

Bu dosya projenin **değişmez kurallarını** tanımlar. Amaç: yeni gelen bir yazılımcının
sistemi hızlı kavraması ve bir özellik eklerken başka bir yeri bozmaması.
Kod yazmadan önce bu dosyayı oku. Yeni bir kural gerektiğinde burayı güncelle.

> Ek olarak: bu Next.js sürümü kırıcı değişiklikler içerir. Bir API kullanmadan önce
> `node_modules/next/dist/docs/` altındaki ilgili rehberi oku (bkz. [AGENTS.md](AGENTS.md)).

---

## 1. Katman mimarisi

Veri tek yönde akar. Bir üst katman yalnızca bir alt katmanı çağırır, atlamaz.

```
  Sayfa (src/app/**)            → routing + veriyi ÇEKER, ince tutulur
    └─ Veri Erişim Katmanı (src/lib/data/**)   → Supabase'e ERİŞEN TEK yer
         └─ Supabase istemcileri (src/lib/supabase/**)
              └─ Supabase (Postgres + RLS)

  Bileşen (src/components/**)   → SUNUM. Veriyi prop olarak alır, kendi çekmez.
  Saf yardımcılar (src/lib/*.ts) → İş mantığı, istemcide de çalışır (i18n, format, pricing).
```

**Demirbaş kurallar:**

- **Bir bileşen asla `@supabase/*` veya `src/lib/supabase/*` import etmez.**
  Veri sayfada çekilir, bileşene prop olarak geçer. (Şu an %100 böyle — bozma.)
- **Supabase'e yalnızca `src/lib/data/**` içinden erişilir.** Sayfalar bile doğrudan
  sorgu yazmaz; `getVillas()`, `getCategories()` gibi adlandırılmış fonksiyonları çağırır.
- Veri katmanı **DB satırını arayüzün beklediği tipe çevirir** (`mapVilla` gibi).
  Böylece DB şeması değişse de bileşenler değişmez — dönüşüm tek yerde güncellenir.
- Yeni bir veri ihtiyacı → önce `src/lib/data/` içine fonksiyon ekle, sayfadan çağır.
  Bileşenin içine sorgu koyma.

## 2. Sunucu / istemci sınırı

- `src/lib/data/**` ve `src/lib/supabase/**` dosyalarının başında **`import "server-only"`**
  bulunur. Bu dosyalar yanlışlıkla istemciye sızarsa build hata verir.
- **`service_role` anahtarı** yalnızca `src/lib/supabase/admin.ts` içinde okunur ve
  **RLS'i atlar**. Bu istemciyi sadece, yetkiyi kendin doğruladıktan sonra, sunucuda kullan.
- Tarayıcıya gidecek her değişken `NEXT_PUBLIC_` ile başlar. **Sır asla `NEXT_PUBLIC_` olmaz.**
- `"use client"` yönergesini mümkün olduğunca **yaprak** (leaf) bileşenlere koy; sayfa ve
  düzen (layout) sunucuda kalsın. Örnek desen: sayfa sunucu bileşenidir, veriyi çeker,
  interaktif kısmı `HomeClient`/`VillaListClient` gibi bir istemci bileşenine prop'lar.

## 3. Doğrulama (validation)

- **Her güven sınırında doğrula:** form girişi, Server Action parametresi, URL query.
- Doğrulama şemaları tek yerde: **`src/lib/schemas/**`** (Zod ile).
- İstemci doğrulaması yalnızca **kullanıcı deneyimi** içindir. Güvenlik kararı **her zaman
  sunucuda** verilir. İstemciden gelen hiçbir değere (fiyat, tarih, kişi sayısı) güvenme.

## 4. Mutasyonlar (veri değiştirme)

- Yazma işlemleri **Server Action** (`"use server"`) ile yapılır, `src/lib/actions/**`.
- **Her action kendi içinde yetki kontrolü yapar.** Sadece `proxy.ts` (middleware) veya
  layout kontrolüne güvenme — asıl kontrol action'ın ilk satırlarındadır.
- **Fiyat, tutar, indirim gibi kritik değerler sunucuda hesaplanır.** İstemcideki rakam
  sadece gösterimdir; sunucu kendi hesabını yapar ve onu kaydeder.
- Yazma sonrası ilgili sayfayı tazele (`revalidatePath` / `revalidateTag`).

## 5. Güvenlik kuralları (checklist)

Bunlar tartışmaya kapalı; bir PR bu maddelerden birini ihlal ediyorsa geri çevrilir.

- [ ] **RLS her tabloda açık.** Anon rol yalnızca yayınlanmış içeriği okur.
- [ ] **Herkese açık form** (rezervasyon talebi, iletişim) doğrudan DB'ye yazmaz →
      Server Action üzerinden gider. Orada: Zod doğrulama + spam koruması (Turnstile) +
      hız sınırı (rate limit). RLS'te bu tablolara anon insert **yok**.
- [ ] **Ham SQL string birleştirme yok.** Supabase query builder parametreleri kaçışlar;
      dinamik sorgu gerekiyorsa `.filter()` / parametreli RPC kullan.
- [ ] **`dangerouslySetInnerHTML` kullanma.** Zorunluysa önce sanitize et. React
      varsayılan olarak kaçışlar — bu korumayı elle bypass etme.
- [ ] **Sırlar git'e girmez.** `.env.local` + Vercel ortam değişkenleri. Repoda pre-commit
      kancası (`.git/hooks/pre-commit`) anahtar içeren commit'i durdurur.
- [ ] **`npm audit` temiz tutulur.** Yüksek/kritik açık varken yayına çıkılmaz.
- [ ] **Kişisel/hassas veri URL'de taşınmaz** (query string, log). PII loglama.
- [ ] Güvenlik başlıkları + CSP (Faz 6/7'de eklenecek, checklist'te takip edilir).

## 6. Tipler

- `src/lib/types.ts` uygulama tiplerinin kaynağıdır. DB şeması değişince buradaki tip ve
  `src/lib/data/**` içindeki dönüşüm birlikte güncellenir.
- İleride `supabase gen types` ile DB'den tip üretmeye geçilebilir; o zaman bu bölüm güncellenir.

## 7. İsimlendirme ve dil

- **Kod İngilizce** (değişken, fonksiyon, dosya). **Kullanıcıya görünen metin** asla koda
  gömülmez → `src/lib/i18n.tsx` sözlüğüne anahtar olarak eklenir (TR + EN, ikisi de dolu).
  - **İstisna — e-posta şablonları.** `i18n.tsx` bir `"use client"` React context'idir,
    sunucudan çağrılamaz. Bu yüzden e-posta gövdelerinin metinleri kendi dosyalarında,
    aynı TR+EN sözlük biçiminde tutulur (`src/lib/email/**`). Arayüz metni buraya yazılmaz.
- Bileşen dosyaları `PascalCase.tsx`, yardımcılar `camelCase.ts`.
- Yorumlar Türkçe olabilir (ekip Türkçe); niyeti açıklar, kodu tekrar etmez.

## 8. Veritabanı değişikliği

- Şema **yalnızca migration dosyasıyla** değişir: `supabase/migrations/NNNN_ad.sql`.
  Supabase Studio'dan elle tablo/sütun ekleme — versiyonlanmayan değişiklik yok.
- Migration'lar geri alınabilir ve tekrar çalıştırılabilir olacak şekilde yazılır
  (`if not exists`, `on conflict` vb.).

## 9. Yeni özellik ekleme akışı (özet)

1. Şema mı değişiyor? → yeni migration dosyası yaz, çalıştır.
2. Yeni veri mi lazım? → `src/lib/data/` içine fonksiyon ekle.
3. Yeni sayfa mı? → sunucu bileşeni veriyi çeker, istemci bileşenine prop'lar.
4. Yazma işlemi mi? → `src/lib/actions/` içinde Server Action, başında yetki + Zod.
5. Kullanıcı metni mi? → i18n sözlüğüne TR+EN ekle.
6. Güvenlik checklist'ini (§5) gözden geçir.

> İlke: **her modül dışarıyla yalnızca prop/fonksiyon arayüzü üzerinden konuşur.**
> Bir özelliği eklerken başka bir dosyanın içini değiştirmen gerekiyorsa, muhtemelen
> sınırı yanlış yerden geçiyorsundur.
