# Ordem de serviço: presságios, o bote do vampiro mira os dados reais

Ordem: OS-0103
Módulo: `pressagios`
Executor: o dev da OS-0101 e da OS-0102, na mesma worktree. Dúvidas vão para o orquestrador.
Escopo de escrita: `src/modules/pressagios/**`

Pedido do usuário (2026-11-19): no bote, entre ~3.000 e ~3.800 ms, a mão esquerda do vampiro vai a um ponto fixo no meio da mesa, o alvo que o clipe foi feito para alcançar. No jogo os dados caem em outro lugar, então ele estica a mão para o feltro vazio. Além disso, a mão direita, que se apoia no feltro, às vezes pousa em cima dos dados. A mão tem que **mirar o d10 crítico de verdade**, e **sem esticar o braço**: o osso nunca muda de comprimento nem de escala. Se o dado estiver longe demais, o braço estica até o limite na direção dele e para ali. É uma tentativa, e o "tenta pegar e desiste" continua valendo.

## Leia antes de começar
- `scene/VampiroGlb.ts` e o `Show` em `scene/PresagiosNaCena.tsx`: `r.origins` guarda a posição de pouso dos dados do vampiro, capturada no início do presságio.
- `docs/contexto/modelos-animados.md`, seções 5 e 6: o IK de dois ossos, o polo, a torção e o alcance.
- `node_modules/three/src/animation/PropertyBinding.js`, `sanitizeNodeName`: o `GLTFLoader` **tira os pontos dos nomes**, então os ossos `braco.L`, `antebraco.L` e `mao.L` do Blender viram `bracoL`, `antebracoL` e `maoL` no three. Confira imprimindo os nomes do esqueleto.

## Decisões do orquestrador

1. **O clipe continua mandando, e o IK é uma correção por cima dele.** A cada quadro, depois do `mixer.setTime`:
   - calcule a rotação de IK dos ossos do braço;
   - misture com a rotação do clipe usando `slerp(clipe, ik, peso)`;
   - fora da janela do bote, o peso é 0 e a figura fica idêntica ao clipe.
2. **Alvo:** a posição de **pouso** do d10 crítico (`r.origins`), escolhida como a mais próxima do ombro esquerdo do vampiro (`bracoL`).
   - Nesse intervalo o dado já está voando para a pose do resultado; a mão chega onde ele estava e ele escapa. É exatamente o "tenta pegar e desiste".
   - O pulso mira um ponto acima e atrás do dado, na direção do vampiro: `dado + [0, 0.62, -0.55]` em unidades do mundo. É a mesma relação que o clipe usa entre o pulso e o dado.
3. **Sem esticar, nunca.**
   - Os comprimentos `l1` (braço) e `l2` (antebraço) vêm da posição de repouso dos ossos e são constantes.
   - A distância do ombro ao alvo é limitada a `0.999 × (l1 + l2)`, na direção do alvo.
   - Nada de `scale` em osso nem de mover a posição local de um osso filho. **Só rotação.**
4. **Cotovelo:** dobra para fora e para cima (polo = ombro + `[±1, 0.75, 0]` no mundo; `+x` para o braço esquerdo).
   - Mantenha a dobradiça anatômica: depois de apontar cada osso, gire-o no próprio eixo até a dobradiça de repouso coincidir com a do IK (seção 5 do guia).
   - Sem isso, a manga gira e o cotovelo "quebra".
5. **A mão aponta para o centro do dado,** com a palma para baixo. O peso é o mesmo do braço.
6. **A cabeça olha para o dado real** na janela do bote, com o mesmo peso, corrigindo a rotação do clipe e com no máximo 40° de diferença. Depois do bote, volta ao clipe, que encara o jogador.
7. **A mão direita no feltro desvia dos dados:** se algum dado (de qualquer tipo) estiver a menos de 1,3 unidade, no plano xz, de onde a mão direita pousa no clipe, leve o pulso direito com o mesmo IK, no mesmo peso, para o ponto livre mais próximo ao longo de x, entre -5,5 e -2,0, na mesma profundidade. "Livre" é a pelo menos 1,3 de qualquer dado.
8. **A janela do peso** é uma função pura em `domain/`, `pesoDoBote(t)`:
   - sobe de 0 a 1 entre 2.950 e 3.300 ms, com `smoothstep`;
   - fica em 1 até 3.600;
   - volta a 0 até 3.850.
   - A mão direita usa a mesma curva, adiantada 100 ms.

## Tarefas

**T1. IK puro.** Crie `domain/ikDoBraco.ts` com `dobrarBraco(ombro, alvo, l1, l2, polo)`, que devolve `{ cotovelo, punho, alcancou }` (vetores no mundo). Ele é usado só pela cena. `pesoDoBote(t)` fica no mesmo arquivo ou em `vampiroMotion.ts`.

**T2. A cena.**
- `VampiroGlb.update(t, alvos)` recebe `{ dado: Vec3 | null; dados: Vec3[] }`: o d10 crítico mais próximo e todos os dados.
- O `Show` monta esse objeto a partir de `r.origins` e de `at(i)` (todos os dados), só no par.
- Aplique as decisões 1 a 7 nos ossos `bracoL`, `antebracoL` e `maoL`, nos do lado direito e em `cabeca`.
- Sem dado, ou com o GLB sem esses ossos, nada muda.

**T3. Testes (Node).**
- `dobrarBraco`:
  - o punho fica no alvo quando ele está ao alcance;
  - fora do alcance, `|punho − ombro| ≤ l1 + l2` e o punho fica na direção do alvo;
  - `|cotovelo − ombro| = l1` e `|punho − cotovelo| = l2` (tolerância 1e-6);
  - o cotovelo fica do lado do polo.
- `pesoDoBote`: 0 antes de 2.950, 1 entre 3.300 e 3.600, 0 depois de 3.850, e sempre entre 0 e 1.
- `VampiroGlb`, com um esqueleto falso de três ossos com os nomes sanitizados:
  - com peso 1, o punho chega ao alvo alcançável;
  - os comprimentos dos ossos não mudam (posição local e escala dos filhos iguais às do repouso);
  - com peso 0, as rotações são as do clipe.

**T4. Documentação.** Atualize `CLAUDE.md` e `NOTAS.md` do módulo: o bote mira o dado real por IK sobre o clipe, sem esticar, e os nomes sanitizados dos ossos.

## Critérios de aceite
- `npm run build && npm run lint && npm test` passam. Sem E2E.
- O usuário confere no `dev:test`, rodando o Par de críticos algumas vezes. A mão esquerda vai na direção do d10 crítico onde quer que ele caia, sem esticar o braço, e a mão direita não pousa em cima de nenhum dado.
- Deixe o `npm run dev:test` no ar.

## Fora do escopo
O clipe e o modelo (são do orquestrador, no Blender), a câmera, os bestiais, os morcegos e o sangue. Não mexa em `ESCALA_DO_GLB` nem em `ANCORA_DO_GLB`.

Commits: `feat(pressagios): … [OS-0103]`.
