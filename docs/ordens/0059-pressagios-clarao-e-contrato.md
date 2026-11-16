# Ordem de serviço: pressagios, o clarão do kraken, da tempestade e da dualidade, e o contrato da área de jogo

Ordem: OS-0059 (HUD imersivo, parte 2, ordem 4 de 6)
Módulo: `pressagios`
Escopo de escrita:
- `src/modules/pressagios/**`

Objetivo:
- A luz do presságio, que hoje só acende no raio e no fogo, também reage ao kraken, à tempestade e à dualidade.
- Os atributos que o presságio põe na `.game-area` viram contrato público, porque a casca vai reagir a eles na OS-0061.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), parte 2: reações por estado e luz
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md), a seção Desempenho (uma luz só, compilada antes)
- `src/modules/pressagios/CLAUDE.md`, `scene/PresagiosNaCena.tsx` (a classe `Show`), `ui/OverlayDoPresagio.tsx` e `ui/presagios.css` (o trovão)

Decisões do orquestrador:

1. **Continua uma luz só:** a `PointLight` do `Show`. Nenhuma luz nova.

2. **Prioridade da luz.** Quando duas coisas querem a luz no mesmo arremesso, ela fica com a mais forte, nesta ordem:
   1. fogo;
   2. raio;
   3. tempestade;
   4. kraken;
   5. dualidade.

   O fogo e o raio continuam exatamente como hoje; as curvas novas só valem quando nenhum dos dois está ativo.

3. **As curvas**, puras, em `domain/luz.ts` (`t` em ms desde o início do show, e o resultado é a intensidade):

   | Presságio | Cor | Posição | Curva |
   |---|---|---|---|
   | Kraken (`grab`) | `#3fd6a0` | centro da bandeja, `y = 0.3` (rasante, "de baixo") | sobe de 0 a 8 nos primeiros 600ms, pulsa `8 + 2·sin(t/400)` e cai a 0 nos últimos 500ms do show |
   | Tempestade (`storm`) | `#bcd4ff` | alto, `[0, 9, -3]` | dois relâmpagos no ritmo do trovão do CSS: picos de 28 em `t = 1363` e de 18 em `t = 1489`, decaindo em 120ms; 0 no resto |
   | Dualidade | alterna `#ffd36a` e `#9cc8ff` a cada 500ms | acima do taiji, `y = 2` | 6 constante enquanto o taiji gira |

4. **A tempestade e o CSS ficam presos juntos.** Os dois picos saem do `@keyframes thunder`: 15% e 45% de 420ms, começando em 1300ms.
   - Ponha esses números numa constante em `domain/luz.ts` (`TROVAO = { inicio: 1300, duracao: 420, picos: [0.15, 0.45] }`) e calcule os instantes a partir dela.
   - Ponha um comentário no `presagios.css`, junto do `thunder`, dizendo que ele tem que bater com `TROVAO`.
   - Um teste garante que o CSS e a constante batem: leia o `.css` como texto no teste.

5. **Movimento reduzido:** o show já é cancelado (`movimentoReduzidoAlterado`), então não precisa de nada novo. Confira só que `hide()` zera a luz nos três casos novos.

6. **Shaders:** a luz já existe e já está no `compile`. Não há programa novo. Se a cor mudar por material, nada recompila: cor e intensidade são uniforms.

7. **O contrato da área de jogo.** No `CLAUDE.md` do módulo, na seção "Expõe", registre que, enquanto um presságio toca, o `OverlayDoPresagio` põe na `.game-area`:
   - `data-omen="crit|fumble|duality"`;
   - `data-kraken`, durante o kraken;
   - `data-storm`, durante a tempestade.

   Registre também que eles somem quando o presságio acaba, e que o consumidor é o CSS da casca (`src/index.css`, OS-0061). Mudar esses nomes é mudança de contrato.

8. **Teste** em `tests/luz.test.ts`:
   - as três curvas nos instantes-chave;
   - a prioridade (fogo e raio ganham);
   - o CSS do trovão batendo com `TROVAO`.

Entregáveis:
1. `domain/luz.ts` e o teste.
2. As curvas no `Show.frame`.
3. O comentário no CSS.
4. O `CLAUDE.md`.

Critérios de aceite:
- O raio e o fogo continuam idênticos: os testes do módulo que já existem passam sem mudança.
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam.
- **Sem E2E no dev.** O `omen.spec.ts`, o `kraken.spec.ts` e o orçamento rodam na OS-0061.

Fora do escopo:
- Mudar os efeitos visuais (raio, kraken, fogo, taiji), o tempo do show e o overlay HTML.
- Qualquer CSS fora do comentário.

Se precisar de algo fora disso: pare e reporte. Não implemente.
