# ADR-001 — Invalidar cache por tag, não por caminho

- **Status:** Aceito
- **Data:** 2026-09-04

## Contexto

Um produto aparece em várias rotas: `/produtos`, `/produtos/[slug]`,
`/categorias/[cat]`, a busca, a home, e o carrossel de "relacionados" em
qualquer página de produto.

Quando o produto muda, todas precisam ser revalidadas.

Com `revalidatePath`, isso exige uma lista explícita de rotas afetadas — e essa
lista:

- é escrita por quem implementou a mutação, que nem sempre conhece todas as telas
- fica desatualizada assim que alguém adiciona uma tela nova
- não tem como ser verificada por ferramenta nenhuma
- falha em silêncio: a tela esquecida simplesmente mostra dado velho, e ninguém
  descobre até virar reclamação de cliente

O problema estrutural é que `revalidatePath` acopla a **mutação** ao
**roteamento**. Quem salva um produto passa a precisar saber onde produtos são
exibidos.

## Decisão

Todo dado cacheado recebe **tags** que descrevem o **dado**, não a tela:

```ts
// na leitura
unstable_cache(buscarProduto, ['produto'], { tags: ['produto', `produto:${id}`] })

// na escrita
revalidateTag(`produto:${id}`)   // esta entidade
revalidateTag('produto')          // qualquer listagem de produtos
```

Convenção de nomes: `<entidade>` para coleções, `<entidade>:<id>` para
instâncias.

`revalidatePath` fica restrito a dois casos: revalidar uma rota inteira por
motivo alheio ao dado (mudou o layout, mudou uma configuração global), e
invalidar o Router Cache do cliente após uma Server Action.

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que não |
|---|---|---|---|
| `revalidatePath` por rota | Direto; sem convenção a manter | Acopla mutação a roteamento; lista desatualiza; falha em silêncio | É o problema |
| `revalidatePath('/', 'layout')` | Simples; pega tudo | Invalida o site inteiro a cada mudança de um produto; destrói o hit rate | Marreta |
| TTL curto em tudo | Zero código de invalidação | Ou o dado fica velho, ou o custo explode; nunca os dois certos | Não resolve, escolhe qual problema ter |
| Tags por entidade | Desacopla; uma chamada alcança todas as rotas; verificável | Exige convenção e disciplina de nomes | **Escolhido** |

## Consequências

**Positivas**
- Quem escreve a mutação **não precisa saber** onde o dado é exibido. Isso é
  desacoplamento real, não organizacional.
- Adicionar uma tela nova que consome produtos não exige lembrar de atualizar
  lista nenhuma — ela já está coberta pela tag.
- Webhook do CMS fica trivial: `POST /api/revalidate { tag: 'produto:123' }`.
- Invalidação granular preserva o hit rate do resto do cache.

**Negativas**
- Convenção de nomes precisa ser seguida por todo mundo. Uma tag escrita errado
  falha em silêncio — o mesmo modo de falha que estamos tentando evitar, só que
  em outro lugar. **Mitigação:** centralizar as tags em funções tipadas
  (`tagsDeProduto(id)`), nunca literais espalhados pelo código.
- Tag esquecida na leitura significa dado que nunca invalida.
- Nem toda infraestrutura de self-host suporta invalidação por tag de forma
  distribuída — em cluster com múltiplas instâncias, é preciso um cache handler
  compartilhado (Redis). Na Vercel funciona nativamente.

**Monitorar**
- Ocorrências de `revalidatePath` fora dos dois casos permitidos.
- Literais de tag no código: devem ser zero, todas vindo das funções tipadas.

## Nota transferível

> **Tags descrevem o dado; caminhos descrevem a tela.**

Dado é estável; telas mudam toda semana. Ancorar a invalidação no que é estável
é a mesma lógica que faz você nomear uma variável pelo que ela é, e não por
onde é usada.
