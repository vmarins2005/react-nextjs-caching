import Link from 'next/link'

/**
 * CAMADA 4 — Router Cache (client-side).
 *
 * A única que vive no **navegador**, em memória. Guarda o payload RSC das rotas
 * já visitadas e das que foram prefetchadas.
 *
 * É ela que faz a navegação entre rotas parecer instantânea — e é ela que causa
 * o bug mais reportado do App Router: **"mudei o dado, voltei para a lista e o
 * valor antigo ainda está lá"**.
 *
 * A causa: você invalidou o cache do servidor, mas o navegador serviu a cópia
 * que já tinha. A correção é chamar `router.refresh()` depois da mutação, ou
 * usar `revalidatePath` a partir de uma Server Action — que instrui o cliente a
 * descartar a entrada correspondente.
 */
export default function RouterCachePage() {
  return (
    <main>
      <h1>Camada 4 — Router Cache</h1>
      <p>
        Escopo: <strong>o navegador do usuário</strong>, em memória. Duração: a sessão
        (ou até um refresh explícito).
      </p>

      <h2>Como observar</h2>
      <ol>
        <li>Abra o DevTools na aba Network.</li>
        <li>Passe o mouse sobre os links abaixo, sem clicar.</li>
        <li>
          Observe requisições com <code>?_rsc=</code> saindo <strong>antes</strong> do
          clique: é o prefetch, disparado ao entrar no viewport ou no hover.
        </li>
        <li>Clique. A navegação é instantânea — o payload já estava no cliente.</li>
        <li>Volte e clique de novo. Nenhuma requisição nova: veio do Router Cache.</li>
      </ol>

      <div className="panel row">
        <Link href="/memoizacao">Camada 1</Link>
        <Link href="/data-cache">Camada 2</Link>
        <Link href="/isr">Camada 3</Link>
        <Link href="/dinamica">Sem cache</Link>
      </div>

      <h2>O bug clássico, e por que ele acontece</h2>
      <pre className="panel" style={{ overflowX: 'auto' }}>{`1. usuario abre /produtos           -> Router Cache guarda a lista
2. usuario abre /produtos/123 e edita o nome
3. a Server Action salva no banco
4. usuario volta para /produtos     -> NOME ANTIGO na tela`}</pre>
      <p>
        O dado no servidor está correto. O navegador é que serviu a cópia local. As três
        correções, da mais específica para a mais genérica:
      </p>
      <ul>
        <li>
          <code>revalidatePath(&apos;/produtos&apos;)</code> dentro da Server Action — a
          resposta instrui o cliente a descartar aquela entrada. <strong>É a correta na
          maioria dos casos.</strong>
        </li>
        <li>
          <code>router.refresh()</code> depois da mutação — descarta o cache e re-busca a
          rota atual.
        </li>
        <li>
          <code>&lt;Link prefetch={'{false}'}&gt;</code> — evita o prefetch, mas não
          resolve o cache pós-navegação; é um paliativo.
        </li>
      </ul>

      <h2>Por que isto é tão confuso</h2>
      <p>
        Porque são <strong>quatro caches independentes</strong>, com escopos e durações
        diferentes, e invalidar um não invalida os outros. O diagnóstico correto começa
        sempre pela mesma pergunta:
      </p>
      <p className="panel">
        <strong>Qual das quatro camadas está me servindo este dado velho?</strong>
      </p>
      <p className="muted">
        Um teste rápido para separar servidor de cliente: abra a URL numa aba anônima. Se
        o dado aparecer correto, o problema é Router Cache (camada 4). Se aparecer velho
        também, é servidor (camadas 2 ou 3).
      </p>
    </main>
  )
}
