# Spec: `mesa`

Pasta: `src/modules/mesa/`. Extração nº 7.

## CLAUDE.md (formato final)

### Responsabilidade
Aparência da mesa e do fundo. Temas prontos, cores, texturas do feltro, foto de fundo e fundo 360°; mesas salvas no navegador; exportar e importar a mesa como `.glb`; o painel "Personalizar mesa". A mesa é só o que se vê: nunca muda os colisores nem os resultados.

### Regras de negócio
- A mesa padrão (`padrao`) nunca é salva. Editar a padrão cria "Minha mesa" com id novo. A edição grava depois de 300 ms e no `pagehide`. Aplicar e duplicar gravam na hora; a cópia se chama "<nome> (cópia)", com até 40 caracteres.
- Remover uma mesa volta à padrão se ela era a ativa. Hoje o `remove` também cancela a gravação pendente de qualquer mesa (preservado; ver diagnóstico §10).
- O tema ativo é o registro salvo. O id ativo fica em `localStorage['mesa.ativa']` e é apagado quando a padrão está ativa.
- Sem IndexedDB, a mesa vale só na sessão, com aviso.
- Fundo:
  - cor (`scene.background`); foto ou tema pronto (CSS atrás do canvas, com desfoque e escurecer);
  - 360° (equirretangular 2:1 com tolerância de 1,9 a 2,1; JPG/PNG/WebP reduzidos a 4.096 px, 2.048 px com renderizador por software; `.hdr` até 25 MB; `.exr` recusado);
  - rotação, brilho e desfoque; "refletir nos dados".
- O panorama só é aplicado entre animações. Quem decide o momento é a casca (`podeTrocar`).
- O feltro tem cor que tinge a textura: liso, veludo, couro ou imagem própria (reduzida a 2.048 px, cor branca). Tamanho da textura padrão: 2.
- Exportar: GLB binário com `mesa > piso (base, feltro)`, `moldura`, `guia-area-de-jogo` e `fundo`/`fundo-360`. O tema vai em `extras.diceRollerTable`. Texturas opacas saem como JPEG.
- Importar:
  - limites: 20 MB, 100 mil triângulos, textura de 2.048 px (fundo 4.096);
  - aceita só `data:`/`blob:` e remove luzes e câmeras;
  - encaixe pela guia (rotação X de 0 ou ±90° com menor dispersão, escala por média geométrica, guia em 14 × 1,5 × 9) ou pelo piso (15 × 10 com topo em y = 0);
  - avisos (o jogador confirma) e erros (nada é salvo).
- Com modelo importado, cores e textura ficam travadas; o fundo continua editável.
- As cores que a mesa mostra (`coresDaMesa`) são as do objeto 3D quando há modelo; sem modelo, as do tema. O comportamento atual fica preservado; ver a dúvida 3.
- Nunca muda o número de luzes por causa da mesa.

### Expõe
- `carregar()`: a casca chama na montagem.
- Componentes: `<MesaNaCena/>` (o visual da bandeja), `<FundoCss/>` (o antigo `Backdrop`), `<AmbienteDaMesa podeTrocar />` (cor de fundo, panorama e mapa do ambiente), `<PainelDaMesa/>`.
- `coresDaMesa() → { felt, wood }`.
- `ocultarPiso(on)`: para a quebra do kraken.
- `inspecao()` (modo teste): o mesmo conteúdo do `table()` de hoje.

### Consome
- `arremesso`: `TRAY`, as medidas da área de jogo.
- `src/shared/db`, `src/shared/modelos3d` (os limites da mesa entram por parâmetro), `src/shared/plataforma` (`renderizadorPorSoftware`), `src/shared/math`.

### Fora do escopo
- Quando a mesa quebra e a cor dos cacos: `pressagios`.
- Os colisores: `arremesso`.
- O DPR, as luzes e os `Lightformer`s: casca.

## Dados de que é dono
- O store da mesa (`theme`, `tables`, `sessionOnly`, `colors`); `colors` passa a ter um escritor só, dentro do módulo.
- IndexedDB, store `tables`; `localStorage['mesa.ativa']`.
- Caches de textura do feltro, de panorama e a textura única de reserva (`PLACEHOLDER`).

## Origem do código

| De | O quê |
|---|---|
| `src/scene/table{Theme,State,Store,Textures,Images,Build,File}.ts` | tudo. De `tableFile.ts`, a leitura do GLB passa a usar `src/shared/modelos3d` em vez de `dice/importer.parseGlb`. A identificação do erro por `constructor.name` some |
| `src/scene/Tray.tsx:19-47` | o visual da mesa. A regra `broken()` vai para `pressagios` (que chama `ocultarPiso`), e os colisores para `arremesso` |
| `src/scene/Backdrop.tsx` | tudo |
| `src/ui/TablePanel.tsx` | tudo. A conversão "mesa importada → tema" (`:69-83`) vira uma função pura com teste |
| `src/scene/Stage.tsx:100, 104, 114-132, 306, 313-319` | panorama, cor de fundo, props do `EnvironmentPortal` |

**Pontos de chamada a trocar:**
- `App.tsx` (`load`, `warmImageDecoder`);
- o legado de `Omens.tsx` (`useTable.colors` → `coresDaMesa`);
- o test hook (`table`);
- o E2E `table-kraken.spec.ts:5`, que importa `/src/scene/tableState.ts` por URL e tem o caminho atualizado;
- `tests/table.test.ts`, que move para o módulo (a parte dos cacos do kraken fica para `pressagios`).

## Critérios de aceite da extração
- A conversão de mesa importada é uma função pura testada.
- Ninguém fora do módulo acessa a store `tables` nem a chave `mesa.ativa`.
- `useTable` não é importado fora do módulo.
- Os E2E `table` e `table-kraken` passam; o pixel dos testes de `smoke` também.
- O chunk sob demanda `tableFile` continua existindo.
- O gate completo passa.
