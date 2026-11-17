# Módulo `vitrine`

Duas portas (ADR 0010): `index.ts`, puro e sem React (testes em Node), e `cena.ts`, com o hook, a cena da vitrine e o painel. Tipos em `contracts.ts`, regras puras em `domain/` (`showcase`, `highlight`, `inkGlow`, `painel`), o estado em `store.ts`, a cena em `scene/Vitrine.tsx` e o painel em `ui/`. O detalhe (a ordem em `settled`, o voo, os números em destaque, a gravação acesa) está em [NOTAS.md](NOTAS.md): leia só quando a ordem mandar.

## Responsabilidade
Mostrar o resultado depois de `settled`. Os dados voam até a frente da câmera com a face sorteada virada para o jogador, o número sobe e pulsa em destaque, a gravação de um dado de forma livre se acende, e o painel mostra o total e o detalhe. Tudo isso espera o presságio terminar. É dono de: `showcased` (o store vanilla, escrito só aqui) e o cache da geometria do brilho por `kind|valor` (`domain/inkGlow.ts`).

## Regras de negócio
- Enquanto `presagioTocando()` (de `pressagios`), o relógio da vitrine é reiniciado: o voo só começa depois do presságio.
- Layout (`showcasePoses`): fileiras na frente da câmera, 5 colunas em paisagem e 3 em retrato, na ordem do resultado; cada dado mostra a face sorteada para a câmera, com o número em pé. Usa `raw`, nunca relê o dado. As fileiras com moeda se afastam 0,45 (`CAPTION.room`) para a legenda.
- Linha do tempo (`SHOW`): o número sobe em 550 ms; o voo começa em 1.000 ms, dura 650 ms e é escalonado em 70 ms por dado; depois o número pulsa a 0,9 Hz e "gruda" na face cedo, para nunca aparecerem dois números. A sombra some na decolagem.
- Moeda: voa como os dados e mostra o desenho; "Cara"/"Coroa" fica embaixo. Dado com símbolo (Vampiro): sobe o símbolo em vez do número.
- Dado importado gravado (`printed`): a forma livre é vista de cima e acende a tinta voltada para cima; a forma padrão (não d4) acende só a tinta da face do resultado (`MESMA_FACE`). Com brilho, sem número solto. Sem gravação achada, a forma livre põe o número na frente do dado, no tamanho `FONT.livre`, e a padrão segue o caminho comum.
- Os dados com percurso de presságio (`indicesComPercurso`) seguem `movimentoNoPresagio` e não fazem o voo comum.
- A pose vai sempre por `moverDado` (de `arremesso`): em `settled`, só a vitrine move os dados. Ao pousar, fixa a pose a cada quadro e grava `showcased` (`vitrineConcluida`) um quadro depois de pousar.
- Movimento reduzido: sem voo, e o número só aparece acima do dado. A vitrine conclui na hora.
- Luz de destaque (`scene/Vitrine.tsx`, regra pura `intensidadeDoDestaque` em `domain/destaque.ts`): um `<pointLight>` `#ffe8c0` (distance 8, decay 2, sem sombra) montado sempre no perfil completo; não monta no leve (ADR 0011). Sobe de 0 a 5 ao longo do voo (`SHOW.duration`, contado do início do voo), fica no centro das poses de chegada + (0, 0.6, 1.2) no espaço da câmera, e fora do showcase cai a 0 em 200 ms. Software: sempre 0. Movimento reduzido: vai direto ao valor final.
- Painel (`<PainelDoResultado/>`): o total (`regras.total`) e o detalhe só quando há resultado e nenhum presságio tocando. Detalhe: o valor de cada dado, e "Cara"/"Coroa" nas moedas; só moedas: "Cara", "2 caras, 1 coroa". `data-testid="result"`, `aria-live`; `data-presagio="crit|fumble|duality"` (`omenKind`) quando há texto e o presságio é do mesmo `throwId`.

## Expõe
- `index.ts`: `vitrine()` (o `showcased` da spec é `vitrine().showcased`), `vitrineConcluida(throwId)` (a casca usa para o DPR e o panorama), `resultText` (um teste da raiz usa); `inspecao(cena)` → `{ highlights(), inkGlow(i) }` (os campos do `window.__dice`). O resto (`setShowcased`, `showcasePoses`, `CAPTION`, `highlightAt`, `HL_SIZE`, `SHOW`, `glowMesh`, `upInk`, `MESMA_FACE`) fica nos arquivos de `domain/` e `store.ts`, que só os testes do módulo importam.
- Contrato do DOM: `data-presagio` no `<output data-testid="result">`; consumidor, o CSS da casca (OS-0061).
- Tipos (`contracts.ts`): `EstadoDaVitrine` e `VitrineInspecionada`, só dentro do módulo (nenhum fora da porta).
- `cena.ts`: `<Vitrine/>` (a casca monta dentro do `<Physics>`, logo depois de `<MaoDoArremesso/>`); `<PainelDoResultado/>` (o `Painel` da casca, `src/app/Painel.tsx`, monta em `.feedback`).
- Os nomes `result-highlights` (o grupo dos números) e `ink-glow-i` (o brilho) existem só aqui; de fora, use `inspecao`.

## Consome
- `arremesso`: `arremesso()` (fase, `throwId`, `raw`, `ready`), `corposVivos()`, `moverDado`; no painel, `useArremesso` (`cena.ts`).
- `pressagios`: `presagio()` (`omen`, `omenAt`), `presagioTocando()`, `indicesComPercurso`, `movimentoNoPresagio`; no painel, `usePresagioTocando` e `usePresagio` (`cena.ts`).
- `dados`: `polyhedron`, `customDie`, `symbolGeometry`, `FONT`, `FONT_URL`, `SYMBOL`, `RADIUS`, `RAIO_MAXIMO`, `gemColor`, `inkColorOf`, `dadoNaRaiz`, `gemaNaRaiz`, `sombraNaGema`, `allKinds`, `nomeDoTipo`.
- `regras`: `total`, `isCustom`, `MAX_DICE`, `omenKind`.
- `src/shared`: `plataforma` (`movimentoReduzido`, `perfilLeve`, `renderizadorPorSoftware`), `math` (`Pose`, `easeOut`, `clamp01`).

## Fora do escopo
- O retorno à mão: `arremesso`. O efeito do presságio: `pressagios`. Os numerais pintados no dado: `dados`.
- O `window.__dice` e o predicado "entre animações": a casca (`src/app/Cena.tsx`).
