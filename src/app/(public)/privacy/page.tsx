import Link from "next/link";

import { CONSENT_DOCS } from "@/lib/consent";

export default function PrivacyPage() {
  return (
    <div className="container max-w-2xl py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Início
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Versão {CONSENT_DOCS.PRIVACY_POLICY.version}
      </p>
      <div className="prose prose-sm mt-6 max-w-none">
        <p>
          Este é um documento modelo, alinhado à LGPD (Lei 13.709/2018).
        </p>
        <ul>
          <li>
            <strong>Dados coletados:</strong> nome e e-mail, para criar e operar
            sua conta e suas matrículas.
          </li>
          <li>
            <strong>Finalidade:</strong> autenticação, acesso a cursos,
            acompanhamento de progresso e emissão de certificados.
          </li>
          <li>
            <strong>Seus direitos:</strong> você pode solicitar a exportação dos
            seus dados (portabilidade) e a anonimização/exclusão (direito ao
            esquecimento) a qualquer momento.
          </li>
          <li>
            <strong>Controladora:</strong> a escola em que você está matriculado.
            O ClassOS atua como operadora.
          </li>
        </ul>
      </div>
    </div>
  );
}
