# Ordem de serviço: plataforma, o perfil leve, e casca, as faixas e a vinheta baratas

Ordem: OS-0062 (HUD imersivo, parte 3, ordem 1 de 5)
Módulo: nenhum: `shared/plataforma` e a casca
Escopo de escrita:
- `src/shared/plataforma/webgl.ts`, `src/shared/plataforma/perfil.ts` (novo), `src/shared/plataforma/index.ts`, `src/shared/plataforma/tests/perfil.test.ts` (novo)
- `src/App.tsx`
- `src/app/testHook.ts` e `src/app/Cena.tsx`, só o campo novo `luzes()` do `window.__dice`
- `src/index.css`, só o bloco `/* OS-0056: ritmo */` e um bloco novo `/* OS-0062: perfil e camadas baratas */`
- `e2e/hud.spec.ts`
- **Docs:**
  - `docs/adr/0011-perfil-leve.md` (já escrito: só ajuste se a implementação divergir);
  - `docs/contexto/armadilhas.md`, seção Desempenho;
  - `docs/mapa-modulos.md`, a subseção "Contratos de DOM lidos pela casca" (`data-perfil`);
  - o `CLAUDE.md` da raiz, a lista de `shared/plataforma`.

Objetivo:
- O app sabe, antes do canvas nascer, se roda no perfil completo ou leve, e o `.app` mostra isso em `data-perfil`.
- As faixas de cinema e a vinheta da força param de repintar a área de jogo a cada quadro, com o mesmo efeito na tela.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), parte 3 inteira
- [docs/adr/0011-perfil-leve.md](../adr/0011-perfil-leve.md)
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md), seção Desempenho
- `src/shared/plataforma/` inteiro e os testes de lá
- `src/App.tsx` (o efeito da OS-0056 que escreve `data-fase` e `--forca`) e `src/app/Cena.tsx` (a detecção atual do SwiftShader, só para ler)
- `src/index.css`, os blocos da OS-0056 e da OS-0061
- `e2e/hud.spec.ts`

Decisões do orquestrador:

1. **O renderizador no teste de WebGL.** Em `webgl.ts`, antes do `loseContext`, o `probe()` lê o nome do renderizador:
   - usa `WEBGL_debug_renderer_info` (`UNMASKED_RENDERER_WEBGL`), com `RENDERER` como reserva;
   - guarda numa variável do arquivo e expõe `rendererDoTeste(): string` (vazio se não houver WebGL).
   - O `hasWebGL()` continua igual por fora.

2. **`perfil.ts`:**

   ```ts
   export type Perfil = 'completo' | 'leve';
   export function decidirPerfil(entrada: { busca: string; renderer: string; memoria?: number; nucleos?: number }): Perfil
   export function perfil(): Perfil      // calcula na 1ª chamada (chamando hasWebGL() antes) e guarda
   export const perfilLeve = () => perfil() === 'leve';
   ```

   - `decidirPerfil` é pura e é o que o teste cobre, nesta ordem:
     1. `?perfil=leve` ou `?perfil=completo` em `busca` manda;
     2. `/swiftshader|llvmpipe|software/i` no `renderer` → leve;
     3. `memoria <= 2` → leve;
     4. `memoria <= 4 && nucleos <= 4` → leve;
     5. o resto → completo.
   - Sem `memoria` (só o Chromium tem `navigator.deviceMemory`), os passos 3 e 4 não puxam para leve.
   - `perfil()` lê `location.search`, `rendererDoTeste()`, `navigator.deviceMemory` e `navigator.hardwareConcurrency`. Ele não muda depois da primeira chamada.
   - **Não mexa** em `renderizadorPorSoftware()` nem na detecção do `Cena.tsx`: o DPR e o panorama continuam como estão.

3. **Porta:** o `index.ts` de `shared/plataforma` exporta `perfil`, `perfilLeve` e o tipo `Perfil`. O `rendererDoTeste` fica interno.

4. **`App.tsx`:**
   - `data-perfil={perfil()}` no `<main className="app">`. Vai no JSX, porque não muda.
   - **As faixas viram dois elementos** dentro da `.game-area`, logo depois do `<FundoCss />`: `<div className="faixa faixa-cima" aria-hidden="true" />` e `<div className="faixa faixa-baixo" aria-hidden="true" />`.

5. **CSS das faixas (mesmo efeito).** Remova o `.game-area::before` das faixas (bloco OS-0056) e use:
   - `.faixa { position: absolute; left: 0; right: 0; height: 28px; background: var(--barra); pointer-events: none; z-index: 1; transform: scaleY(0); transition: transform var(--t-longo) var(--ease-cine); }`
   - `.faixa-cima { top: 0; transform-origin: top; }` e `.faixa-baixo { bottom: 0; transform-origin: bottom; }`
   - Em `rolling` e `returning`: `transform: scaleY(1)`.
   - No celular, `height: 16px`.
   - O movimento reduzido mantém a regra atual (sem transição).

6. **CSS da vinheta da força (efeito equivalente).**
   - A regra `.app[data-fase="charging"] .game-area::after { background: radial-gradient(... var(--forca) ...) }` sai. A vinheta base do `::after` fica como está.
   - O `.game-area::before`, livre agora, vira a camada "apertada":
     - `radial-gradient(ellipse at 50% 52%, rgba(255,170,90,.08) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,.85) 100%)`, desenhada uma vez;
     - `opacity: 0`, `pointer-events: none`, `z-index: 1`, `will-change: opacity`;
     - em `charging`: `opacity: var(--forca)`.
   - O `progress` com `box-shadow` da força fica como está: é um elemento pequeno.
   - As reações da OS-0061 continuam no `::after`. Confira que nenhum seletor delas dependia do `::before`.

7. **Test hook:** `window.__dice.luzes(): number`, o número de `PointLight` na cena. No `Cena.tsx`, ao lado de `table`, faça `scene.getObjectsByProperty('isPointLight', true).length`. Tipe em `testHook.ts`.

8. **E2E (`hud.spec.ts`):**
   - O teste de fase também confere `data-perfil="leve"`, porque o E2E roda em SwiftShader.
   - O teste "the light count never changes after warm-up" passa a rodar duas vezes, com `/` e com `/?perfil=completo`. No completo, ele confere também que o `.app` tem `data-perfil="completo"`.
   - **Número de luzes por perfil**, depois do primeiro arremesso completo: `luzes()` no `?perfil=completo` é exatamente 3 a mais que no leve (vela, carga e destaque). Leia os dois valores na mesma rodada e compare a diferença, sem fixar o número absoluto. Hoje a única pontual do leve deve ser a do presságio; registre no relatório o valor que encontrar. Esse teste só passa depois das OS-0063 a 0065; o orquestrador roda o E2E no fim.
   - Acrescente um teste: com `rolling`, as `.faixa` têm `transform` computado diferente de `none`.

9. **Docs.**
   - **armadilhas.md, Desempenho:** "Intensidade 0 não economiza GPU: a luz montada custa por pixel. Luz decorativa nova respeita `perfilLeve()` e não monta no leve (ADR 0011). Animação de tela inteira usa `transform` ou `opacity`, nunca `background-size` ou gradiente com variável por quadro."
   - **mapa-modulos:** `data-perfil` na lista de contratos que a casca escreve.
   - **CLAUDE.md da raiz:** `perfil` na lista do que `shared/plataforma` tem.

10. **Teste:** `tests/perfil.test.ts`, com os 5 passos do critério de `decidirPerfil`, a precedência da busca e a ausência de `memoria`.

Entregáveis:
1. O perfil (`webgl.ts`, `perfil.ts`, porta e teste).
2. `data-perfil` e as faixas no `App.tsx`.
3. O CSS barato.
4. O `hud.spec.ts`.
5. As docs.

Critérios de aceite:
- `npm run build`, `npm run lint`, `npm test` (incluindo `tests/arquitetura/`) e `npm run test:server` passam.
- `grep -n "background-size" src/index.css` não acha a regra das faixas, e nenhuma regra usa `var(--forca)` dentro de `radial-gradient`.
- **Sem E2E no dev.** O orquestrador roda o E2E e as capturas.

Fora do escopo:
- Qualquer arquivo de módulo, porque as luzes são as OS-0063 a 0065.
- `renderizadorPorSoftware()`, a detecção do `Cena.tsx` e o DPR.
- Seletor de qualidade na interface.

Se precisar de algo fora disso: pare e reporte. Não implemente.
