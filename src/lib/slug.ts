/**
 * Gera um slug "url-friendly" a partir de um texto livre.
 * Remove acentos, baixa caixa, troca não-alfanuméricos por hífen.
 */

// Combining diacritical marks (U+0300–U+036F). Construído via RegExp para
// não inserir caracteres combinantes literais no código-fonte.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
