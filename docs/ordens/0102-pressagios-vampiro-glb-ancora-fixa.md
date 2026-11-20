# Ordem de serviço: presságios, o vampiro GLB animado com âncora fixa

Ordem: OS-0102
Módulo: `pressagios`
Executor: o dev da OS-0101, na mesma worktree. Dúvidas vão para o orquestrador.
Escopo de escrita: `src/modules/pressagios/**`

Pedido do usuário (2026-11-19): o vampiro animado de verdade, não uma pose parada subindo e descendo. A coreografia:
- as mãos aparecem primeiro e agarram a borda;
- ele faz força e sobe;
- o rosto aparece e encara o jogador;
- tenta pegar o dado, desiste e sai;
- só no fim as mãos soltam.

## O que mudou no asset (já está no branch base, commit `2ec2802`)

`public/modelos/vampiro.glb` (3,5 MB) tem um clipe `par` com **toda** a movimentação, inclusive a subida e a descida. Para as mãos ficarem presas na borda enquanto o corpo se move, a raiz do modelo precisa ficar parada. Por isso o clipe foi feito para uma **âncora fixa no mundo**:

- **Posição da raiz:** `[0, -8.67, -6.037]`. É o `corpo.p` da presença cheia mais o `DESLOCAMENTO_DO_GLB` da OS-0101.
- **Escala:** `7.5`.
- **Tempo do clipe:** `t / 1000` (inalterado).

**Não recalibre a âncora nem a escala.** As mãos, o dado e a parede foram posicionados no Blender a partir desses valores. Qualquer deslocamento tira as mãos da borda ou faz o corpo atravessar a parede. Se o enquadramento estiver errado, pare e reporte com capturas. O ajuste é no Blender.

## Tarefas

**T1. Âncora fixa no `VampiroGlb`.**
- `update(t)` deixa de seguir `vampiroAt(...).corpo.p`. A raiz fica sempre em `ANCORA_DO_GLB = [0, -8.67, -6.037]`, com escala `ESCALA_DO_GLB = 7.5`. Substitua `DESLOCAMENTO_DO_GLB` pela âncora.
- Visibilidade: visível para `0 < t < PAR.duration`. O clipe esconde o corpo atrás da parede no começo e no fim.
- O resto não muda: mixer, `setTime`, a reserva procedural, `hide` e `dispose`.

**T2. Testes.** Ajuste `tests/vampiroGlb.test.ts` à âncora fixa: a posição da raiz é igual à âncora em qualquer `t`, e a visibilidade segue a regra da T1. Os outros casos continuam.

**T3. Capturas.**
- Com o seu script de `temp/`, gere `screens/os0102-par-<ms>.png` em 300, 1000, 2000, 3400, 3800 e 5300 ms.
- Diga no relatório se a cabeça fica abaixo da barra do topo do site e se alguma mão atravessa a madeira na luz real do jogo.

**T4. Documentação.** No `CLAUDE.md` e no `NOTAS.md` do módulo, registre que a figura do par usa âncora fixa e que toda a movimentação vem do clipe.

## Critérios de aceite
- `npm run build && npm run lint && npm test` passam. Sem E2E.
- As capturas estão em `screens/`, e o `npm run dev:test` fica no ar no fim.

## Fora do escopo
O clipe e o modelo (são do orquestrador), os bestiais, os morcegos, o sangue e a câmera.

## Resultado

Integrada (`a2c6db6`), com âncora fixa `[0, -8.67, -6.037]` e escala 7,5, sem recalibração. Depois da conferência do usuário no `dev:test`, vieram dois ajustes:

- **A figura congelava na segunda rodada.** A ação `LoopOnce` + `clampWhenFinished` ficava pausada no fim da primeira. Agora o `VampiroGlb` faz `paused = false; enabled = true` antes de cada `setTime`, com um teste de duas rodadas seguidas (`4a14e65`).
- **A gola cortava o rosto ao encarar o jogador.** No Blender, o peito passou a fazer 40% do olhar, exceto no bote (`5c8bc25`).

O clipe final tem a mão rígida em garra: os dedos fundidos do H2.5 não aguentam articulação (ver o apêndice de `docs/contexto/modelos-animados.md`). Gate de unidade verde; o E2E completo rodou no fechamento do grupo OS-0101 a OS-0103.
