# Ordem de serviço: vitrine, o presságio na legenda e a luz de destaque

Ordem: OS-0060 (HUD imersivo, parte 2, ordem 5 de 6)
Módulo: `vitrine`
Escopo de escrita:
- `src/modules/vitrine/**`

Objetivo:
- A legenda do resultado diz, num atributo, qual presságio aquele arremesso teve, para a casca a vestir de ouro ou brasa.
- Uma luz quente sobe junto com os dados no voo até a câmera.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), parte 2: reações por estado e luz
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md), a seção Desempenho
- `src/modules/vitrine/CLAUDE.md` e `NOTAS.md`, `ui/PainelDoResultado.tsx` e `scene/Vitrine.tsx`
- `src/modules/pressagios/cena.ts` e `src/modules/regras/index.ts` (`omenKind`), que a vitrine já pode consumir

Decisões do orquestrador:

1. **`data-presagio` no `output`.**
   - O `PainelDoResultado` lê:
     - `usePresagio((s) => s.omen)`, que já é porta (`pressagios/cena.ts`);
     - `useArremesso((s) => s.throwId)`.
   - Com texto na tela e `omen` do mesmo `throwId`, ele põe `data-presagio={omenKind(omen)}` no `<output>`. Sem isso, o atributo não aparece.
   - O texto, o `data-testid="result"` e o `aria-live` não mudam.

2. **A luz de destaque**, em `scene/Vitrine.tsx`.
   - É um `<pointLight>` com `ref`, `color="#ffe8c0"`, `distance={8}`, `decay={2}` e **sem** sombra.
   - Ela é montada sempre, desde o primeiro render, sem condição.
   - A regra é pura, em `domain/destaque.ts`:

     ```ts
     export const intensidadeDoDestaque = (ms: number, voo: number, software: boolean): number =>
       software ? 0 : 5 * Math.min(1, Math.max(0, ms / voo));
     ```

     - `ms` é o tempo desde o início do voo: `now - at - SHOW.delay` (o `at` do `showcase` vem 1000ms antes do voo).
     - `voo` é a duração do voo, que já existe no domínio (`SHOW` ou equivalente). Use a constante que existe; não invente outra.
   - No `useFrame`, com showcase ativo:
     - a luz fica no centro das poses de chegada (`to`), mais `(0, 0.6, 1.2)`, na direção da câmera;
     - a intensidade é a da regra.
   - Fora do showcase (mão, carga, rolagem, recolher), a luz cai a 0 em 200ms, linear, sem tremor.

3. **Movimento reduzido:** a luz não pisca. Se o voo for pulado no movimento reduzido, o destaque vai direto para o valor final.

4. **Docs do módulo.** O `CLAUDE.md` da `vitrine`, em "Expõe", registra o `data-presagio` do `output` como contrato, com o consumidor (o CSS da casca, OS-0061). Registra também a luz de destaque: a regra pura, montada sempre e apagada no software.

5. **Testes:**
   - `intensidadeDoDestaque` (0 no início, 5 no fim do voo, preso, 0 no software).
   - O `PainelDoResultado` com e sem presságio do mesmo `throwId`, se o módulo já renderiza o painel em teste (`renderToStaticMarkup`, como os testes de componentes dos outros módulos). Se não renderiza, siga esse padrão.

Entregáveis:
1. O atributo no `PainelDoResultado`.
2. `domain/destaque.ts` e a luz no `Vitrine`.
3. As docs e os testes.

Critérios de aceite:
- `<output data-testid="result">` mostra o mesmo texto de antes, para os E2E de resultado.
- A luz aparece no JSX sem condição.
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam.
- **Sem E2E no dev.**

Fora do escopo:
- O voo, as poses, os números em destaque, a gravação acesa e o texto do resultado.

Se precisar de algo fora disso: pare e reporte. Não implemente.
