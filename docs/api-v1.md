# REST API v1 — Integração externa (Aulai)

API máquina-a-máquina para um sistema externo (ex.: **Aulai**) criar e publicar
cursos no ClassOS de forma automática e idempotente.

## Autenticação

Toda requisição leva a chave da escola no header:

```
x-api-key: clsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- A chave é **por organização (escola)**. O `organizationId` é resolvido a
  partir da chave — o corpo da requisição nunca define o tenant.
- Guardamos apenas o **hash SHA-256** da chave; o valor em claro é exibido uma
  única vez na emissão.
- Chave ausente/inválida/revogada → `401`. Organização suspensa/cancelada →
  `401`.

### Emitir uma chave

Sem UI por enquanto — via script (mostra o token uma única vez):

```bash
pnpm tsx scripts/issue-api-key.ts --school <slug-ou-id> --name "Aulai"
```

Copie o token exibido e guarde **cifrado** no lado do Aulai (por escola).

## `POST /api/v1/courses` — criar/atualizar curso (bulk)

Cria ou atualiza um curso inteiro (curso → módulos → aulas) numa única chamada
atômica. **Idempotente** por `(organização, sourceRef)`: reenviar o mesmo
`sourceRef` atualiza o curso existente em vez de duplicar.

### Corpo

```jsonc
{
  "sourceRef": "aulai_course_123",   // obrigatório — id do curso no Aulai
  "title": "Meu curso",
  "subtitle": "Opcional",
  "description": "Opcional",
  "level": "ALL_LEVELS",             // BEGINNER | INTERMEDIATE | ADVANCED | ALL_LEVELS
  "visibility": "PRIVATE",           // PUBLIC | PRIVATE | UNLISTED
  "category": "Opcional",
  "price": 0,                        // opcional, em BRL
  "publish": true,                   // padrão true; publica se houver >=1 módulo com aula
  "modules": [
    {
      "sourceRef": "aulai_module_1", // opcional, mas recomendado (ver nota)
      "title": "Módulo 1",
      "description": "Opcional",
      "lessons": [
        {
          "sourceRef": "aulai_lesson_1", // opcional, mas recomendado
          "title": "Aula 1",
          "contentType": "VIDEO",        // VIDEO | TEXT | PDF | AUDIO | LIVE | EMBED
          "videoProvider": "youtube",    // youtube | vimeo | file
          "videoSource": "https://www.youtube.com/watch?v=...", // URL ou ID
          "durationMinutes": 12,
          "isPreview": false,
          "isRequired": true
        }
      ]
    }
  ]
}
```

`videoSource` é normalizado pelo mesmo registry da UI (`src/lib/video`): aceita
URL completa ou ID, para `youtube`/`vimeo`/`file`.

### Resposta

```jsonc
// 201 (criado) ou 200 (atualizado)
{ "id": "clxxxx...", "published": true }
```

Erros: `400` (corpo inválido, com `details`), `401` (auth), `500` (falha
interna, sem detalhes vazados).

### Nota sobre `sourceRef` em módulos/aulas (preserva progresso)

Ao **republicar**, os nós que trazem `sourceRef` são casados com os existentes e
**atualizados no lugar** — o progresso dos alunos (`LessonProgress`) é
preservado. Nós removidos do payload são apagados (e só o progresso deles é
perdido). Se você **não** enviar `sourceRef` em módulos/aulas, a primeira
publicação funciona, mas uma republicação recria a árvore e zera o progresso.
**Recomendado:** sempre enviar o id do Aulai como `sourceRef` em cada nível.
