import { consultarMemoizado, totalDeExecucoes } from '@/lib/dados'

export const dynamic = 'force-dynamic'

/**
 * CAMADA 1 — Request Memoization.
 *
 * Tres componentes diferentes pedem o mesmo dado. Sem memoizacao seriam tres
 * consultas de 300ms cada. Com ela, uma so - e os tres recebem o mesmo objeto.
 *
 * O ganho de arquitetura e maior que o de performance: voce pode escrever cada
 * componente buscando exatamente o que precisa, sem prop drilling e sem um
 * "container" no topo que busca tudo para todo mundo. A colocation volta a ser
 * possivel sem custo.
 */

async function Cabecalho() {
  const dado = await consultarMemoizado()
  return <p>Cabecalho leu: <code>{dado.hora}</code> (execucao #{dado.execucao})</p>
}

async function Corpo() {
  const dado = await consultarMemoizado()
  return <p>Corpo leu: <code>{dado.hora}</code> (execucao #{dado.execucao})</p>
}

async function Rodape() {
  const dado = await consultarMemoizado()
  return <p>Rodape leu: <code>{dado.hora}</code> (execucao #{dado.execucao})</p>
}

export default async function MemoizacaoPage() {
  const antes = totalDeExecucoes()
  return (
    <main>
      <h1>Camada 1 — Request Memoization</h1>
      <p>
        Escopo: <strong>uma renderizacao</strong>. Duracao: o render. Nao persiste entre
        requisicoes.
      </p>

      <div className="panel">
        <Cabecalho />
        <Corpo />
        <Rodape />
      </div>

      <p>
        Os tres numeros de execucao sao <strong>iguais</strong>: a funcao rodou uma vez.
        Total de execucoes antes desta pagina renderizar: {antes}.
      </p>

      <h2>O que observar</h2>
      <ul>
        <li>Recarregue: os tres continuam iguais entre si, mas o numero sobe em 1.</li>
        <li>
          Isso confirma que a memoizacao vale <em>dentro</em> do render, e nao entre
          requisicoes — para isso existe a camada 2.
        </li>
        <li>
          Para <code>fetch</code>, isso e automatico. Para Prisma, SDK ou driver de banco,
          envolva com <code>cache()</code> do React.
        </li>
      </ul>
    </main>
  )
}
