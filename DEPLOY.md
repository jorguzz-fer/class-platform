# Deploy — ClassOS (VPS Hostinger + Coolify)

Guia para subir o ClassOS numa VPS com [Coolify](https://coolify.io), usando um
Postgres provisionado pelo próprio Coolify.

> O app é um Next.js (App Router) com build **standalone** + **Docker**. As
> migrations do Prisma são aplicadas automaticamente no start do container
> (`docker-entrypoint.sh` → `prisma migrate deploy`).

## Pré-requisitos

- VPS com Coolify instalado e um domínio apontando para o IP da VPS.
- Repositório GitHub conectado ao Coolify.

## 1. Provisionar o PostgreSQL

No Coolify: **+ New → Database → PostgreSQL**.

- Anote o nome do serviço; o Coolify fornece uma **connection string interna**
  (algo como `postgres://user:senha@<servico>:5432/postgres`).
- Use essa string como `DATABASE_URL` do app (rede interna entre os containers).

## 2. Criar o aplicativo

**+ New → Application → from GitHub** → selecione o repositório e a branch.

- **Build Pack:** Dockerfile (o Coolify detecta o `Dockerfile` na raiz).
- **Port:** `3000`.
- Configure o **domínio** e ative o **SSL (Let's Encrypt)** — o Coolify cuida do
  certificado automaticamente.

## 3. Variáveis de ambiente

Em **Environment Variables**, defina (mínimo para subir):

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | String interna do Postgres do Coolify |
| `AUTH_SECRET` | ✅ | Gere com `openssl rand -base64 32` |
| `AUTH_URL` | ✅ | URL pública (ex.: `https://app.seudominio.com`) |
| `SEED_SUPERADMIN_EMAIL` | ✅ (1ª vez) | E-mail do super admin para o seed |
| `SEED_SUPERADMIN_PASSWORD` | ✅ (1ª vez) | Senha forte para o seed |
| `RESEND_API_KEY` | — | Sem ela, e-mail só loga no servidor |
| `EMAIL_FROM` | — | Remetente verificado no Resend |
| `ANTHROPIC_API_KEY` | — | Sem ela, IA usa provider mock |
| `WHATSAPP_API_URL` / `WHATSAPP_API_TOKEN` | — | Gateway de WhatsApp |
| `CRON_SECRET` | — | Habilita as rotas de automação |
| `PAYMENT_PROVIDER` | — | Vazio = checkout mock |
| `PAYMENT_WEBHOOK_SECRET` | — | Habilita `/api/payments/webhook` |

> **Nunca** commite valores reais. Defina-os apenas no painel do Coolify.

## 4. Deploy

Clique em **Deploy**. O fluxo do container:

1. Build da imagem (Dockerfile multi-stage, `prisma generate` + `next build`).
2. Sobe o servidor standalone (`node server.js`) na porta 3000.

> **Migrations não rodam automaticamente no start** (de propósito): se o serviço
> escalar para várias réplicas, todas tentariam migrar ao mesmo tempo. Aplique as
> migrations num passo separado (abaixo).

A cada push na branch configurada, o Coolify rebuilda e redeploya.

### Aplicar migrations (passo controlado)

Aplique **antes** de subir/escalar o app. No Coolify, use um **Pre-deployment
command** ou um **terminal/exec** no container:

```sh
node node_modules/prisma/build/index.js migrate deploy
```

Alternativa: definir `RUN_MIGRATIONS=true` apenas numa execução one-shot (o
`docker-entrypoint.sh` migra antes de subir o servidor quando essa var está
setada). `migrate deploy` é idempotente — só aplica migrations pendentes.

## 5. Seed inicial (uma vez)

Após aplicar as migrations, crie os planos SaaS e o usuário SUPER_ADMIN. No
**terminal/exec** do container do app, rode (o seed é JS puro — roda com `node`,
sem depender de `tsx`):

```sh
node prisma/seed.mjs
```

(Usa `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` das env vars.) É
idempotente — pode rodar de novo sem duplicar.

> Alternativa: `prisma db seed` (lê o comando de `package.json#prisma.seed`) —
> mas o caminho direto acima é mais robusto na imagem standalone.

> Alternativa: rodar uma vez localmente apontando `DATABASE_URL` para o banco de
> produção.

## 6. Pós-deploy — checklist

- [ ] Acessar `https://<seu-dominio>` → landing carrega.
- [ ] `/register` cria escola (Organization + School + trial).
- [ ] `/login` com o super admin → redireciona para `/admin`.
- [ ] HSTS e demais headers presentes (já configurados no `next.config.ts`).
- [ ] Configurar os providers reais conforme necessário (Resend, Anthropic,
      gateway de pagamento, WhatsApp) via env e redeploy.

## Notas

- **Migrations**: nunca rode `prisma migrate dev` em produção — o container usa
  `migrate deploy`. Novas migrations são criadas em desenvolvimento, commitadas
  e aplicadas automaticamente no próximo deploy.
- **Vídeo**: o MVP usa fontes por link (YouTube/Vimeo/arquivo direto) — não há
  storage de upload para configurar. Ao plugar upload (R2/S3/Mux/Bunny), adicione
  as envs correspondentes.
- **Backups**: configure o backup automático do Postgres no Coolify.
- **Webhooks de pagamento**: aponte o gateway para
  `https://<seu-dominio>/api/payments/webhook` e use o mesmo `PAYMENT_WEBHOOK_SECRET`.
