# ADR-002 — Declarar a estratégia de cache explicitamente em cada rota

- **Status:** Aceito
- **Data:** 2026-09-04

## Contexto

Duas patologias opostas, ambas causadas pela **ausência de decisão**:

**1. `force-dynamic` como analgésico.** Alguém vê dado velho, não entende qual
das quatro camadas está servindo, e adiciona `export const dynamic = 'force-dynamic'`.
Funciona. Fica lá para sempre. Meses depois, metade das rotas é dinâmica, a
conta de infraestrutura triplicou, e ninguém sabe quais daquelas linhas ainda
são necessárias — porque nenhuma tem justificativa escrita.

**2. Dinâmico por acidente.** Alguém adiciona `cookies()` num componente de
analytics no fundo da árvore. A rota inteira sai do Full Route Cache. Nenhum
erro, nenhum aviso — só a rota mudando de `○` para `ƒ` numa tabela que ninguém
lê.

O denominador comum: **a estratégia de cache é o resultado acidental de outras
escolhas**, em vez de uma decisão consciente por rota.

## Decisão

Toda rota declara sua estratégia **explicitamente no topo do arquivo**, com um
comentário de uma linha justificando:

```ts
// Catálogo público: muda algumas vezes por dia. ISR de 5 min é suficiente.
export const revalidate = 300
```

```ts
// Dashboard do usuário: dado por sessão, nunca cacheável.
export const dynamic = 'force-dynamic'
```

Regras:
- **estático + ISR é o padrão** para conteúdo público
- `force-dynamic` exige justificativa escrita; sem ela, é apontamento de review
- a saída de `npm run build` (`○` vs `ƒ`) faz parte do checklist de PR
- APIs dinâmicas (`cookies()`, `headers()`) só no componente que precisa delas,
  isolado atrás de um `<Suspense>` para não contaminar a rota inteira

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que não |
|---|---|---|---|
| Deixar o padrão do framework decidir | Zero esforço | O padrão mudou entre Next 14 e 15; ninguém sabe qual é sem consultar; resultado acidental | É o problema |
| `force-dynamic` em tudo | Nunca há dado velho; simples de raciocinar | Joga fora a principal vantagem do Next; custo alto e desnecessário | Desperdício deliberado |
| Estático em tudo + revalidação sob demanda | Custo mínimo; máxima velocidade | Impossível para dado por usuário; exige webhook confiável para tudo | Ideal onde cabe; não cabe em tudo |
| Declaração explícita por rota, com justificativa | Decisão consciente e auditável; padrão barato | Exige disciplina; um comentário a mais por rota | **Escolhida** |

## Consequências

**Positivas**
- A estratégia vira **decisão revisável**: dá para discutir "esta rota precisa
  mesmo ser dinâmica?" num PR, com o comentário do autor como ponto de partida.
- `force-dynamic` acidental fica visível na revisão.
- A tabela do build vira um instrumento de trabalho, não ruído no terminal.
- Onboarding melhora: qualquer pessoa abre a rota e entende o comportamento sem
  precisar do modelo mental completo das quatro camadas.

**Negativas**
- Um comentário e uma linha a mais em cada rota.
- Exige que o time entenda o modelo de cache — o que é custo real de treinamento,
  e é justamente o que este projeto existe para reduzir.
- A justificativa pode virar formalidade vazia ("// dinâmica porque precisa ser")
  se a revisão não cobrar substância.

**Monitorar**
- Proporção de rotas `ƒ` no build. Crescimento sustentado é sinal de que
  `force-dynamic` voltou a ser usado como analgésico.
- Custo de invocação de função serverless por rota, que é a métrica de negócio
  correspondente.

## Nota transferível

O princípio se aplica bem além de cache:

> **Comportamento que depende de um padrão implícito do framework deve ser
> declarado explicitamente onde importa.**

Padrões mudam entre versões — este mudou entre Next 14 e 15. Código que declara
sua intenção sobrevive à atualização; código que herda o padrão muda de
comportamento sem que ninguém tenha decidido nada.
