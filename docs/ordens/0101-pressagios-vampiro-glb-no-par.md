# Ordem de serviço: presságios, o vampiro em GLB no par de críticos

Ordem: OS-0101
Módulo: `pressagios`
Executor: dev em Sonnet 5.5, esforço médio, na própria worktree. Dúvidas vão para o orquestrador, nunca para o usuário.
Escopo de escrita:
- `src/modules/pressagios/**`
- `src/shared/modelos3d/ler.ts`: só a linha da tarefa T1.

Pedido do usuário (2026-11-19): o vampiro procedural da OS-0100 "quebra a imersão". A partir de agora, o modelo vem do Tripo AI e o esqueleto, a pose e a animação vêm do Blender. Esta ordem é o **teste de integração** do caminho: o GLB entra na cena só no par de críticos, parado na pose debruçada, para validar escala, luz, enquadramento e desempenho antes de animar.

## Leia antes de começar
- `src/modules/pressagios/CLAUDE.md` e `NOTAS.md`, seção Vampiro.
- `scene/PresagiosNaCena.tsx`: a classe `Show` (`compile`, `update`, `hideVampiro`, `dispose`) e o componente que a monta.
- `scene/Vampiro.ts`: a figura procedural. **Não muda.** Continua sendo usada nos bestiais e como reserva no par.
- `domain/vampiroMotion.ts`: `PAR`, `presencaAt` e `vampiroAt('par-de-criticos', t)`.
- `src/shared/modelos3d/ler.ts`: `parseGlb`.
- `src/modules/mesa/domain/panoramas.ts`: como o site monta a URL de um arquivo em `public/` (`import.meta.env.BASE_URL`).

## O asset (já está no branch)

`public/modelos/vampiro.glb`, 3,3 MB, com a origem em `public/modelos/LICENSE.md`. É um **modelo de teste**, com o rosto ruim por ser H2.5. A versão final H3.1 vai entrar no mesmo caminho e com a mesma estrutura, sem mudar código.

- Uma `SkinnedMesh` (39.219 vértices) com um esqueleto de 19 ossos. A raiz da cena é `Esqueleto`. Os ossos se chamam `quadril`, `coluna`, `peito`, `pescoco`, `cabeca`, `clavicula.L/R`, `braco.L/R`, `antebraco.L/R`, `mao.L/R`, `coxa.L/R`, `canela.L/R` e `pe.L/R`.
- Unidades: a figura tem 1,8 de altura, os pés ficam em y = 0, ela está centrada em x/z e olha para +Z (para a câmera).
- Um clipe chamado `par`, de cerca de 5,6 s. **O tempo do clipe é o relógio do presságio:** `t` ms do par equivale a `t / 1000` s do clipe. Hoje o clipe guarda só a pose debruçada, parada, com o tronco inclinado uns 32° e as palmas abertas ao lado do rosto. Quando a animação de verdade chegar, ela substitui o clipe, e o código desta ordem não muda.
- Três texturas WebP de 1024 px (cor, normal e rugosidade/metal), com o material PBR que o `GLTFLoader` cria.

## Decisões do orquestrador

1. **Asset externo autorizado.** Esta ordem revoga, para o vampiro do par, a regra "sem asset externo, sem textura de imagem" das OS-0099 e OS-0100. Combinado com o usuário em 2026-11-19. Morcegos, sangue e bestiais continuam procedurais.
2. **O código decide onde, o clipe decide como.** A posição da raiz vem de `vampiroAt('par-de-criticos', t).corpo.p`: subir de trás da parede, avançar e afundar no fim. A escala vem de uma constante de calibração. O tronco, os braços e a cabeça vêm do clipe. Ignore `corpo.lean`, `esquerda` e `direita` no GLB, porque a pose já está no clipe.
3. **Reserva procedural.** Enquanto o GLB não carregou, ou se o carregamento falhar, o par usa a figura procedural de hoje, sem erro na tela e sem `console.error` (um `console.warn` basta). Os testes em Node nunca carregam o arquivo, então rodam nesse caminho e os testes atuais continuam valendo.
4. **Carregamento.** Uma vez só, depois da montagem do `PresagiosNaCena`: `fetch` do GLB, `arrayBuffer()`, `parseGlb(bytes, () => 1024)`. Nada de `useGLTF` nem de loader novo: o leitor de `shared/modelos3d` já faz isso (ADR 0008). Quando terminar, o modelo entra no compile compartilhado (`Show.compile`), como os outros efeitos, para não travar a primeira vez que o par toca.
5. **Sem dependência nova** e sem mudar contratos (`contracts.ts`), `vitrine`, `regras` ou `arremesso`.
6. **Testes só de código, sem E2E** (regra do usuário para ajuste visual). Quem aprova o visual é o usuário, com o dev server no ar.

## Tarefas

**T1. `parseGlb` preserva os clipes.** Em `src/shared/modelos3d/ler.ts`, faça o objeto devolvido trazer as animações do glTF: `gltf.scene.animations = gltf.animations` (o `Object3D` do three já tem o campo `animations`). É uma linha. Os chamadores de hoje (mesa e meus-dados) não mudam.

**T2. `scene/VampiroGlb.ts`, a figura em GLB do par.** Uma classe com o mesmo jeito da `Vampiro`:
- `readonly root = new Group()`, que começa escondido.
- `anexar(objeto: Object3D)`: adiciona o objeto ao `root`, cria o `AnimationMixer` e toca o clipe `par` (`LoopOnce`, `clampWhenFinished`). Se o clipe não existir, fica na pose do arquivo.
- `pronto` (getter): diz se já há um objeto anexado.
- `update(t: number)`:
  - lê `vampiroAt('par-de-criticos', t)`;
  - `root.visible = corpo.visivel`;
  - `root.position.set(...corpo.p)` e `root.scale.setScalar(ESCALA_DO_GLB)`;
  - `mixer.setTime(Math.min(t, PAR.duration) / 1000)`.
- `hide()` e `dispose()`. O `dispose` libera geometrias, materiais e texturas uma vez só, no padrão da `Vampiro.dispose`.
- `assets()`, se o `Show.compile` precisar da lista para aquecer, no mesmo padrão dos outros efeitos.
- Calibração num lugar só, no topo do arquivo, com comentário: `ESCALA_DO_GLB` e, se precisar, um `DESLOCAMENTO_DO_GLB: Vec3` somado a `corpo.p`. O valor inicial de `ESCALA_DO_GLB` é a altura da figura procedural do par em unidades do mundo (meça com `Box3` na `Vampiro` em pé, com escala `SCALE['par-de-criticos']`) dividida por 1,8.

**T3. O `Show` usa o GLB no par.**
- O `Show` tem um `VampiroGlb`, que fica no `root` ao lado do `Vampiro`.
- No par, se `vampiroGlb.pronto`, chame `vampiroGlb.update(t)` e esconda a figura procedural. Se não estiver pronto, faça o que faz hoje.
- Nos bestiais, nada muda: só a procedural.
- O `hideVampiro` e o `dispose` incluem o GLB.
- O carregamento da decisão 4 fica no componente que monta o `Show`, num `useEffect` que ignora o resultado se o componente desmontar antes. Ao anexar, chame o compile compartilhado de novo.
- Movimento reduzido, recolher os dados, trocar a mão e o fim do presságio escondem o GLB na hora (os mesmos caminhos do `hideVampiro`).

**T4. Testes (Node, em `tests/`), sem carregar o arquivo.** Monte um objeto falso: um `Group` com um `AnimationClip` chamado `par`, com uma trilha simples (por exemplo, `.position` de um filho), em `objeto.animations`.
- `VampiroGlb`:
  - invisível antes de `surge`;
  - visível durante a presença;
  - invisível em `PAR.duration`;
  - `root.position` igual a `corpo.p` (mais o deslocamento) em pelo menos 3 marcos;
  - o tempo do mixer acompanha `t / 1000` e para em `PAR.duration`;
  - `hide()` esconde;
  - o `dispose()` libera cada geometria e material uma vez.
- `Show`:
  - com o GLB anexado, o par mostra o GLB e esconde o corpo procedural;
  - sem o GLB, o par continua procedural (os testes atuais cobrem isso: eles precisam continuar verdes);
  - os bestiais ignoram o GLB;
  - estenda `hides on finish, pickup, selection change and reduced motion` para incluir o GLB.

**T5. Calibração e capturas.**
- Rode o `npm run dev:test` e use o botão de teste **Par de críticos**.
- Ajuste `ESCALA_DO_GLB` e `DESLOCAMENTO_DO_GLB` até o GLB cumprir o enquadramento da OS-0100:
  - a figura visível ocupa de 24% a 32% da altura da viewport, com a cabeça inteira em quadro;
  - centrada em x;
  - nos 38% de cima da tela;
  - sem tocar a mesa.
- Tire as capturas com um script em `temp/` (fora da entrega): `screens/os0101-par-<ms>.png` em 900, 1900, 3800 e 4300 ms. Um Playwright só, sem rodar a suíte E2E.
- Se não der para cumprir o enquadramento só com escala e deslocamento (por exemplo, a inclinação de 32° do clipe deixa a cabeça baixa ou alta demais), **pare e reporte com as capturas**. A pose é corrigida no Blender, pelo orquestrador, e não no código.

**T6. Documentação no mesmo commit do comportamento.** Atualize `src/modules/pressagios/CLAUDE.md` (seção Vampiro: o GLB no par, a reserva procedural e o dono do asset `public/modelos/vampiro.glb`) e `NOTAS.md` (o carregamento, a calibração e o contrato "tempo do clipe = relógio do presságio").

## Critérios de aceite
- `npm run build && npm run lint && npm test` passam, com os testes de arquitetura incluídos. Sem E2E.
- No dev server, o par de críticos mostra o vampiro do Tripo debruçado atrás da parede de trás, com a luz vermelha do presságio, a revoada e o sangue como antes. Ele some no fim, e os números aparecem como antes.
- Os bestiais estão iguais aos de hoje.
- Sem erro no console. Se o GLB faltar (renomeie o arquivo para testar), o par usa a figura procedural.
- As capturas da T5 estão em `screens/`, e o relatório traz a escala e o deslocamento finais.

## Fora do escopo
- Animar: o clipe é do orquestrador, no Blender.
- O rosto ruim do H2.5: o modelo final é o H3.1.
- A capa abrindo como asas, os dedos, os bestiais, os morcegos, o sangue, a câmera, a luz, a vitrine e o perfil leve.

Se precisar de algo fora disso, pare e pergunte ao orquestrador.

## Entrega

Commits pequenos no padrão `feat(pressagios): … [OS-0101]`, no branch da sua worktree. O relatório final traz:
- o que foi feito;
- a escala e o deslocamento finais;
- o caminho das capturas;
- o que ficou pendente;
- as decisões que você tomou sozinho;
- o resultado do gate.

Deixe o `npm run dev:test` no ar no fim, para o usuário conferir o visual.
