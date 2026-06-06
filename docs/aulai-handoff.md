# Handoff: integração Aulai → ClassOS

Cole isto na sessão que desenvolve o **Aulai**. O lado do **ClassOS já está pronto
e validado em produção** (emissão de key por escola + `POST /api/v1/courses`
idempotente). Aqui está o contrato e o que falta ajustar **no Aulai**.

## Contrato (já no ar)

```
POST {CLASSOS_API_URL}/courses        # CLASSOS_API_URL = https://app.classos.com/api/v1
Header: x-api-key: <chave da escola>  # por escola, NÃO global
→ 201 (criado) | 200 (atualizado)  { "id": "...", "published": true }
```

Body (curso → módulos → aulas, numa única chamada, idempotente por `sourceRef`):

```jsonc
{
  "sourceRef": "<id do curso no Aulai>",   // OBRIGATÓRIO — chave de idempotência
  "title": "string",
  "subtitle": "string?",
  "description": "string?",
  "level": "BEGINNER|INTERMEDIATE|ADVANCED|ALL_LEVELS", // default ALL_LEVELS
  "visibility": "PUBLIC|PRIVATE|UNLISTED",              // default PRIVATE
  "category": "string?",
  "price": 0,                              // opcional, BRL
  "publish": true,                         // default true; publica se houver >=1 módulo com aula
  "modules": [
    {
      "sourceRef": "<id do módulo no Aulai>",   // opcional MAS recomendado
      "title": "string",
      "description": "string?",
      "lessons": [
        {
          "sourceRef": "<id da aula no Aulai>", // opcional MAS recomendado
          "title": "string",
          "contentType": "VIDEO|TEXT|PDF|AUDIO|LIVE|EMBED", // default VIDEO
          "videoProvider": "youtube|vimeo|file",
          "videoSource": "URL completa ou ID",  // ex.: https://youtube.com/watch?v=...
          "durationMinutes": 12,
          "isPreview": false,
          "isRequired": true
        }
      ]
    }
  ]
}
```

Erros: `400` (body inválido, vem `{ error, details }`), `401` (key
ausente/inválida/revogada ou escola suspensa), `500` (falha interna).

## Ajustes necessários no Aulai

1. **Key por escola, não global.** Tirar `CLASSOS_API_KEY` do env e guardar a
   chave no registro `Client` (a escola/clínica), **cifrada** — nunca em texto
   puro. Migration sugerida: `classOsApiKey String?` (valor cifrado) no `Client`.

2. **`src/lib/publish/classos.ts`** passa a ler a key de `course.client`
   (decifrar em runtime) em vez de `process.env.CLASSOS_API_KEY`.

3. **Enviar `sourceRef` em todos os níveis** — curso (já enviava bulk + lia
   `json.id` ✔), **e também** cada módulo e cada aula, usando os ids do próprio
   Aulai. Isso é o que permite **republicar preservando o progresso dos alunos**:
   o ClassOS reconcilia por `sourceRef` em vez de recriar a árvore. Sem
   `sourceRef` em módulos/aulas, a 1ª publicação funciona, mas republicar
   recria tudo e zera o progresso.

## Como obter a chave de uma escola (lado ClassOS, ops)

Sem UI por enquanto — via script no container de produção (Coolify → Terminal):

```bash
node prisma/issue-api-key.mjs                              # lista as escolas (descobrir o slug)
node prisma/issue-api-key.mjs --school <slug> --name "Aulai"   # emite (token aparece 1x)
```

Copie o token (`clsk_...`) e cole **cifrado** no `Client` correspondente do Aulai.
**Nunca** cole o token em chat/logs.
