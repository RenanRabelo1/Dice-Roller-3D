# Notas da `mesa`

O detalhe que não cabe no [CLAUDE.md](CLAUDE.md). Leia só quando a ordem mandar. Veio do antigo contexto da mesa em `docs/contexto/`, que saiu na OS-0037. Spec antiga: `docs/superpowers/specs/2026-11-11-mesa-e-fundo-design.md` (implementada, fases 1 e 2). **Regra de ouro:** a mesa é só o que se vê. Colisores = `trayColliders()` (`modules/arremesso/domain/world.ts`), nunca derivados do arquivo; resultados e física não mudam.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.ts`, `cena.ts` | as portas: `index.ts` puro (`carregar`, `mesa()`, as ações, `coresDaMesa()`, `ocultarPiso(on)`, `inspecao`, `LIMITS`, `warmImageDecoder`; o domínio que o painel usa fica nos arquivos de `domain/`, sem passar pela porta); `cena.ts` com `<MesaNaCena/>`, `<AmbienteDaMesa/>`, `<FundoCss/>` e `<PainelDaMesa/>` (controlado: `aberto`, `onAlternar`, `onFechar`) |
| `domain/tableTheme.ts` | puro: `TableTheme`, `DEFAULT_THEME` (= a mesa de antes), temas prontos (`PRESETS`, gradientes CSS), `LIMITS`, `checkTheme`, `extrasOf`/`readExtras` (o tema que viaja no `.glb`) |
| `store.ts` | store zustand vanilla (`mesa()` fora do React, `useMesa` em `ui/useMesa.tsx`): tema ativo, mesas salvas, `sessionOnly`, `colors` (cores que a mesa realmente mostra; o kraken usa por `coresDaMesa()`; o único escritor é a `MesaNaCena`). A ação `load` sai pelo `index.ts` como `carregar` |
| `repository.ts` | IndexedDB store `tables` + id ativo em `localStorage['mesa.ativa']` |
| `shared/db.ts` (fora do módulo) | abertura única do banco `dice-roller` **v2**; não conhece nome de store: `repository.ts` declara `tables` e `modules/meus-dados/repository.ts` declara `customDice` com `defineStore`; o upgrade só cria o que falta |
| `domain/tableTextures.ts`, `tableImages.ts` | texturas do feltro (veludo/couro desenhadas em canvas, ou a imagem do jogador) e redução de imagens (foto ≤ 4096 px, textura ≤ 2048 px) |
| `domain/tableBuild.ts` | monta a mesa padrão (`defaultTable`, `buildDefault`), nomes (`roleOf`, `find`), `colorsOf`, `disposeTable`; carregado junto com a cena |
| `domain/tableFile.ts` | **sob demanda** por `import()` dinâmico (no `PainelDaMesa` e na `MesaNaCena`) (traz GLTFLoader/Exporter): `exportTable`, `readTable` → `cleanTable` → `fitTable`, `buildFor` (qualquer tema) |
| `domain/importacao.ts` | puro: `temaDaMesaImportada({ read, fileName, bytes, atual, id, createdAt, colors })`, a leitura do `.glb` virando tema (fundo, nome, cores, modelo). Só importa o tipo de `tableFile.ts`. O painel passa `crypto.randomUUID()` e `Date.now()` |
| `scene/MesaNaCena.tsx` | a mesa visível do tema, dentro do `ColisoresDaBandeja` de `arremesso` (colisores fixos); grava `colors`; registra o piso (`tray-surface`) em `scene/piso.ts` |
| `scene/piso.ts` | sem React: a flag `pisoOculto` e o piso atual. `ocultarPiso(on)` grava a flag e aplica `visible = !on` na hora; um piso novo herda a flag; o que sai volta visível |
| `scene/AmbienteDaMesa.tsx` | cor de fundo (`<color attach="background">`), panorama 360° e `<EnvironmentPortal>`; recebe `podeTrocar`, as luzes (`luzes`) e os `Lightformer`s (`children`) da casca |
| `ui/FundoCss.tsx` | foto/tema pronto em CSS **atrás** do canvas (desfoque e escurecer grátis na GPU) |
| `ui/PainelDaMesa.tsx` | painel "Personalizar mesa", capítulo do livro (tecla `M` alterna e `Esc` fecha, via props); era `src/ui/TablePanel.tsx`. O `Painel` da casca (`src/app/Painel.tsx`) guarda o estado, tem o botão **Mesa** na faixa de cima e o monta no `.livro` |
| `src/modules/pressagios/scene/QuebraDaMesa.tsx` (fora do módulo) | de `pressagios`: a cada quadro, `ocultarPiso(trayBrokenAt(...))`. A casca o monta logo antes da `<MesaNaCena/>` |

O `inspecao(scene, programas)` do `index.ts` é o `window.__dice.table()`: a casca (`app/Cena.tsx`) passa a cena e `gl.info.programs.length`. Lê o tema ativo e, na cena, as cores e a textura de `feltro` e `base`/`madeira`, a caixa da `guia-area-de-jogo` e `userData.imported` do grupo `mesa`.

## Como funciona

- **Fundo:** cor = `scene.background` (`AmbienteDaMesa`); foto e tema pronto = `scene.background` nulo e canvas transparente sobre `.backdrop`. Os reflexos dos dados continuam dos `Lightformer`s: o fundo não toca nos materiais dos dados.
- **Mesa:** `MesaNaCena` desenha `buildDefault(tema)` na hora (cores/texturas geradas) e, se o tema tem modelo ou imagem de feltro, troca pelo `buildFor(tema)` quando decodifica. Nomes na cena: grupo `mesa` → `tray-surface` (base + `feltro`), `moldura` (4 paredes), `guia-area-de-jogo` (caixa 14 × 1,5 × 9, invisível), `fundo` (só no arquivo).
- A cor do feltro multiplica a textura. Ao escolher uma imagem própria o painel põe o feltro em `#FFFFFF` (a imagem aparece como é) e avisa que a cor tinge; veludo e couro mantêm a cor.
- **Tema ativo = registro salvo.** Editar a mesa padrão cria "Minha mesa"; editar grava com atraso de 300 ms (e no `pagehide`). Sem IndexedDB vale só na sessão (`sessionOnly`, o painel avisa).
- **Kraken:** `Kraken.start(..., coresDaMesa())`: cacos com o feltro da mesa e a madeira "iluminada" (`shardWood`; a madeira padrão dá `#815435`, igual a antes). Sem nó `piso`, o modelo inteiro some na quebra (o grupo raiz vira `tray-surface`). Quem decide a quebra é o `QuebraDaMesa` (do módulo `pressagios`); a mesa só obedece a `ocultarPiso`.

## Exportar e importar (`.glb` autocontido)

- Exporta com `GLTFExporter` (`binary`, `onlyVisible: false`): `mesa` > `piso` (`base`, `feltro`), `moldura`, `guia-area-de-jogo`, `fundo` (só com foto). Tema em `extras.diceRollerTable` da raiz **e** da cena. No app o nó chama `tray-surface`; só o arquivo usa `piso` (renomeado e restaurado em volta da exportação).
- Texturas opacas (imagem do feltro, foto do fundo, veludo/couro) saem como **JPEG** (`texture.userData.mimeType` temporário; o exportador grava PNG por padrão e uma foto de 7 MB virava 11 MB); só o que tem alfa fica PNG. Na volta, a foto do fundo é guardada como WebP (`blobOfImage`).
- Importa: limites 20 MB / 100 mil triângulos / textura 2048 px (`fundo` 4096), só `data:`/`blob:` (usa `parseGlb` de `shared/modelos3d`; um `ModelError` vira `TableError` com "A mesa precisa…" no lugar de "O GLB precisa…", qualquer outro erro vira a mensagem genérica). Remove `Light`/`Camera` (luz a mais recompila o shader de todos os dados). Acha as peças pelo nome sem diferenciar maiúsculas, com sufixo do Blender (`piso.001`, que o three lê como `piso001`; vale `userData.name`).
- **Encaixe** (`fitTable`): com guia, escolhe a rotação em X (0, ±90°: Z para cima) que deixa as razões de tamanho mais parecidas, escala uniforme (média geométrica) e posição que levam a guia a 14 × 1,5 × 9 em (0, 0,75, 0). Sem guia: piso 15 × 10 com topo em y = 0. Sem os dois: erro.
- **Avisos** (mostrados antes de aplicar, o jogador confirma): moldura com vértice dentro da área de jogo (acima de y = 0,1); moldura mais baixa que 1,5 ou ausente; topo do piso a mais de 0,1 de y = 0; sem `piso`; sem tema nos `extras` (mantém o fundo atual). **Erro** (nada salvo): não é `.glb`, passou dos limites, sem guia e sem piso, ilegível.
- O tema salvo guarda os bytes do `.glb` (`model`); ao carregar, `buildFor` repete o encaixe. Com modelo, cores e textura do painel ficam travadas (vêm do arquivo); o fundo continua editável.

## Armadilhas

- O primeiro `createImageBitmap` da página para a thread principal por ~1 s; `warmImageDecoder()` (em `App`) decodifica um PNG de 1 pixel na abertura para pagar isso cedo.
- Nunca mudar o número de luzes por causa da mesa. Trocar textura do feltro pode recompilar um shader uma vez (só no painel).
- O `GLTFExporter` binário usa `FileReader`: só roda no navegador (o ida-e-volta é E2E, não Vitest). Vitest cobre o encaixe, os avisos e a limpeza com objetos montados à mão.
- `MesaNaCena` só tem estado de React; o objeto 3D da mesa é recriado a cada mudança de cor/textura/modelo (descartado com `disposeTable`). Colisores não mudam.
- Testes de pixel (`smoke`, `screens`) assumem o tema padrão (fundo de cor, canvas opaco).

## Fundo 360°

Spec: `docs/superpowers/specs/2026-11-11-fundo-360-design.md`. Quarto tipo de fundo (`panorama` em `tableTheme.ts`): foto equirretangular 2:1 que vira `scene.background` **e** reflexo nos dados.

- **Tema:** `{ kind: 'panorama', image, format: 'ldr' | 'hdr', rotation (0–359), intensity (0,3–1,5), blur (0–0,4), reflect }`. `intensity` age só no fundo (`backgroundIntensity`); a força do reflexo nos dados não muda.
- **Carregar** (`tableImages.ts`): `preparePanorama` (JPG/PNG/WebP reduzidos a 4096 px; `.hdr` guardado como veio, até 25 MB; `.exr` é erro) e `panoramaTexture` (cache por blob; checa 2:1 com tolerância 1,9–2,1; HDR por `HDRLoader` em import dinâmico, reduzido por média 2×2 e guardado em half float). Com SwiftShader (`marcarRenderizadorPorSoftware`, de `shared/plataforma`, chamado em `Cena`) o teto cai para 2048 px.
- **Cena** (`scene/AmbienteDaMesa.tsx`, montado pela `app/Cena.tsx`): `<EnvironmentPortal resolution={256} map={reflect ? tex : undefined}>` com os mesmos três `Lightformer`s (o panorama **soma**; os `Lightformer`s seguem acesos). O alvo do cubemap é o mesmo para qualquer panorama, então trocar de panorama, ligar/desligar o reflexo ou girar **não** recompila shader de dado: `gl.info.programs` sobe de 40 para 42 uma vez (fundo do panorama), depois fica fixo. Rotação, brilho e desfoque vão como props do portal (o drei os reaplica a cada recaptura; setar na cena à mão seria desfeito). O drei só recaptura quando os `children` do portal mudam: o `AmbienteDaMesa` embrulha os `Lightformer`s num fragmento novo a cada render, como acontecia quando o portal estava na `Cena`.
- **Quando aplica:** `AmbienteDaMesa` guarda o panorama pedido numa ref e só o aplica (estado + `scene.background`) quando `podeTrocar()` diz que sim. A casca passa `entreAnimacoes` (fase `hand` ou showcase do arremesso atual encerrado), a mesma regra do DPR. O `FundoCss` não desenha nada para `panorama`.
- **Painel:** botão **360°** (`data-testid="table-panorama"`), sliders Girar/Brilho/Desfoque, checkbox "Refletir nos dados". A proporção é checada ao escolher o arquivo.
- **Arquivo:** nó oculto `fundo-360` (plano 2:1, como o `fundo`) + `extras`. HDR vai como JPEG tonemapeado (`c/(1+c)`, gama 2,2; o painel avisa) e volta como `ldr`. Armadilha: `roleOf('fundo-360')` dá `fundo-` (a regex do sufixo do Blender come os três dígitos), então esse nó é achado por `o.name`, não por `roleOf`. `fundo-360` sem `extras` panorama importa com os ajustes padrão e avisa.

## A janela de prévia (OS-0082)
- `ui/JanelaDaMesa.tsx`: `div.janela-da-mesa` (`role="img"`, "Prévia da mesa") com o `FundoCss` atrás e um `<Canvas>` próprio (`dpr` 1, alpha, câmera em três quartos que enquadra a bandeja; `frameloop="demand"` no perfil leve). O `PainelDaMesa` só a monta com o capítulo aberto, então o contexto WebGL nasce e morre com a página.
- `scene/MesaDePrevia.tsx`: monta `buildFor(theme)` (import dinâmico) 150 ms depois da última mudança do tema e libera a anterior com `disposeTable`. Fundo cor: `<color attach>`; 360°: `scene.background` com `panoramaTexture` (mesmo cache) e a rotação, o brilho e o desfoque do tema; foto e tema: o `FundoCss`. Luz própria (ambiente 0,35 + direcional `#fff1dc` 2,5, sem sombra). `OrbitControls` sem zoom e sem pan, `autoRotate` 0,6; desligado com movimento reduzido e no perfil leve (que chama `invalidate()` ao mudar o tema e no `change`).
- **Layout (CSS `/* OS-0082 */`):** o `aside` vira grade de 2 colunas: título e janela na página esquerda (a janela ocupa o resto da altura), `.import-body` na direita. O corpo mantém `column-count: 2` com `column-width: 9999px` (o count usado é 1, uma coluna por folha); assim o `Folheador` (que só pagina com `column-count` computado > 1) continua paginando. A câmera é calculada pelo aspecto do canvas: a bandeja (`GUIDE.size[0]`) ocupa ~80% da largura, a 35° de elevação. No celular (≤ 800 px): 220 px no topo, controles embaixo.
- **Ajuda do 360°:** `small.ajuda-360` abaixo dos botões de tipo de fundo. O espaço fica reservado; `visibility` só liga com o fundo 360° ou com `:hover`/`:focus-visible` no botão "360°" (CSS `:has()`).
- `tests/painel.test.ts` troca a janela por `null` (ela é canvas e lê o perfil do navegador); a fixture ganhou a ajuda.
