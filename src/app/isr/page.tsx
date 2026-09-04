import { consultarSemCache, totalDeExecucoes } from '@/lib/dados'

/**
 * CAMADA 3 — Full Route Cache (e ISR).
 *
 * Escopo: a rota inteira. O Next guarda o **HTML e o payload RSC** já
 * renderizados. Ninguém executa componente nenhum: a resposta sai pronta,
 * servida de CDN.
 *
 * `export const revalidate = 15` transforma esta rota em ISR: ela é estática,
 * mas se regenera a cada 15 segundos — no primeiro acesso que chegar depois
 * desse prazo.
 *
 * O detalhe que faz o ISR valer a pena, e que é pergunta de entrevista:
 * a regeneração é **stale-while-revalidate**. O primeiro visitante após os 15s
 * ainda recebe a versão antiga, instantaneamente; a nova é gerada em segundo
 * plano e servida a partir do próximo. Ninguém espera.
 */
export const revalidate = 15

export default async function IsrPage() {
  const dado = await consultarSemCache()

  return (
    <main>
      <h1>Camada 3 — Full Route Cache (ISR)</h1>
      <p>
        Escopo: <strong>a rota inteira</strong>, HTML e payload RSC já renderizados.
        Duração: 15 segundos, neste exemplo.
      </p>

      <div className="panel">
        <p style={{ fontSize: '1.6rem', margin: 0 }}>{dado.hora}</p>
        <p className="muted">
          execução real #{dado.execucao} — total no processo: {totalDeExecucoes()}
        </p>
      </div>

      <p>
        Recarregue rapidamente: nada muda, porque a resposta inteira está cacheada.
        Espere 15 segundos, recarregue duas vezes — a primeira ainda mostra o valor
        antigo (stale) e a segunda mostra o novo.
      </p>

      <h2>Por que ISR é o melhor dos dois mundos</h2>
      <table className="panel" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Estratégia</th>
            <th align="left">Velocidade</th>
            <th align="left">Frescor</th>
            <th align="left">Custo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SSG puro</td>
            <td>máxima (CDN)</td>
            <td>só muda com rebuild</td>
            <td>mínimo</td>
          </tr>
          <tr>
            <td>SSR puro</td>
            <td>depende do servidor</td>
            <td>sempre fresco</td>
            <td>alto: render por requisição</td>
          </tr>
          <tr>
            <td>
              <strong>ISR</strong>
            </td>
            <td>máxima (CDN)</td>
            <td>fresco dentro da janela</td>
            <td>quase mínimo</td>
          </tr>
        </tbody>
      </table>
      <p>
        Para catálogo, blog, landing e página de produto — conteúdo público que muda de
        vez em quando — ISR entrega desempenho de estático com frescor aceitável. É a
        escolha padrão desse tipo de conteúdo, e o principal argumento a favor do Next
        num e-commerce.
      </p>

      <h2>O que desliga esta camada, sem aviso</h2>
      <p>
        A rota vira dinâmica automaticamente ao usar qualquer <strong>API dinâmica</strong>:
      </p>
      <ul>
        <li>
          <code>cookies()</code>, <code>headers()</code>
        </li>
        <li>
          <code>searchParams</code> na página
        </li>
        <li>
          <code>export const dynamic = &apos;force-dynamic&apos;</code>
        </li>
        <li>
          <code>fetch</code> com <code>cache: &apos;no-store&apos;</code>
        </li>
      </ul>
      <p className="muted">
        Um <code>cookies()</code> adicionado num componente qualquer da árvore desliga o
        cache da rota inteira — e o único sinal é a rota aparecer como{' '}
        <code>ƒ (Dynamic)</code> em vez de <code>○ (Static)</code> na saída de{' '}
        <code>npm run build</code>. Olhar essa tabela deveria fazer parte do code review.
      </p>
    </main>
  )
}
