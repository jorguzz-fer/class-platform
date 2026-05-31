# ClassOS

Plataforma SaaS multi-tenant para criar, hospedar e vender cursos, mentorias e
comunidades. Cada cliente tem sua própria escola digital com marca, cursos,
alunos, certificados e analytics.

> Especificação completa do produto em [`SPEC.md`](./SPEC.md).

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **PostgreSQL** + **Prisma ORM**
- **Auth.js (NextAuth v5)** — provider Credentials, sessão JWT
- **Zod** (validação) · **bcryptjs** (hash de senha)

## Pré-requisitos

- Node.js 20+
- pnpm 10+
- Docker (para o Postgres local)

## Como rodar (desenvolvimento)

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir o Postgres local
pnpm db:up

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env e gere um AUTH_SECRET:
#   openssl rand -base64 32
# Defina também SEED_SUPERADMIN_EMAIL e SEED_SUPERADMIN_PASSWORD.

# 4. Criar o schema e popular os dados iniciais
pnpm db:migrate      # aplica as migrations
pnpm db:seed         # cria planos SaaS + usuário SUPER_ADMIN

# 5. Rodar a aplicação
pnpm dev
```

App em http://localhost:3000

- `/` — landing pública
- `/register` — criar escola (cria User + Organization + School + Subscription trial)
- `/login` — entrar
- `/dashboard` — painel da escola (exige login)

## Scripts

| Script             | Descrição                              |
| ------------------ | -------------------------------------- |
| `pnpm dev`         | Servidor de desenvolvimento            |
| `pnpm build`       | Build de produção                      |
| `pnpm start`       | Servir o build                         |
| `pnpm lint`        | ESLint                                 |
| `pnpm typecheck`   | Checagem de tipos (tsc)                |
| `pnpm db:up`       | Sobe o Postgres via docker-compose     |
| `pnpm db:down`     | Derruba o Postgres                     |
| `pnpm db:migrate`  | Roda as migrations do Prisma           |
| `pnpm db:seed`     | Popula planos + super admin            |
| `pnpm db:studio`   | Abre o Prisma Studio                   |
| `pnpm db:generate` | Gera o Prisma Client                   |

## Arquitetura multi-tenant

Multi-tenancy **por coluna**: toda tabela principal carrega `organizationId`.
Nenhuma organização acessa dados de outra. Use sempre `requireOrg()`
(`src/lib/tenant.ts`) e filtre as queries pelo `organizationId` retornado —
nunca confie em ids vindos do cliente.

## Segurança

- Senhas com hash **bcrypt** (custo 12); nunca em texto plano.
- Toda entrada validada com **Zod** antes de tocar o banco.
- Acesso a dados só via **Prisma** (queries parametrizadas).
- Segredos apenas via variáveis de ambiente; `.env` é gitignored.
- Permissões por papel centralizadas em `src/lib/permissions.ts`.

## Status

**MVP completo** (Etapas 1–10 do `SPEC.md` §20):

1. ✅ Fundação (Next/Tailwind/shadcn/Prisma/Postgres) + schema + seed
2. ✅ Auth & onboarding (cria Organization + School + trial)
3. ✅ Layout do painel (sidebar/topbar)
4. ✅ CRUD de cursos (DRAFT/PUBLISHED/ARCHIVED + regra de publicação)
5. ✅ Módulos e aulas com ordenação
6. ✅ Alunos e matrículas manuais
7. ✅ Área do aluno (player + progresso + conclusão de curso)
8. ✅ Certificados com código de verificação pública
9. ✅ Dashboard com métricas reais
10. ✅ Hardening (isolamento multi-tenant, headers de segurança, bloqueio de
    org suspensa, AuditLog para PII)

**Preparado mas não implementado** (pós-MVP, ver `SPEC.md` §18): checkout/
pagamentos, comunidade, IA, WhatsApp, SSO, page builder, marketplace.

### Segurança & LGPD

- Senhas com bcrypt; PII fora de logs; queries só via Prisma; segredos via env.
- Isolamento por `organizationId` em todos os serviços (validado por testes).
- Headers de segurança (HSTS, nosniff, X-Frame-Options, Permissions-Policy).
- `AuditLog` registra ações sobre PII (accountability).
- Itens LGPD pendentes (consentimento/termos, exportação, anonimização,
  retenção) estão mapeados no planejamento para evolução.
