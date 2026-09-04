# O modelo de cache do Next.js

> **Stack:** Next.js 15 (App Router) + React 19
> **Conceito:** as quatro camadas de cache, como se combinam, e como diagnosticar
> "dado velho na tela"

---

## O problema que este projeto ataca

Esta é a pergunta que mais separa **"eu usei Next"** de **"eu domino Next"**.

O App Router tem **quatro caches independentes**, com escopos e durações
diferentes. Invalidar um não invalida os outros. Praticamente todo bug de
"mudei o dado e a tela não atualizou" vem daí — e o desenvolvedor que não tem o
modelo na cabeça tenta `router.refresh()`, `revalidatePath()`, `cache: 'no-store'`
e `dynamic = 'force-dynamic'` na base da tentativa e erro, até algo funcionar.
Depois não sabe dizer por quê, e o `force-dynamic` fica lá para sempre,
desligando o cache de uma rota inteira.

---

## As quatro camadas

| Camada | Onde vive | Escopo | Duração | Como invalidar |
|---|---|---|---|---|
| **1. Request Memoization** | servidor | uma renderização | o render | automático |
| **2. Data Cache** | servidor | todos os usuários | até revalidar | `revalidateTag`, `revalidatePath`, tempo |
| **3. Full Route Cache** | servidor / CDN | a rota inteira | até revalidar | `revalidatePath`, `revalidate`, deploy |
| **4. Router Cache** | **navegador** | uma sessão | a sessão | `router.refresh()`, `revalidatePath` |

O caminho de uma requisição:

```
navegador                             servidor
────────────────────────────────────────────────────────────────
clique no <Link>
   │
   ├─► [4] Router Cache tem?  ──sim──► renderiza na hora. FIM.
   │        não
   ▼
requisição ao servidor
   │
   ├─► [3] Full Route Cache tem?  ──sim──► devolve HTML/RSC pronto. FIM.
   │        não
   ▼
renderiza os Server Components
   │
   ├─► [1] já chamou esta função neste render?  ──sim──► reusa
   │        não
   ▼
   ├─► [2] Data Cache tem?  ──sim──► devolve o dado cacheado
   │        não
   ▼
consulta o banco / a API de verdade
```

---

## Rodando

```bash
npm install
npm run dev
```

Cada rota isola uma camada, com um **contador de execuções reais** que torna o
cache visível. Abra o DevTools na aba Network.

```bash
npm run build
```

A tabela de rotas mostra `○ (Static)` vs `ƒ (Dynamic)` — olhar isso deveria
fazer parte do code review.

---

## As rotas

| Rota | Camada | O que observar |
|---|---|---|
| `/memoizacao` | 1 | três componentes pedem o mesmo dado; a função executa **uma vez** |
| `/data-cache` | 2 | a hora não muda entre recarregamentos; dois botões de Server Action invalidam |
| `/isr` | 3 | `revalidate = 15`, com comportamento stale-while-revalidate |
| `/router-cache` | 4 | prefetch no hover, navegação instantânea, e o bug clássico explicado |
| `/dinamica` | nenhuma | executa sempre — e o custo disso |

---

## A mudança do Next 15 que confunde todo mundo

No **Next 14**, `fetch` era cacheado **por padrão** (`force-cache`).
No **Next 15**, o padrão inverteu: agora é **não cacheado** (`no-store`), e
cachear passou a ser uma escolha explícita.

A mudança foi feita porque o padrão antigo surpreendia — as pessoas viam dado
velho sem ter pedido cache nenhum. O padrão novo é mais previsível e **mais
caro**. Se você migrou de 14 para 15 e a conta de infraestrutura subiu, é aqui
que olhar primeiro.

---

## O que desliga o cache de rota sem aviso

A rota vira dinâmica automaticamente ao usar qualquer **API dinâmica**:

- `cookies()`, `headers()`
- `searchParams` na página
- `export const dynamic = 'force-dynamic'`
- `fetch` com `cache: 'no-store'`

Um `cookies()` adicionado num componente qualquer da árvore desliga o cache da
**rota inteira**. O único sinal é a rota mudar de `○` para `ƒ` na saída do build.

---

## Checklist de diagnóstico

Quando aparecer "dado velho na tela", pergunte nesta ordem:

1. **Abra numa aba anônima.** Correto? → é **Router Cache** (camada 4).
2. **Ainda velho?** Rode `npm run build`. A rota é `○ (Static)`? → **Full Route
   Cache** (camada 3).
3. **A rota é dinâmica mas o dado é velho?** → **Data Cache** (camada 2).
4. **Componentes diferentes mostram valores diferentes na mesma tela?** → falta
   **memoização** (camada 1).

---

## Decisões documentadas

- [ADR-001 — Invalidar por tag, não por caminho](./docs/ADR-001-invalidar-por-tag.md)
- [ADR-002 — Cache explícito por rota, com `force-dynamic` como exceção justificada](./docs/ADR-002-cache-explicito-por-rota.md)

---

## Exercícios

1. **Veja a memoização.** Em `/memoizacao`, os três componentes mostram o mesmo
   número de execução. Remova o `cache()` de `consultarMemoizado` em
   `lib/dados.ts` e recarregue: três números diferentes, três consultas de 300ms.

2. **Veja o Data Cache.** Em `/data-cache`, recarregue dez vezes e confirme que o
   contador não sobe. Clique em `revalidateTag('hora')` e observe subir uma vez.

3. **Veja o stale-while-revalidate.** Em `/isr`, espere 15 segundos e recarregue
   **duas** vezes seguidas. A primeira ainda mostra o valor antigo; a segunda,
   o novo. Entender por que é o objetivo do exercício.

4. **Desligue o cache sem querer.** Adicione `import { cookies } from 'next/headers'`
   e `await cookies()` na página `/isr`. Rode `npm run build` e observe a rota
   mudar de `○` para `ƒ`. Você acabou de reproduzir o acidente mais comum de
   performance em App Router.

5. **Reproduza o bug do Router Cache.** Navegue para `/data-cache`, clique em
   revalidar, vá para outra rota e volte pelo `<Link>`. Dependendo do momento,
   você vê o valor antigo — servido pelo navegador. Confirme abrindo em aba
   anônima.

6. **O exercício de tech lead.** Liste as rotas do seu produto e classifique cada
   uma: estática, ISR (com qual janela) ou dinâmica. Para cada dinâmica,
   responda: **ela precisa ser?** Costuma haver de duas a cinco rotas dinâmicas
   por acidente, e converter uma delas para ISR é frequentemente a maior
   economia de infraestrutura disponível — com PR de três linhas.

---

## A frase para levar

> **São quatro caches, não um.**

Quando o dado vier velho, a primeira pergunta não é "como forço atualizar?" — é
**"qual das quatro camadas está me servindo isto?"**. A resposta determina a
correção; sem ela, você está adivinhando.


---

## Faz parte de uma série

16 projetos independentes, um por conceito, sobre o que separa um dev pleno de um
senior/tech lead em React e Next.js. Cada um tem README, ADRs documentando as
decisões, e exercícios.

| Projeto | Conceito |
|---|---|
| [react-solid-na-pratica](https://github.com/vmarins2005/react-solid-na-pratica) | Os 5 principios SOLID traduzidos para componentes React, com anti-exemplo e versao boa lado a lado |
| [react-quando-abstrair](https://github.com/vmarins2005/react-quando-abstrair) | A mesma feature em 3 versoes: duplicada, abstraida cedo demais, e abstraida na hora certa |
| [react-padroes-de-componentes](https://github.com/vmarins2005/react-padroes-de-componentes) | Compound, headless, slots, state reducer e estado controlavel: como absorver variacao sem explodir em props |
| [react-arquitetura-por-feature](https://github.com/vmarins2005/react-arquitetura-por-feature) | Organizacao por feature em Next.js, com fronteiras garantidas por ESLint em vez de disciplina |
| [react-regra-de-negocio-no-front](https://github.com/vmarins2005/react-regra-de-negocio-no-front) | Clean Architecture no front: dominio puro, portas e adaptadores, sem uma linha de React no nucleo |
| [react-onde-mora-o-estado](https://github.com/vmarins2005/react-onde-mora-o-estado) | Os 6 tipos de estado em React e a ferramenta certa para cada um |
| [react-estados-impossiveis](https://github.com/vmarins2005/react-estados-impossiveis) | Da sopa de booleanos ao XState: tornar estados invalidos inexprimiveis |
| [react-typescript-na-fronteira](https://github.com/vmarins2005/react-typescript-na-fronteira) | Tipo nao existe em runtime: validacao com Zod, branded types e verificacao de exaustividade |
| [react-testes-que-valem-a-pena](https://github.com/vmarins2005/react-testes-que-valem-a-pena) | Testing Trophy com Vitest, Testing Library, MSW, Playwright e axe |
| [react-performance-no-next](https://github.com/vmarins2005/react-performance-no-next) | Waterfalls de requisicao, streaming com Suspense e o que RSC realmente economiza de bundle |
| `react-entendendo-o-cache-do-next` **(você está aqui)** | As 4 camadas de cache do App Router e como diagnosticar dado velho na tela |
| [react-acessibilidade-na-pratica](https://github.com/vmarins2005/react-acessibilidade-na-pratica) | WCAG 2.2 AA em React: foco, teclado, live regions e os requisitos invisiveis em code review |
| [react-seguranca-no-next](https://github.com/vmarins2005/react-seguranca-no-next) | Server Action e endpoint publico: autorizacao, validacao, rate limit e CSP com nonce |
| [react-quando-quebra-em-producao](https://github.com/vmarins2005/react-quando-quebra-em-producao) | Taxonomia de erros, error boundaries, log estruturado e feature flags com kill switch |
| [react-design-system-em-monorepo](https://github.com/vmarins2005/react-design-system-em-monorepo) | Design system como pacote versionado: Turborepo, design tokens e changesets |
| [react-commits-que-contam-historia](https://github.com/vmarins2005/react-commits-que-contam-historia) | Commit atomico e Conventional Commits, com historico curado e um bug para achar via git bisect |

---

## Licença

[MIT](./LICENSE) — use, copie e adapte à vontade, inclusive em projeto comercial.
Se este material ajudou, uma estrela no repositório é o suficiente.
