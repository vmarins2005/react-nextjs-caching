import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <h1>O modelo de cache do Next.js</h1>
      <p>
        São <strong>quatro caches independentes</strong>, com escopos e durações
        diferentes. Invalidar um não invalida os outros — e é daí que vem
        praticamente todo bug de &quot;dado velho na tela&quot; do App Router.
      </p>

      <h2>As quatro camadas</h2>
      <table className="panel" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Camada</th>
            <th align="left">Onde vive</th>
            <th align="left">Escopo</th>
            <th align="left">Duração</th>
            <th align="left">Como invalidar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Link href="/memoizacao">1. Request Memoization</Link>
            </td>
            <td>servidor</td>
            <td>uma renderização</td>
            <td>o render</td>
            <td>automático ao terminar</td>
          </tr>
          <tr>
            <td>
              <Link href="/data-cache">2. Data Cache</Link>
            </td>
            <td>servidor</td>
            <td>todos os usuários</td>
            <td>até revalidar</td>
            <td>
              <code>revalidateTag</code>, <code>revalidatePath</code>, tempo
            </td>
          </tr>
          <tr>
            <td>
              <Link href="/isr">3. Full Route Cache</Link>
            </td>
            <td>servidor / CDN</td>
            <td>a rota inteira</td>
            <td>até revalidar</td>
            <td>
              <code>revalidatePath</code>, <code>revalidate</code>, deploy
            </td>
          </tr>
          <tr>
            <td>
              <Link href="/router-cache">4. Router Cache</Link>
            </td>
            <td>
              <strong>navegador</strong>
            </td>
            <td>uma sessão</td>
            <td>a sessão</td>
            <td>
              <code>router.refresh()</code>, <code>revalidatePath</code>
            </td>
          </tr>
        </tbody>
      </table>

      <p>
        Veja também: <Link href="/dinamica">rota totalmente dinâmica</Link>, sem cache
        nenhum.
      </p>

      <h2>O caminho de uma requisição</h2>
      <pre className="panel" style={{ overflowX: 'auto' }}>{`navegador                             servidor
────────────────────────────────────────────────────────────────
clique no <Link>
   │
   ├─► [4] Router Cache tem?  ──sim──► renderiza na hora. FIM.
   │        não
   ▼
requisicao ao servidor
   │
   ├─► [3] Full Route Cache tem?  ──sim──► devolve HTML/RSC pronto. FIM.
   │        não
   ▼
renderiza os Server Components
   │
   ├─► [1] ja chamou esta funcao neste render?  ──sim──► reusa o resultado
   │        não
   ▼
   ├─► [2] Data Cache tem?  ──sim──► devolve o dado cacheado
   │        não
   ▼
consulta o banco / a API de verdade`}</pre>

      <h2>A mudança do Next 15 que confunde todo mundo</h2>
      <p>
        No Next 14, <code>fetch</code> era cacheado <strong>por padrão</strong>
        (equivalente a <code>force-cache</code>). No Next 15, o padrão inverteu: agora é{' '}
        <strong>não cacheado</strong> (<code>no-store</code>), e cachear é uma escolha
        explícita.
      </p>
      <p className="muted">
        A mudança foi feita porque o padrão antigo surpreendia — gente via dado velho sem
        ter pedido cache nenhum. O padrão novo é mais previsível e mais caro: se você
        migrou de 14 para 15 e a conta de infraestrutura subiu, é aqui que olhar.
      </p>

      <h2>O checklist de diagnóstico</h2>
      <p>Quando aparecer &quot;dado velho na tela&quot;, pergunte nesta ordem:</p>
      <ol>
        <li>
          Abra numa aba anônima. Correto? → o problema é <strong>Router Cache</strong>{' '}
          (camada 4).
        </li>
        <li>
          Ainda velho? Rode <code>npm run build</code>. A rota aparece como{' '}
          <code>○ (Static)</code>? → <strong>Full Route Cache</strong> (camada 3).
        </li>
        <li>
          A rota é dinâmica mas o dado é velho? → <strong>Data Cache</strong> (camada 2).
        </li>
        <li>
          Componentes diferentes mostram valores diferentes na mesma tela? → falta{' '}
          <strong>memoização</strong> (camada 1).
        </li>
      </ol>
    </main>
  )
}
