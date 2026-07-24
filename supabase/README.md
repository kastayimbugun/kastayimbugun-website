# Supabase

Veritabanı şeması bu klasörde versiyonlanır. Studio'dan elle tablo oluşturma —
her değişiklik yeni bir migration dosyası olarak buraya eklenir.

## Migration çalıştırma

1. Supabase panelinde projeyi aç → sol menü **SQL Editor** → **New query**
2. `migrations/` altındaki dosyanın **tamamını** yapıştır → **Run**
3. Hata almazsan **Table Editor**'de tablolar görünür

Sırayla çalıştır: `0001_init.sql`, sonra varsa `0002_*.sql` ...

## İlk kurulum sonrası yapılacaklar

**1. Kendine yönetici hesabı aç**
- Authentication → Users → **Add user** (e-posta + şifre)
- Sonra SQL Editor'de rolü ver:

```sql
insert into profiles (id, role, full_name)
select id, 'admin', 'Murat' from auth.users where email = 'SENIN@EPOSTAN.com'
on conflict (id) do update set role = 'admin';
```

**2. Kayıt olmayı kapat**
- Authentication → Sign In / Providers → **Allow new users to sign up** kapalı olsun.
  Kullanıcıları panelden sen eklersin.

**3. Anahtarları al**
- Project Settings → API
- `Project URL` ve `anon public` → `.env.local` içine
- `service_role` → **yalnızca** `.env.local` ve Vercel'e; hiçbir yere yapıştırma, git'e girmez

## Kontrol listesi (şema kurulduktan sonra)

- [ ] Table Editor'de 11 tablo görünüyor
- [ ] Her tabloda RLS "Enabled" yazıyor
- [ ] Storage → `villa-images` bucket'ı var ve public
- [ ] Authentication'da kendi admin kullanıcın var ve `profiles` tablosunda `role = 'admin'`
