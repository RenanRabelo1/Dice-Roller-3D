# Mesa e fundo personalizados

O jogador muda o fundo e a aparência da bandeja, salva no navegador e exporta/importa a mesa como `.glb`. Spec: `docs/superpowers/specs/2026-11-11-mesa-e-fundo-design.md` (implementada, fases 1 e 2). **Regra de ouro:** a mesa é só o que se vê. Colisores = `trayColliders()` (`physics/world.ts`), nunca derivados do arquivo; resultados e física não mudam.

## Arquivos

| Arquivo | Papel |
|---|---|
| `scene/tableTheme.ts` | puro: `TableTheme`, `DEFAULT_THEME` (= a mesa de antes), temas prontos (`PRESETS`, gradientes CSS), `LIMITS`, `checkTheme`, `extrasOf`/`readExtras` (o tema que viaja no `.glb`) |
| `scene/tableState.ts` | zustand `useTable`: tema ativo, mesas salvas, `sessionOnly`, `colors` (cores que a mesa realmente mostra; o kraken usa) |
| `scene/tableStore.ts` | IndexedDB store `tables` + id ativo em `localStorage['mesa.ativa']` |
| `indexedDb.ts` | abertura única do banco `dice-roller` **v2** (`customDice` + `tables`); o upgrade só cria o que falta |
| `scene/tableTextures.ts`, `tableImages.ts` | texturas do feltro (veludo/couro desenhadas em canvas, ou a imagem do jogador) e redução de imagens (foto ≤ 4096 px, textura ≤ 2048 px) |
| `scene/tableBuild.ts` | monta a mesa padrão (`defaultTable`, `buildDefault`), nomes (`roleOf`, `find`), `colorsOf`, `disposeTable`; carregado junto com a cena |
| `scene/tableFile.ts` | **sob demanda** (traz GLTFLoader/Exporter): `exportTable`, `readTable` → `cleanTable` → `fitTable`, `buildFor` (qualquer tema) |
| `scene/Tray.tsx` | colisores fixos + a mesa visível do tema; esconde `tray-surface` na quebra do kraken |
| `scene/Backdrop.tsx` | foto/tema pronto em CSS **atrás** do canvas (desfoque e escurecer grátis na GPU) |
| `ui/TablePanel.tsx` | painel "Personalizar mesa" (botão **Mesa**, tecla `M`, `Esc` fecha) |

## Como funciona

- **Fundo:** cor = `scene.background` (`Stage`); foto e tema pronto = `scene.background` nulo e canvas transparente sobre `.backdrop`. Os reflexos dos dados continuam dos `Lightformer`s: o fundo não toca nos materiais dos dados.
- **Mesa:** `Tray` desenha `buildDefault(tema)` na hora (cores/texturas geradas) e, se o tema tem modelo ou imagem de feltro, troca pelo `buildFor(tema)` quando decodifica. Nomes na cena: grupo `mesa` → `tray-surface` (base + `feltro`), `moldura` (4 paredes), `guia-area-de-jogo` (caixa 14 × 1,5 × 9, invisível), `fundo` (só no arquivo).
- A cor do feltro multiplica a textura. Ao escolher uma imagem própria o painel põe o feltro em `#FFFFFF` (a imagem aparece como é) e avisa que a cor tinge; veludo e couro mantêm a cor.
- **Tema ativo = registro salvo.** Editar a mesa padrão cria "Minha mesa"; editar grava com atraso de 300 ms (e no `pagehide`). Sem IndexedDB vale só na sessão (`sessionOnly`, o painel avisa).
- **Kraken:** `Kraken.start(..., useTable.colors)`: cacos com o feltro da mesa e a madeira "iluminada" (`shardWood`; a madeira padrão dá `#815435`, igual a antes). Sem nó `piso`, o modelo inteiro some na quebra (o grupo raiz vira `tray-surface`).

## Exportar e importar (`.glb` autocontido)

- Exporta com `GLTFExporter` (`binary`, `onlyVisible: false`): `mesa` > `piso` (`base`, `feltro`), `moldura`, `guia-area-de-jogo`, `fundo` (só com foto). Tema em `extras.diceRollerTable` da raiz **e** da cena. No app o nó chama `tray-surface`; só o arquivo usa `piso` (renomeado e restaurado em volta da exportação).
- Texturas opacas (imagem do feltro, foto do fundo, veludo/couro) saem como **JPEG** (`texture.userData.mimeType` temporário; o exportador grava PNG por padrão e uma foto de 7 MB virava 11 MB); só o que tem alfa fica PNG. Na volta, a foto do fundo é guardada como WebP (`blobOfImage`).
- Importa: limites 20 MB / 100 mil triângulos / textura 2048 px (`fundo` 4096), só `data:`/`blob:` (reaproveita `parseGlb` de `dice/importer.ts`). Remove `Light`/`Camera` (luz a mais recompila o shader de todos os dados). Acha as peças pelo nome sem diferenciar maiúsculas, com sufixo do Blender (`piso.001`, que o three lê como `piso001`; vale `userData.name`).
- **Encaixe** (`fitTable`): com guia, escolhe a rotação em X (0, ±90°: Z para cima) que deixa as razões de tamanho mais parecidas, escala uniforme (média geométrica) e posição que levam a guia a 14 × 1,5 × 9 em (0, 0,75, 0). Sem guia: piso 15 × 10 com topo em y = 0. Sem os dois: erro.
- **Avisos** (mostrados antes de aplicar, o jogador confirma): moldura com vértice dentro da área de jogo (acima de y = 0,1); moldura mais baixa que 1,5 ou ausente; topo do piso a mais de 0,1 de y = 0; sem `piso`; sem tema nos `extras` (mantém o fundo atual). **Erro** (nada salvo): não é `.glb`, passou dos limites, sem guia e sem piso, ilegível.
- O tema salvo guarda os bytes do `.glb` (`model`); ao carregar, `buildFor` repete o encaixe. Com modelo, cores e textura do painel ficam travadas (vêm do arquivo); o fundo continua editável.

## Armadilhas

- O primeiro `createImageBitmap` da página para a thread principal por ~1 s; `warmImageDecoder()` (em `App`) decodifica um PNG de 1 pixel na abertura para pagar isso cedo.
- Nunca mudar o número de luzes por causa da mesa. Trocar textura do feltro pode recompilar um shader uma vez (só no painel).
- O `GLTFExporter` binário usa `FileReader`: só roda no navegador (o ida-e-volta é E2E, não Vitest). Vitest cobre o encaixe, os avisos e a limpeza com objetos montados à mão.
- `Tray` só tem estado de React; o objeto 3D da mesa é recriado a cada mudança de cor/textura/modelo (descartado com `disposeTable`). Colisores não mudam.
- Testes de pixel (`smoke`, `screens`) assumem o tema padrão (fundo de cor, canvas opaco).
