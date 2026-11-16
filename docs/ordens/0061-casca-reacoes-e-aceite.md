# Ordem de serviço: casca, as reações aos presságios, E2E, orçamento e aceite da parte 2

Ordem: OS-0061 (HUD imersivo, parte 2, ordem 6 de 6)
Módulo: nenhum, só a casca e a rede de segurança
Escopo de escrita:
- `src/index.css`
- `e2e/hud.spec.ts` (novo)
- **Docs:**
  - `docs/hud-imersivo.md`;
  - `docs/mapa-modulos.md`, uma subseção nova em "Eventos";
  - `docs/contexto/visao-geral.md`;
  - `docs/contexto/armadilhas.md`, só se o orçamento ensinar algo.

Objetivo:
- O HUD reage aos presságios: a vinheta e as faixas enquanto o presságio toca, e a legenda no resultado.
- Os E2E provam as reações e o número fixo de luzes.
- O orçamento de quadro continua dentro do limite.
- As docs registram os contratos de DOM.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), parte 2 inteira
- As ordens OS-0056 a OS-0060 e os relatórios delas
- `src/index.css`
- `e2e/omen.spec.ts` e `e2e/kraken.spec.ts`, os helpers e o `window.__dice.rigOmen`
- `src/app/testHook.ts`, o campo `table().programs`

Decisões do orquestrador:

1. **Reações enquanto o presságio toca.** São CSS da casca, que só lê os atributos (o contrato da OS-0059).
   - **A vinheta** (`.game-area[data-omen=…]::after`, `[data-kraken]::after` e `[data-storm]::after`) troca a cor da borda:

     | Presságio | Cor da borda |
     |---|---|
     | crítico | ouro, `rgba(212,169,63,.45)` |
     | falha | brasa, `rgba(200,60,20,.5)` |
     | dualidade | alterna ouro e brasa a cada 500ms |
     | kraken | verde-abismo, `rgba(10,60,50,.6)` |
     | tempestade | azul frio, `rgba(40,70,120,.5)` |

     Transição de entrada em `--t-medio`.
   - **As faixas:**
     - no crítico, um filete dourado: `box-shadow: inset 0 -1px rgba(212,169,63,.8)` no cabeçalho e o equivalente no topo do rodapé;
     - na falha, as faixas tremem 2px por 300ms (`@keyframes tremor` em `translateX`).
     - Seletor: `.app:has(.game-area[data-omen="…"]) header.controls`, e igual para o rodapé.

2. **A legenda com presságio** (o contrato da OS-0060):

   | `output[data-presagio]` | Estilo do `strong` |
   |---|---|
   | `crit` | cor `#ffd479`, `text-shadow: 0 0 24px rgba(255,190,80,.8), 0 2px 18px rgba(0,0,0,.95)` |
   | `fumble` | cor `#ff8a5c`, sombra em brasa |
   | `duality` | gradiente `#ffd479` → `#ff8a5c` com `background-clip: text` e `color: transparent` (mantém a sombra num `filter: drop-shadow`) |

   Confira o contraste de 3:1 (texto acima de 24px) sobre o feltro mais claro.

3. **Movimento reduzido:** sob `.app[data-movimento="reduzido"]`, sem tremor nem alternância. Fica a cor estática do presságio (a dualidade fica em ouro).

4. **E2E novos**, em `e2e/hud.spec.ts`, com os helpers de `roll.spec.ts` e `omen.spec.ts` copiados ou importados como eles fazem:
   1. **Fase.** O `.app` tem `data-fase="hand"`. Segurar Espaço dá `charging`, e a `--forca` (estilo computado) passa de 0. Soltar dá `rolling`. No fim, `settled` com a legenda visível.
   2. **Presságio na legenda.** Com `rigOmen` de crítico num d20, depois do show o `output` tem `data-presagio="crit"`. Num arremesso normal, ele não tem o atributo.
   3. **Número fixo de luzes.**
      - Leia `table().programs` depois do primeiro arremesso completo (aquecimento).
      - Faça mais: um arremesso normal, um crítico e um kraken.
      - `programs` não cresce. Se crescer, alguma luz montou ou desmontou: volte à ordem do módulo.
   4. **Movimento reduzido.** Com `page.emulateMedia({ reducedMotion: 'reduce' })`, o `.app` tem `data-movimento="reduzido"`, e o `getComputedStyle` do `output strong` tem `animation-name: none`.

5. **Orçamento.** O orquestrador roda `coin-performance.spec.ts` e `coin-software.spec.ts`; todo E2E roda em SwiftShader.
   - Se estourarem, a ordem de corte da spec vale: primeiro o destaque, depois a carga.
   - O corte é uma ordem de correção ao módulo dono da luz (`vitrine` ou `arremesso`). A casca não apaga luz de módulo.
   - Registre o resultado e o corte, se houver, nesta ordem e na spec.

6. **Docs.**
   - **`mapa-modulos.md`:** em "Eventos", uma subseção "Contratos de DOM lidos pela casca". Ela lista:
     - os atributos da `.game-area` (`pressagios`, OS-0059);
     - o `data-presagio` do `output` (`vitrine`, OS-0060);
     - o `data-fase`, o `data-movimento` e o `--forca`, que a própria casca escreve a partir das portas.
   - **`hud-imersivo.md`:** "Parte 2 concluída na OS-0061", com o corte, se houve.
   - **`visao-geral.md`:** uma linha sobre as reações e as luzes.

Entregáveis:
1. O CSS das reações.
2. O `e2e/hud.spec.ts`.
3. As docs.

Critérios de aceite:
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam.
- **O dev não roda o E2E.** O orquestrador roda `npm run e2e` completo, um spec por vez, com a máquina livre, e registra a tabela do gate nesta ordem.
  - Inclui `coin-performance`, `coin-software` e o novo `hud.spec.ts`.
  - O orquestrador abre as capturas de `screens/` e confere o visual na cena real.

Fora do escopo:
- Qualquer arquivo de módulo. Se uma reação precisar de dado que o módulo não expõe, pare e reporte: vira uma ordem do dono.
- Som.

Se precisar de algo fora disso: pare e reporte. Não implemente.
