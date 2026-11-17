# Ordem de serviço: mesa, a janela de prévia no capítulo da mesa

Ordem: OS-0082 ([docs/janelas-de-previa.md](../janelas-de-previa.md))
Módulo: `mesa`
Escopo de escrita:
- `src/modules/mesa/**`
- **Casca:**
  - `src/index.css`, só o capítulo da mesa (`.livro > #table-panel`), num bloco `/* OS-0082: janela da mesa */`;
  - `e2e/table.spec.ts`, um teste novo.

Objetivo:
- Quem personaliza a mesa vê a mesa e o fundo numa janela 3D na página esquerda do livro, girando devagar, e cada mudança aparece nela.

Leia antes de começar:
- [docs/janelas-de-previa.md](../janelas-de-previa.md), inteira
- `src/modules/mesa/CLAUDE.md` e `NOTAS.md` (fundo 360°, `buildFor`, `disposeTable`)
- `src/modules/mesa/ui/PainelDaMesa.tsx`, `ui/FundoCss.tsx`, `scene/MesaNaCena.tsx`, `scene/AmbienteDaMesa.tsx`, `domain/tableBuild.ts` (`GUIDE`) e `domain/tableImages.ts` (`panoramaTexture`)
- `src/modules/meus-dados/ui/AssistenteDeImportacao.tsx`, o `Preview` e o `Canvas`: é o padrão de janela a seguir, só para ler
- `src/app/Folheador.tsx` e o bloco `/* OS-0067: folhear */` do `src/index.css`: a orelha pagina o corpo do capítulo
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md), as seções Desempenho e Interface do HUD

Decisões do orquestrador:

1. **`ui/JanelaDaMesa.tsx`** (novo).
   - **Raiz:** um `<div className="janela-da-mesa" role="img" aria-label="Prévia da mesa">`, `position: relative`.
   - **Dentro dele, nesta ordem:**
     - o `<FundoCss />` (foto ou tema, atrás);
     - o `<Canvas>`, com `dpr={1}`, `gl={{ alpha: true, antialias: true }}`, câmera em três quartos que enquadra a bandeja (`GUIDE`) e `frameloop={perfilLeve() ? 'demand' : 'always'}`.
   - **Montagem:** o `PainelDaMesa` renderiza `{aberto && <JanelaDaMesa />}`, então o canvas só existe com o capítulo aberto.
   - **Confira o `FundoCss`:** ele precisa funcionar dentro de um contêiner relativo, e não só na `.game-area`. Se depender da `.game-area`, ajuste o seletor no CSS, sem mudar o componente.

2. **A cena da janela** (`scene/MesaDePrevia.tsx`, novo):
   - lê o tema com `useMesa((s) => s.theme)` e monta a mesa com `buildFor(theme)` de `domain/tableFile.ts`, por `import()` dinâmico, como a `MesaNaCena`;
   - remonta 150 ms depois da última mudança do tema e libera a anterior com `disposeTable`;
   - **fundo:**
     - **cor:** `<color attach="background">`;
     - **360°:** `scene.background = await panoramaTexture(bg)`, com `backgroundRotation`, `backgroundIntensity` e `backgroundBlurriness` do tema. Ao sair do 360°, volta a `null`;
     - **foto e tema:** nada no canvas, porque o `FundoCss` está atrás;
   - **luz própria:** `ambientLight` 0,35 e uma `directionalLight` `#fff1dc` 2,5, sem sombra. Não importe nada da casca;
   - **giro:** `OrbitControls` sem zoom e sem pan, com `autoRotate`, `autoRotateSpeed` 0,6.
     - No movimento reduzido (`movimentoReduzido()`) ou no perfil leve, `autoRotate` fica desligado.
     - No leve, chame `invalidate()` quando o tema mudar e no evento `change` dos controles.

3. **Layout do capítulo** (casca, `src/index.css`):
   - **Desktop:** a página esquerda fica com o título e a janela, que ocupa o resto da altura. O corpo dos controles (`.import-body`) vai para a página direita, com `column-count: 1`.
   - **A orelha de folhear (OS-0067) continua funcionando.** Ela mede `scrollWidth`, `clientWidth` e `column-gap`, e uma folha vira uma página de uma coluna. Confira com a conta do `src/app/folhas.ts`.
   - **Celular (≤ 800 px):** a janela fica no topo, com 220 px, e os controles rolam embaixo.
   - **Cuidado:** não mexa no bloco do folhear, no véu nem no ×.

4. **Ajuda do 360°** no `PainelDaMesa`:
   - **O texto:** `<small className="ajuda-360">360°: uma foto panorâmica 2:1 (equirretangular) em .jpg, .png, .webp ou .hdr.</small>`, logo abaixo dos botões de tipo de fundo.
   - **Quando aparece:** sempre que o fundo for 360°, e também ao passar o mouse ou focar o botão "360°". Para o hover e o foco, use CSS com `:has()` ou um estado local, sem mexer no fluxo do arquivo.
   - **Estilo:** EB Garamond itálico, sépia, como as outras notas do livro.

5. **E2E** em `e2e/table.spec.ts`: "the table chapter shows a live preview window".
   - Com o capítulo fechado, há 1 `canvas` na página.
   - Abrir a Mesa dá 2, com um dentro de `.janela-da-mesa`.
   - Trocar o feltro mantém 2.
   - Fechar volta a 1.

6. **Docs do módulo:** `CLAUDE.md` e `NOTAS.md` (a janela, o layout do capítulo e a ajuda do 360°) e a seção "Expõe", se mudar.

Entregáveis:
1. `JanelaDaMesa` e `MesaDePrevia`.
2. O layout do capítulo.
3. A ajuda do 360°.
4. O E2E e as docs.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` (incluindo `tests/arquitetura/`) passam.
- **Sem E2E nem servidor de dev no dev:** o orquestrador roda e o João testa.
- Nenhuma luz nova na cena principal: a janela tem a sua própria cena.

Fora do escopo:
- O chat (OS-0083), panoramas prontos e o reflexo do 360° na janela.

Se precisar de algo fora disso: pare e reporte. Não implemente.
