# Ordem de serviço: vitrine, a gravação acesa também nos dados de forma padrão

Ordem: OS-0070
Módulo: `vitrine`
Escopo de escrita:
- `src/modules/vitrine/**`

Objetivo:
- Num dado importado de forma padrão (d6, d8, d10, d12, d20, d100) com números gravados (`printed: true`), o resultado acende o número esculpido da face sorteada, e não aparece um número solto por cima dela.
- É o mesmo efeito que o dado de forma livre gravado já tem desde 2026-11-12.

Como é hoje:
- Só o dado de forma livre gravado (`isCustom` + `printed` + `readsDown`) acende a gravação: `above[i]` no `scene/Vitrine.tsx`, com `glowMesh`/`upInk` de `domain/inkGlow.ts`.
- O "d10 jose" do João foi reconhecido como d10 padrão. Ele voa com a face do resultado para a câmera, e ganha o número em destaque solto (`Text`) sobre a face.
- O resultado é o número grande brilhando "por fora" e os números esculpidos do modelo, menores, apagados ao lado. O João achou que o efeito tinha se perdido.

Leia antes de começar:
- `src/modules/vitrine/CLAUDE.md`, `NOTAS.md` (a seção da forma livre gravada) e `scene/Vitrine.tsx`, a montagem do showcase (`above`, `marks`, `glows`) e o laço do `settled`
- `src/modules/vitrine/domain/inkGlow.ts` e `tests/inkGlow.test.ts`
- `docs/backlog.md`, a seção "Implementado em 2026-11-12" (o porquê da gravação acesa)
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md), a seção Desempenho: sem material novo que recompile shader e sem luz nova

Decisões do orquestrador:

1. **Quem acende.**
   - **O dado:** `gravadoPadrao[i] = !still && isCustom(k) && !!customDie(k)?.printed && !polys[i].readsDown && poly.shape !== 'd4' && poly.shape !== 'coin'`.
     - O d4 fica de fora porque lê o vértice de cima: o número sorteado aparece em três faces, e não numa face só.
     - O `above[i]` da forma livre não muda.
   - **A pose:** a de sempre da forma padrão (`showcasePoses` sem `above`), com a face do resultado para a câmera.

2. **Qual tinta acende: a da face do resultado, e só ela.**
   - Passe para `glowMesh` o `down` como **o oposto** da normal do rótulo sorteado (`-label.normal`). Assim, "virado para cima" no `upInk` quer dizer "na própria face do resultado".
   - **O cone tem que ser fechado:** com `UP_INK = 0.5` (60°), os números das faces vizinhas também acendem. No d20, a vizinha fica a ~42°, e cos 42° ≈ 0,74 passa no cone.
     - O `glowMesh` ganha um parâmetro opcional `min` (padrão `UP_INK`) e repassa para o `upInk`.
     - A forma padrão usa `MESMA_FACE = 0.98`: a dona do triângulo tem que ser a própria face do resultado.
     - Exporte `MESMA_FACE` em `domain/inkGlow.ts`, com um comentário `ponytail:` dizendo que é o cone de "mesma face" e que deve ser ajustado se um modelo real com faces quase coplanares acender errado.
   - **A cor** é a mesma da forma livre: a tinta do dado clareada para `#FFE38A`, ou `#FFE38A` sem tinta.
   - **O cache por `kind|valor`** continua valendo: um mesmo `kind` é sempre padrão ou sempre livre, nunca os dois.

3. **No laço do `settled`, separe "pose de cima" de "tem brilho".**
   - `above[i]` decide só a pose (forma livre).
   - `glows[i]` decide o destaque.
     - **Com brilho, os dois casos:** a opacidade do brilho segue `t * highlightAt(...).glow`, como hoje, e o número solto não é desenhado (`numbers[i].visible = glyphs[i].visible = false`).
     - **Forma padrão sem brilho achado** (nenhum triângulo de tinta na face): o caminho de hoje, com o número subindo e grudando na face.
     - **Forma livre sem brilho:** o caminho de hoje, com o número na frente do dado, em `FONT.livre`.
   - **Kraken e tempestade** (`movimentoNoPresagio`): se o dado tem brilho, a opacidade do brilho segue `movimento.revela`, e o número solto não é desenhado. Sem brilho, como hoje.
   - **Movimento reduzido** (`still`): sem brilho, como na forma livre. O número aparece acima do dado.

4. **Testes, em `tests/inkGlow.test.ts`:**
   - um caso sintético de duas faces vizinhas a 42° (como no d20), com tinta nas duas;
   - com o `down` = `-normal` da face A e `min = MESMA_FACE`, só os triângulos da face A voltam;
   - com o `min` padrão, as duas voltam (documenta por que o cone fechado existe);
   - o teste da forma livre continua passando sem mudança.

5. **Docs do módulo.**
   - **`CLAUDE.md`**, na regra da gravação: "Dado importado gravado (`printed`): a forma livre é vista de cima e acende a tinta voltada para cima; a forma padrão (não d4) acende só a tinta da face do resultado (`MESMA_FACE`). Com brilho, sem número solto."
   - **`NOTAS.md`:** o mesmo, com o porquê do cone fechado.

Entregáveis:
1. O `min` no `glowMesh` e `MESMA_FACE`.
2. O `gravadoPadrao` e o laço do `settled` no `Vitrine.tsx`.
3. Os testes e as docs.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` passam. Nenhum material novo além do `lit` que já existe, e nenhuma luz nova.
- Dado nativo (d4 a d100, moeda e os especiais) e importado sem gravação: o comportamento é idêntico ao de hoje.
- **Sem E2E nem servidor de dev:** o João testa com o "d10 jose".

Fora do escopo:
- A detecção de forma no import (`meus-dados`) e a gravação (`dados`).
- A pose da forma padrão.
- O d4.

Se precisar de algo fora disso: pare e reporte. Não implemente.
