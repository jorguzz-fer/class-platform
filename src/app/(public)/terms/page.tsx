import Link from "next/link";

import { CONSENT_DOCS } from "@/lib/consent";

export default function TermsPage() {
  return (
    <div className="container max-w-2xl py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Início
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Termos de Uso</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Versão {CONSENT_DOCS.TERMS_OF_SERVICE.version}
      </p>
      <div className="prose prose-sm mt-6 max-w-none">
        <p>
          Este é um documento modelo. Ao usar o ClassOS, você concorda em utilizar
          a plataforma de acordo com a legislação aplicável e com estes termos.
        </p>
        <p>
          As escolas (organizações) são responsáveis pelo conteúdo que publicam e
          pelos dados dos seus alunos, na qualidade de controladoras de dados.
        </p>
      </div>
    </div>
  );
}
