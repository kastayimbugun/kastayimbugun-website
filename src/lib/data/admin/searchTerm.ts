/**
 * PostgREST `or` filtresi virgül ve parantezle ayrışır; `%` de joker karakter.
 * Kullanıcı girdisi doğrudan gömülmeden bu karakterlerden arındırılır.
 *
 * Talepler ve villalar listeleri aynı arama davranışını paylaşsın diye burada.
 */
export function safeTerm(input: string): string {
  return input.replace(/[,()%*\\"']/g, " ").trim().slice(0, 60);
}
