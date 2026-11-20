# Ordem de serviço: presságios, o vampiro do par passa a ser o modelo Tripo H3.1

Ordem: OS-0104
Módulo: `pressagios` (o asset `public/modelos/vampiro.glb`)
Executor: o orquestrador, na sessão principal (só Blender e asset; o código do site não muda).
Escopo de escrita: `public/modelos/vampiro.glb`, `ferramentas/blender/**`, `docs/contexto/modelos-animados.md`, `src/modules/pressagios/NOTAS.md`

Pedido do usuário (2026-11-20): trocar o vampiro de teste (H2.5, rosto derretido e dedos fundidos) pelo modelo gerado no Tripo Pro (H3.1, com Retopo) e animá-lo no Blender. Durante as revisões o usuário pediu ainda:
- "ele não pode atravessar a bandeja": escolheu a opção B, em que ele **escala** a parede, com o peito debruçado por cima do topo e o rosto visível;
- "a cabeça está atravessando o capuz quando ele olha para a frente";
- "o capuz deve ficar para trás da cabeça quando ele se aproximar";
- sem a gola em pé como um leque nas costas durante o bote.

## Decisões

1. **Modelo:** HD Model H3.1 em T-pose e, depois, o **Retopo** do Tripo (de 1,9 milhão para 60 mil triângulos, com as texturas assadas). Decimar no Blender rachava a textura do rosto.
2. **Esqueleto (`esqueleto.py`):**
   - solda antes de medir;
   - o tronco vai para `Y_TRONCO = -0.08`, o ponto em que a coreografia foi medida;
   - os dedos são achados pela conectividade da malha (eram fundidos no H2.5);
   - pescoço e cabeça ficam no centro medido do crânio (`Y_CAB`), não no eixo do tronco;
   - a gola alta fora do crânio sai da cabeça e passa para o peito e o pescoço, e ganha um osso próprio, `gola`;
   - as texturas são reduzidas a 1024 com `img.pack()`.
3. **Animação (`animar.py`):**
   - dedos articulados com contato;
   - escalada sobre a parede (`SOBE` +0,23, `INCL_PEITO` 82°);
   - correção por quadro do corpo contra a bandeja, recuando ou erguendo o quadril, com suavização e o cotovelo desviando da madeira;
   - a gola deita para trás e encolhe 50% só enquanto ele encara a câmera (`dobrar_gola`).
4. **O código do site não muda.** Âncora, escala, clipe `par` e IK do bote (OS-0103) seguem iguais. O osso extra `gola` e os dedos não interferem no IK, que procura os ossos do braço pelo nome.

## Critérios de aceite

- Corpo contra a bandeja: pior caso ≤ 2 cm (`CORPO_PIOR` do `animar.py`).
- A cabeça não atravessa a gola, nem ao encarar nem no bote (prévias pela câmera do jogo, `cam.001`).
- O GLB carrega no site, com texturas ≤ 2048 px (o leitor recusa acima disso).
- O usuário confere no `npm run dev` com o botão Par de críticos.
- Gate completo antes do PR.

## Resultado

- **Corpo:** `CORPO_PIOR` 0,012 m (240 ms). Mãos nos alvos (`L_falta`/`R_falta` 0). Rosto inteiro no quadro ao encarar; o topo do cabelo fica ~3% fora.
- **Asset:** 2,9 MB, 49 ossos, texturas WebP de 1024 px. A primeira exportação saiu com a cor em 4096 px e o site caiu na figura procedural (`img.scale` sem `img.pack()`); foi corrigido.
- **Verificação no meio do trabalho:** `vampiroGlb.test.ts` (13 testes) e o E2E "test button Par de críticos" passaram, sem `console.warn` do carregador. O usuário aprovou no site.
- **Gate:**
  - `build`, `lint`, `npm test` (692 testes em 87 arquivos) e `test:server` (25) passaram.
  - E2E: o grupo em série passou (36). No paralelo, 69 passaram e 11 falharam, com dois servidores de dev ainda no ar na máquina.
  - Rodados de novo sozinhos (`--last-failed`), passaram os 4 de `import.spec` e o de `table.spec`. Continuam falhando os 6 de `screens.spec` (numerais na superfície: margem medida 0).
  - **A falha de `screens.spec` não vem desta ordem:** ela se repete com o `vampiro.glb` da `main`, e esta ordem não muda código do site. Fica registrada como pendência à parte.
- **Limites que ficaram:** o topo do cabelo encosta na borda da tela ao encarar, e as bordas da gola dobrada aparecem de perfil ao lado das bochechas.
- **Processo e armadilhas:** `docs/contexto/modelos-animados.md` (apêndice, item 12, e a tabela de armadilhas).
