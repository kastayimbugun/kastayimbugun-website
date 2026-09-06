import type { Metadata } from "next";

/**
 * NEDEN METADATA SAYFADA DEĞİL BURADA
 *
 * `page.tsx` bir `"use client"` bileşeni: bütün metni `useI18n()` hook'undan
 * alıyor. Next `metadata` dışa aktarımını yalnızca SUNUCU bileşenlerinde kabul
 * eder, dolayısıyla o dosyaya yazılamaz. Sayfayı sunucuya çevirip arayüzü ayrı
 * bir istemci bileşenine taşımak ise `src/components/**` altına yeni bir dosya
 * açmak demekti (ARCHITECTURE.md §1: sunum bileşenleri orada yaşar, `src/app`
 * altında tek bir örneği yok). Rota kapsamlı `layout.tsx` aynı sonucu mimariyi
 * bozmadan verir ve projede zaten kullanılan bir desendir (`/yonetim/**`).
 * Bu klasörde tek bir sayfa var, yani buradaki metadata doğrudan o sayfanındır.
 *
 * TARAMA YÖNERGESİ
 *
 * `index: false` — burası forma özel bir SONUÇ ekranı. Kendi başına aranacak
 * bir içeriği yok; yalnızca talep gönderildikten sonra anlamlı. Google'da
 * çıkması hem boş bir sonuç hem de "talebim iletildi" sanan ziyaretçi demek.
 * `follow: true` — sayfadaki iç bağlantılar (ana sayfa, villa listesi)
 * taranmaya devam etsin; indekslenmemek bağlantıların ölmesi anlamına gelmemeli.
 *
 * `robots` alanı kök düzenin `robots`'unu TAMAMEN değiştirir (metadata sığ
 * birleşir), yani kökteki `googlebot: index` etiketi bu sayfada hiç basılmaz —
 * çelişkili bir çift sinyal doğmaz. Aynı davranış `/favoriler` sayfasında da var.
 *
 * CANONICAL BİLEREK YOK: indekslenmeyecek bir sayfa için kanonik adres
 * bildirmek çelişkili bir sinyaldir.
 *
 * Başlık/açıklamanın koda gömülmesi ARCHITECTURE.md §7'nin bilinen istisnası:
 * i18n sözlüğü bir `"use client"` context'i, sunucudan okunamaz (aynı gerekçe
 * kök düzende de yazılı). Metinler ekrandaki `thanks.*` karşılıklarıyla uyumlu.
 */
export const metadata: Metadata = {
  title: "Talebiniz Alındı",
  description:
    "Rezervasyon talebiniz bize ulaştı. Ekibimiz en kısa sürede sizinle iletişime geçecek.",
  robots: { index: false, follow: true },
};

export default function ReservationThanksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
