import { consultarSemCache, totalDeExecucoes } from '@/lib/dados'

export const dynamic = 'force-dynamic'

export default async function DinamicaPage() {
  const dado = await consultarSemCache()
  return (
    <main>
      <h1>Sem cache — totalmente dinamica</h1>
      <p>
        Equivalente a <code>fetch(url, {'{'} cache: &apos;no-store&apos; {'}'})</code>.
        Executa a consulta a cada requisicao, sempre.
      </p>
      <div className="panel">
        <p style={{ fontSize: '1.6rem', margin: 0 }}>{dado.hora}</p>
        <p className="muted">execucao real #{dado.execucao} — total no processo: {totalDeExecucoes()}</p>
      </div>
      <p>Recarregue: o numero sobe toda vez. E o comportamento correto para dado por usuario, saldo, carrinho, estoque em tempo real.</p>
      <h2>O custo</h2>
      <p>
        Toda requisicao paga os 300ms da consulta e a renderizacao no servidor. Numa rota
        de alto trafego, isso e a diferenca entre uma instancia e vinte. Use quando o dado
        precisa ser fresco de verdade — nao por padrao.
      </p>
    </main>
  )
}
