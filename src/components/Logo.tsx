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
      className={`h-14 w-auto ${
        variant === "light" ? "brightness-0 invert" : ""
      } ${className}`}
    />
  );
}
