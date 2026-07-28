/**
 * Yükleme sınırı. Hem istemci (erken uyarı) hem sunucu (asıl kontrol) kullanır.
 *
 * DİKKAT: Server Action gövde sınırı varsayılan 1 MB'tır. Bu değeri değiştirirsen
 * `next.config.ts` içindeki `serverActions.bodySizeLimit` değerini de büyüt —
 * multipart başlıkları için ~1 MB pay bırakılmıştır.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_UPLOAD_LABEL = "8 MB";
