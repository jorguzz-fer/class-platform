/**
 * Documentos legais cujo aceite é registrado (LGPD). Ao publicar uma nova versão
 * dos termos, atualize a versão aqui — o aceite anterior fica registrado com a
 * versão antiga, permitindo accountability.
 */
export const CONSENT_DOCS = {
  TERMS_OF_SERVICE: { version: "2026-01-01", label: "Termos de Uso" },
  PRIVACY_POLICY: { version: "2026-01-01", label: "Política de Privacidade" },
} as const;

export type ConsentType = keyof typeof CONSENT_DOCS;
