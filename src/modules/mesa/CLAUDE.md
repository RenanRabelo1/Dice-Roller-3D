# Módulo `mesa`

Duas portas (ADR 0010): `index.ts`, puro e sem React (testes em Node), e `cena.ts`, com o hook e os componentes. Tipos em `contracts.ts`, regras puras em `domain/` (`tableTheme`, `tableTextures`, `tableImages`, `tableBuild`, `tableFile`, `importacao`), a gravação em `repository.ts`, o estado em `store.ts`, a cena em `scene/` e o HTML em `ui/`. O `domain/tableFile.ts` (GLTFLoader/Exporter) só entra por `carregarArquivoDeMesa()` e é um chunk à parte. Já o `repository.ts` é carregado estaticamente: o `defineStore('tables')` roda antes de o banco abrir (armadilhas.md). O detalhe (arquivos, exportar e importar, fundo 360°, armadilhas) está em [NOTAS.md](NOTAS.md): leia só quando a ordem mandar.

## Responsabilidade
Aparência da mesa e do fundo: temas prontos, cores, texturas do feltro, foto de fundo e fundo 360°; mesas salvas no navegador; exportar e importar a mesa como `.glb`; o painel "Personalizar mesa". A mesa é só o que se vê: nunca muda os colisores nem os resultados. É dono de: o store da mesa (`theme`, `tables`, `sessionOnly`, `colors`; `colors` só a `MesaNaCena` escreve); o store `tables` do IndexedDB; `localStorage['mesa.ativa']`; os caches de textura do feltro e de panorama e a textura de reserva (`PLACEHOLDER`).

## Regras de negócio
- A padrão (`padrao`) nunca é salva. Editá-la cria "Minha mesa" com id novo. A edição grava depois de 300 ms e no `pagehide`; aplicar e duplicar gravam na hora ("<nome> (cópia)", até 40 caracteres).
- Remover a ativa volta à padrão; o `remove` cancela a gravação pendente de qualquer mesa (preservado). O id ativo fica em `mesa.ativa` e sai com a padrão ativa. Sem IndexedDB, vale só na sessão, com aviso.
- Fundo: cor (`scene.background`); foto ou tema pronto (CSS atrás do canvas, `FundoCss`); 360° (2:1 de 1,9 a 2,1; JPG/PNG/WebP a 4.096 px, 2.048 px com renderizador por software; `.hdr` até 25 MB; `.exr` recusado). O panorama só troca quando a casca diz `podeTrocar`.
- Feltro: a cor tinge a textura (liso, veludo, couro ou imagem própria a 2.048 px, cor branca; tamanho padrão 2).
- Exportar: GLB com `mesa > piso (base, feltro)`, `moldura`, `guia-area-de-jogo`, `fundo`/`fundo-360`; tema em `extras.diceRollerTable`; texturas opacas em JPEG.
- Importar: 20 MB, 100 mil triângulos, textura de 2.048 px (fundo 4.096); só `data:`/`blob:`; sem luzes e câmeras; encaixe pela guia ou pelo piso; avisos (o jogador confirma) e erros (nada salvo). `temaDaMesaImportada` (pura) converte a leitura em tema.
- Com modelo, cores e textura travam; o fundo continua editável. `coresDaMesa()` dá as cores do objeto 3D com modelo, senão as do tema.
- Nunca muda o número de luzes por causa da mesa.
- O DOM do painel (textos, `aria-label`, roles, classes) é contrato dos E2E e do CSS; `tests/painel.test.ts` o compara com a fixture `tests/fixtures/painel-antes.json`, capturada do antigo `TablePanel`.

## Expõe
- `index.ts`: `carregar()` (a casca chama na montagem; é o `load` do store), `mesa()` e as ações (`apply`, `edit`, `copy`, `remove`, `reset`), `coresDaMesa()`, `ocultarPiso(on)` (chamado por `pressagios`, no `QuebraDaMesa`), `temaDaMesaImportada`, `inspecao(scene, programas)` (o `table()` do test hook), `carregarArquivoDeMesa()`, `warmImageDecoder` e o domínio que o painel usa (`DEFAULT_THEME`, `PRESETS`, `LIMITS`, os `clamp*`, `colorsOf`, `disposeTable`, `reduceImage`, `preparePanorama`, `panoramaTexture`, `panoramaPicture`, `TableError`, `fileSafe`).
- Tipos (`contracts.ts`): `TableState`, `TableTheme`, `Background`, `PresetName`, `MesaImportada`, `MesaInspecionada`.
- `cena.ts`: `useMesa(sel)`; `<MesaNaCena/>` (o visual, dentro dos colisores de `arremesso`), `<AmbienteDaMesa podeTrocar luzes>{Lightformers}</AmbienteDaMesa>`, `<FundoCss/>`, `<PainelDaMesa aberto onAlternar onFechar/>` (capítulo do livro, controlado pela casca; a tecla `M` continua no módulo e alterna via `onAlternar`; `Esc` e × chamam `onFechar`; o botão **Mesa** fica na faixa de cima da casca, em `src/app/Painel.tsx`).

## Consome
- `arremesso`: `TRAY` e `trayColliders` (as medidas da área de jogo, para o encaixe) e `<ColisoresDaBandeja/>`.
- `src/shared`: `db` (`defineStore`), `modelos3d` (`parseGlb`, `ModelError`; limites por parâmetro), `plataforma` (`renderizadorPorSoftware`).

## Fora do escopo
- Quando a mesa quebra e a cor dos cacos: `pressagios` (`QuebraDaMesa` e `Kraken`, em `pressagios/scene`).
- Os colisores: `arremesso`.
- O DPR, as luzes, os `Lightformer`s e o momento de trocar o panorama (`podeTrocar`): casca.
- O botão **Mesa** e o estado aberto/fechado do livro (`src/app/Painel.tsx`); o CSS do painel.
