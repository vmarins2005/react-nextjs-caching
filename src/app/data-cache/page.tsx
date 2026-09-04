import { revalidatePath, revalidateTag } from 'next/cache'
import { consultarComDataCache, totalDeExecucoes } from '@/lib/dados'

export const dynamic = 'force-dynamic'

/**
 * CAMADA 2 — Data Cache.
 *
 * A camada persistente, e a que mais economiza em produção. A página é dinâmica
 * (renderiza a cada requisição), mas o DADO vem do cache — então a consulta ao
 * banco acontece uma vez a cada 30 segundos, independentemente de quantos
 * usuários chegarem.
 *
 * É a distinção que costuma confundir: **página dinâmica não significa dado não
 * cacheado.** As camadas são independentes e se combinam.
 */

async function revalidarPorTag() {
  'use server'
  // Invalida tudo que foi cacheado com a tag 'hora'. Em produção, isto é o que
  // um webhook do CMS chama ao publicar conteúdo — a página é regenerada em
  // segundos, sem rebuild e sem esperar o tempo passar.
  revalidateTag('hora')
}

async function revalidarPorCaminho() {
  'use server'
  // Invalida o cache associado a uma rota específica. Mais grosseiro que a tag,
  // e útil quando você não controla como o dado foi cacheado.
  revalidatePath('/data-cache')
}

export default async function DataCachePage() {
  const dado = await consultarComDataCache()

  return (
    <main>
      <h1>Camada 2 — Data Cache</h1>
      <p>
        Escopo: <strong>todas as requisições, todos os usuários</strong>. Duração: até
        revalidar por tempo ou sob demanda.
      </p>

      <div className="panel">
        <p style={{ fontSize: '1.6rem', margin: 0 }}>{dado.hora}</p>
        <p className="muted">
          execução real #{dado.execucao} — total de execuções no processo:{' '}
          {totalDeExecucoes()}
        </p>
      </div>

      <p>
        Recarregue várias vezes: a hora <strong>não muda</strong> e o contador não sobe.
        Uma consulta serve todos os acessos até a revalidação.
      </p>

      <h2>Invalidação sob demanda</h2>
      <p>
        Os dois botões abaixo são <strong>Server Actions</strong>. Eles não passam por
        endpoint nem por cliente HTTP — a função roda no servidor.
      </p>
      <div className="panel row">
        <form action={revalidarPorTag}>
          <button>revalidateTag(&apos;hora&apos;)</button>
        </form>
        <form action={revalidarPorCaminho}>
          <button>revalidatePath(&apos;/data-cache&apos;)</button>
        </form>
      </div>
      <p className="muted">
        Clique em qualquer um e observe o contador subir: o cache foi descartado e a
        consulta rodou de novo.
      </p>

      <h2>Tag ou caminho?</h2>
      <table className="panel" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left"></th>
            <th align="left">
              <code>revalidateTag</code>
            </th>
            <th align="left">
              <code>revalidatePath</code>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Granularidade</td>
            <td>por dado</td>
            <td>por rota</td>
          </tr>
          <tr>
            <td>Alcança várias rotas de uma vez</td>
            <td>sim</td>
            <td>não</td>
          </tr>
          <tr>
            <td>Caso típico</td>
            <td>webhook do CMS: &quot;o produto X mudou&quot;</td>
            <td>&quot;esta tela específica ficou obsoleta&quot;</td>
          </tr>
        </tbody>
      </table>
      <p>
        Prefira <strong>tags</strong>: elas descrevem o dado, não a tela. Quando um
        produto muda, todas as rotas que o exibem são invalidadas de uma vez — sem que
        ninguém precise lembrar da lista de rotas afetadas.
      </p>
    </main>
  )
}
