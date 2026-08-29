/* eslint-disable @next/next/no-img-element */

export default function Logo({
  className = "",
  variant = "dark",
}: {
  className?: string;
  /** "dark" = renkli logo (açık zemin), "light" = beyaza dönüştürülmüş (koyu zemin) */
  variant?: "dark" | "light";
}) {
  return (
    <img
      src="/logo.svg"
      alt="Kastayım Bugün Villaları"
      // Boyut verilmezse tarayıcı SVG'yi indirip parse edene kadar genişliği
      // bilemez: 0'dan gerçek genişliğe sıçrar ve yanındaki navigasyon yatay
      // kayar. Header sticky ve her sayfada olduğu için CLS her yerde görünür.
      // Değerler logo.svg'nin viewBox oranından (634.348 × 189.4 → 56px için 188).
      width={188}
      height={56}
      className={`h-14 w-auto ${
        variant === "light" ? "brightness-0 invert" : ""
      } ${className}`}
    />
  );
}
