import 'server-only'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

/**
 * Uma "consulta ao banco" instrumentada: ela conta quantas vezes foi executada
 * de verdade. É esse contador que torna as camadas de cache **visíveis**.
 *
 * O contador vive na memória do processo do servidor. Reiniciar o `npm run dev`
 * zera tudo — inclusive os caches.
 */

let execucoesReais = 0

async function consultarBanco(): Promise<{ hora: string; execucao: number }> {
  execucoesReais += 1
  await new Promise((resolve) => setTimeout(resolve, 300))
  return {
    hora: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
    execucao: execucoesReais,
  }
}

export function totalDeExecucoes(): number {
  return execucoesReais
}

/* ────────────────────────────────────────────────────────────────────────────
 * CAMADA 1 — Request Memoization
 *
 * Escopo: UMA renderização (uma requisição HTTP). Duração: o render.
 *
 * Chamar a mesma função com os mesmos argumentos em cinco componentes
 * diferentes executa **uma vez só**. Isso é o que permite o padrão de "cada
 * componente busca o que precisa" sem gerar N consultas — sem precisar buscar
 * tudo no topo e fazer prop drilling.
 *
 * Para `fetch`, isso é automático: o React envolve o `fetch` global e deduplica
 * por URL + opções. Para qualquer outra coisa (Prisma, SDK, driver de banco),
 * você precisa envolver com `cache()` do React, como aqui.
 *
 * Esta camada NÃO persiste entre requisições. Recarregar a página executa de novo.
 * ──────────────────────────────────────────────────────────────────────────── */
export const consultarMemoizado = cache(consultarBanco)

/* ────────────────────────────────────────────────────────────────────────────
 * CAMADA 2 — Data Cache
 *
 * Escopo: TODAS as requisições e todos os usuários. Duração: até revalidar.
 *
 * É a camada persistente. Sobrevive entre requisições e — em produção —
 * entre deploys. É ela que permite servir milhares de usuários com uma consulta
 * ao banco a cada 30 segundos.
 *
 * As duas formas de invalidar:
 *   - por TEMPO: `revalidate: 30`
 *   - SOB DEMANDA: `revalidateTag('hora')`, disparado por webhook ou Server Action
 *
 * A segunda é a que muda o jogo: o CMS publica um artigo, chama seu webhook, e
 * a página é regenerada em segundos — sem rebuild e sem esperar o tempo passar.
 *
 * Nota sobre `fetch`: no Next 15 o padrão mudou. `fetch` agora é
 * **não cacheado** por padrão (`no-store`); para cachear é preciso pedir
 * explicitamente (`cache: 'force-cache'` ou `next: { revalidate }`). No Next 14
 * era o contrário, e essa inversão é fonte comum de confusão.
 * ──────────────────────────────────────────────────────────────────────────── */
export const consultarComDataCache = unstable_cache(consultarBanco, ['consulta-hora'], {
  revalidate: 30,
  tags: ['hora'],
})

/**
 * Sem cache nenhum: executa a cada chamada, sempre.
 * Equivalente a `fetch(url, { cache: 'no-store' })`.
 */
export const consultarSemCache = consultarBanco
