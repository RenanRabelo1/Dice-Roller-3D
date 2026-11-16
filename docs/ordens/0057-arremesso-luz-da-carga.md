# Ordem de serviço: arremesso, a luz da carga e a dica que troca com fade

Ordem: OS-0057 (HUD imersivo, parte 2, ordem 2 de 6)
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/**`
- **Casca:** `src/index.css`, só a animação da dica (`footer.status > p`)

Objetivo:
- Enquanto o jogador carrega, uma luz quente acende sobre a mira e cresce com a força.
- A dica de cada fase entra com fade.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), parte 2: arquitetura, luz e orçamento
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md), a seção Desempenho
- `src/modules/arremesso/CLAUDE.md`, `scene/MaoDoArremesso.tsx` e `ui/DicaDaFase.tsx`
- `src/shared/plataforma/index.ts` (`renderizadorPorSoftware`)

Decisões do orquestrador:

1. **A regra da luz é pura**, em `domain/luz.ts`:

   ```ts
   export const LUZ_DA_CARGA = { cor: '#ffb06a', base: 2, ganho: 10, altura: 1.5, alcance: 6 } as const;
   export const intensidadeDaCarga = (fase: Phase, forca: number, software: boolean): number =>
     fase === 'charging' && !software ? LUZ_DA_CARGA.base + LUZ_DA_CARGA.ganho * Math.min(1, Math.max(0, forca)) : 0;
   ```

   Ela é reexportada pelo `index.ts` só se alguém de fora precisar. Hoje ninguém precisa: não reexporte.

2. **A luz na cena** fica dentro do `MaoDoArremesso`, que já está montado. A casca não muda.
   - É um `<pointLight>` com `ref`, `intensity={0}`, `color`, `distance={LUZ_DA_CARGA.alcance}`, `decay={2}` e **sem** `castShadow`.
   - Ela é montada sempre, desde o primeiro render, sem condição: o número de luzes não pode mudar (armadilhas.md).
   - No `useFrame`, leia a fase, a força e a mira do próprio store, sem render. Faça `intensity = intensidadeDaCarga(fase, forca, renderizadorPorSoftware())`, com a posição na mira e `y + LUZ_DA_CARGA.altura`.
   - A luz não pisca nem tem tremor. Por isso o movimento reduzido não precisa de tratamento.

3. **A dica com fade.**
   - No `DicaDaFase`, o `<p>` ganha `key={texto}`, onde `texto` é a string que ele mostra. O markup não muda (o teste de componentes e o E2E `footer.status > p` continuam).
   - **Casca (CSS):** `footer.status > p` com `animation: dica var(--t-curto) ease-out`, de `opacity: 0` para 1, zerada sob `.app[data-movimento="reduzido"]`.

4. **Docs do módulo.** O `CLAUDE.md` do `arremesso` registra:
   - a luz da carga: onde está, a regra pura, montada sempre e apagada no software;
   - o `key` da dica.

5. **Teste** em `tests/luz.test.ts`:
   - 0 fora de `charging`;
   - 0 no software;
   - cresce com a força;
   - a força é presa entre 0 e 1.

Entregáveis:
1. `domain/luz.ts` e o teste.
2. A luz no `MaoDoArremesso`.
3. O `key` da dica e o CSS da dica.
4. A doc.

Critérios de aceite:
- A luz aparece no JSX sem `&&` nem ternário em volta.
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam. O worker não cresce: a luz não entra no `presim.worker`.
- **Sem E2E no dev.** O orçamento (`coin-performance`, `coin-software`) é medido na OS-0061.

Fora do escopo:
- A física, a mira, o retorno e a pré-simulação. A luz só lê; não muda nada disso.

Se precisar de algo fora disso: pare e reporte. Não implemente.
