# SPEC — ClassOS

Plataforma SaaS de hospedagem de cursos, mentorias e comunidades.

## 1. Visão do produto

Plataforma SaaS multi-tenant para criação, hospedagem, venda e gestão de cursos
online, mentorias, comunidades e produtos educacionais digitais. Permite que
empresas, mentores, consultores, infoprodutores e escolas digitais criem sua
própria escola online com identidade visual, cursos, alunos, checkout, área do
aluno, certificados, comunidade, automações e analytics.

Não é apenas uma "plataforma de hospedagem de cursos": é um **sistema
operacional para negócios educacionais digitais**.

## 2. Proposta de valor

Qualquer cliente SaaS consegue:

1. Criar sua própria escola digital.
2. Subir cursos com módulos, aulas, vídeos, PDFs e materiais.
3. Vender cursos, mentorias, comunidades e assinaturas.
4. Gerenciar alunos, progresso, certificados e acessos.
5. Criar páginas simples de venda.
6. Acompanhar métricas educacionais e comerciais.
7. Personalizar a escola com marca própria.
8. Automatizar notificações por e-mail e futuramente WhatsApp.
9. Usar IA futuramente para criar cursos, quizzes, resumos e recomendações.

## 3. Tipo de produto

SaaS **multi-tenant**. Cada cliente tem sua própria organização/escola, com
usuários, cursos, alunos, configurações, marca e dados isolados logicamente.

```
cliente1.plataforma.com
cliente2.plataforma.com
cursos.cliente.com.br
```

## 4. Escopo do MVP

### 4.1 No MVP

Autenticação · multi-tenant básico · cadastro de organizações/escolas · painel
admin da escola · gestão de cursos/módulos/aulas · upload ou cadastro de vídeos ·
materiais complementares · área do aluno · matrícula · controle de progresso ·
certificado simples · dashboard básico · personalização visual básica · página
pública simples do curso · controle de permissões · sistema básico de planos
SaaS · estrutura preparada para checkout e IA futuros.

### 4.2 Fora do MVP (previstos na arquitetura, não implementados)

App mobile nativo · marketplace · afiliados · split de pagamento · DRM avançado ·
comunidade completa · IA avançada · WhatsApp nativo · gamificação complexa ·
multiempresa corporativo avançado · SSO · API pública completa · page builder
avançado · live streaming próprio.

## 5. Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Next.js (API Routes / Server Actions) no MVP; NestJS separado é opção futura.
- **Banco:** PostgreSQL + Prisma ORM.
- **Auth:** Auth.js (NextAuth) — escolhido para acelerar o MVP.
- **Storage (futuro):** Cloudflare R2 / AWS S3 / Supabase Storage.
- **Vídeo:** sem infra própria no MVP — armazenar `provider` + `video_id/url`
  (Bunny Stream, Mux, Cloudflare Stream, Vimeo).
- **Deploy:** Vercel (frontend/fullstack), Neon/Supabase (Postgres), Cloudflare (DNS).

## 6. Arquitetura multi-tenant

- Cada cliente é uma `Organization`; cada `Organization` tem uma `School`.
- Curso, aluno, aula, matrícula, certificado e configuração se vinculam a
  `organization_id`.
- **Estratégia:** multi-tenancy **por coluna** (`organization_id` em todas as
  tabelas principais). Todos os dados são filtrados por `organization_id`.
  Nunca permitir que um usuário de uma organização acesse dados de outra.

## 7. Perfis de usuário (roles)

`SUPER_ADMIN`, `ORG_OWNER`, `ORG_ADMIN`, `INSTRUCTOR`, `SUPPORT`, `STUDENT`.

- **SUPER_ADMIN** — plataforma: vê/gerencia organizações, métricas globais,
  planos SaaS, logs.
- **ORG_OWNER** — dono da escola: gerencia escola, cursos, usuários, alunos,
  relatórios, marca, domínio, plano e (futuro) pagamentos.
- **ORG_ADMIN** — admin da escola: gerencia cursos/alunos, relatórios, cria
  instrutores, edita conteúdos. **Não** altera plano, exclui org ou mexe em
  dados financeiros críticos.
- **INSTRUCTOR** — cria/edita seus cursos, módulos e aulas; vê alunos e progresso
  dos seus cursos.
- **SUPPORT** — vê alunos/matrículas/progresso, reenvia acesso, ajuda com login.
  **Não** edita cursos.
- **STUDENT** — acessa cursos matriculados, assiste aulas, baixa materiais
  permitidos, marca progresso, emite certificado elegível, edita perfil.

A matriz de permissões vive em `src/lib/permissions.ts`.

## 8. Entidades

Modelo de dados completo em [`prisma/schema.prisma`](./prisma/schema.prisma).
Entidades: `User`, `Organization`, `OrganizationMember`, `School`, `Course`,
`Module`, `Lesson`, `LessonAttachment`, `Enrollment`, `LessonProgress`,
`Certificate`, `Plan`, `Subscription`, `AuditLog`, `PasswordResetToken`.

Principais enums: `UserRole`, `OrganizationStatus` (ACTIVE/TRIAL/SUSPENDED/
CANCELED), `SubscriptionStatus` (ACTIVE/PAST_DUE/CANCELED/TRIALING/INCOMPLETE),
`CourseStatus` (DRAFT/PUBLISHED/ARCHIVED), `CourseVisibility` (PUBLIC/PRIVATE/
UNLISTED), `CourseLevel`, `LessonContentType` (VIDEO/TEXT/PDF/AUDIO/LIVE/EMBED),
`EnrollmentStatus`, `ProgressStatus`, `BillingCycle`.

## 9. Estrutura de telas

- **Públicas:** `/` (home SaaS), `/login`, `/register`, escola pública em
  `/s/[schoolSlug]` (e cursos).
- **Super admin:** `/admin/organizations`, `/admin/plans`, `/admin/users`,
  `/admin/metrics`, `/admin/logs`.
- **Painel da escola:** `/dashboard` e sub-rotas (`courses`, `students`,
  `enrollments`, `certificates`, `settings` [branding/domain/team], `billing`).
- **Área do aluno:** `/app` (`courses`, `courses/[slug]/lessons/[id]`,
  `certificates`, `profile`).

## 10. Fluxos principais

1. **Criar escola:** cadastro → cria Organization + School → usuário vira
   ORG_OWNER → assinatura trial → onboarding (logo, cor, primeiro curso).
2. **Criar curso:** novo curso → módulos → aulas → conteúdo → publicar.
3. **Matrícula manual:** cadastra aluno → seleciona curso → cria matrícula →
   (futuro) e-mail de acesso → aluno acessa a área do aluno.
4. **Progresso:** aluno abre aula → registra início → atualiza progresso →
   conclui aula → ao concluir as obrigatórias, curso fica elegível a certificado.
5. **Certificado:** verifica 100% das aulas obrigatórias → gera número único +
   código de verificação → exibe certificado (PDF futuro).

## 11. Regras de negócio (resumo)

- Toda escola pertence a uma organização com um owner. Org suspensa bloqueia
  acesso administrativo.
- Curso DRAFT não aparece para alunos; PUBLISHED respeita a visibilidade;
  PRIVATE só para matriculados; ARCHIVED não aceita novas matrículas. Publicar
  exige ≥ 1 módulo e ≥ 1 aula.
- Toda aula pertence a um módulo; ordem por `order_index`; só aulas obrigatórias
  contam para conclusão.
- Progresso é por aluno/curso/aula; conclusão do curso = aulas obrigatórias
  completas.
- Certificado só para curso concluído; código único; sem duplicar por curso/aluno
  (salvo reemissão permitida pelo admin).
- Planos limitam cursos, alunos, admins; liberam/bloqueiam custom domain,
  certificados e analytics; trial tem data de expiração.

## 12. Dashboards

- **Dono da escola:** total de alunos, cursos, matrículas ativas, taxa média de
  conclusão, cursos publicados, alunos ativos (7 dias). Gráficos futuros.
- **Aluno:** cursos matriculados, progresso por curso, última aula assistida,
  certificados disponíveis.

## 13. UI/UX

Interface limpa, moderna, profissional, responsiva, minimalista, com aparência
SaaS premium. Tailwind + shadcn/ui. Painel com sidebar esquerda, header superior,
cards de dados, tabelas com filtros, toasts e feedbacks de loading. Área do aluno
simples: cards de cursos, lista de módulos, player em destaque, progresso visível,
botões "Próxima aula" e "Marcar como concluída", materiais abaixo da aula.

## 14. APIs e rotas

Grupos: Auth, Organizations, Schools, Courses, Modules, Lessons, Students,
Enrollments, Progress, Certificates. (Detalhamento por endpoint conforme cada
etapa de implementação — ver §20.)

## 15. Estrutura de pastas (App Router)

```
/src
  /app
    /(public)      -> page, login, register, forgot-password
    /(dashboard)   -> dashboard e sub-rotas (cursos, alunos, ...)
    /(student)     -> /app (área do aluno)
    /api           -> auth, courses, modules, lessons, ...
  /components      -> ui, layout, dashboard, student, forms
  /lib             -> auth, db, permissions, tenant, storage, validators, utils
  /services        -> course, enrollment, progress, certificate (a partir da Etapa 4)
  /types
/prisma            -> schema.prisma, seed.ts
```

## 16. Prisma schema

Fonte de verdade do schema: [`prisma/schema.prisma`](./prisma/schema.prisma).
Inclui todos os models do §8, índices em `organizationId`, e dois acréscimos ao
spec original para suportar os fluxos: `AuditLog` e `PasswordResetToken`.

## 17. Critérios de aceite do MVP

- **Cadastro:** em `/register`, preencher nome/e-mail/senha/nome da escola cria
  usuário + organização + escola e redireciona ao dashboard.
- **Curso:** ORG_OWNER cria curso → aparece como DRAFT.
- **Publicação:** curso com ≥ 1 módulo e ≥ 1 aula → publicar muda status para
  PUBLISHED.
- **Matrícula:** admin matricula aluno → aluno vê o curso na área do aluno.
- **Progresso:** marcar aula como concluída → registra COMPLETED e atualiza o
  progresso do curso.
- **Certificado:** concluídas as aulas obrigatórias → permite gerar certificado.

## 18. Roadmap pós-MVP

- **Fase 2 — Venda/Checkout:** checkout, PIX/cartão/boleto, cupons, assinaturas,
  recuperação de carrinho, webhooks, liberação automática de acesso.
- **Fase 3 — Comunidade:** feed, grupos por curso, comentários, posts, enquetes,
  ranking, moderação, notificações.
- **Fase 4 — IA:** estrutura de curso, roteiro de aula, quiz, resumo, tutor do
  aluno, alunos em risco, sugestões.
- **Fase 5 — WhatsApp/Automações:** notificações, recuperação de inativos,
  lembretes, automações por comportamento, n8n, webhooks.
- **Fase 6 — B2B/Enterprise:** empresas clientes, gestores, turmas corporativas,
  relatórios por equipe, SSO, múltiplos domínios, SLA, permissões avançadas.

## 19. Princípios de implementação

1. Todo dado principal tem `organization_id`.
2. Nenhuma organização acessa dados de outra.
3. Componentes reutilizáveis.
4. Validação com Zod.
5. Server actions / API routes organizados.
6. UI moderna e responsiva.
7. Seed com planos SaaS e SUPER_ADMIN.
8. README com instruções.
9. Migrations do Prisma.
10. Código limpo, tipado e escalável.

## 20. Ordem de implementação

1. **Fundação:** scaffold (Next/Tailwind/shadcn/Prisma/Postgres) + schema + seed.
2. **Auth & onboarding:** cadastro/login, criação automática de Organization +
   School no registro.
3. **Layout admin:** sidebar, topbar e páginas base do dashboard.
4. **Cursos:** CRUD com DRAFT/PUBLISHED/ARCHIVED.
5. **Módulos e aulas:** dentro dos cursos, com ordenação.
6. **Alunos e matrículas manuais.**
7. **Área do aluno:** cursos matriculados, conteúdo/player, progresso.
8. **Certificados:** conclusão + código de verificação.
9. **Dashboard:** métricas básicas da escola.
10. **Hardening:** isolamento multi-tenant, permissões, validações, UX.

> **Nota:** Etapas 1–3 entregues como fundação. Demais etapas seguem uma a uma.
```
