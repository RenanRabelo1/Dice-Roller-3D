# Ordem de serviço: presságios, o vampiro no domínio, no HTML e nos botões de teste

Ordem: OS-0095
Módulo: `pressagios`
Escopo de escrita:
- `src/modules/pressagios/**`
- `src/app/testHook.ts` e `src/app/Cena.tsx` (casca): só o campo `vampiro` novo no `window.__dice.state()`

Objetivo:
- Ao publicar o resultado, o módulo decide o presságio de vampiro, guarda-o e o considera "tocando".
- Ele também publica a linha do tempo pura das três animações: as poses dos dados e os pontos das mãos do vampiro.
- O HTML do presságio e os três botões de teste novos passam a existir.
- O 3D vem na OS-0097.

Leia antes de começar:
- `src/modules/pressagios/CLAUDE.md` e `NOTAS.md`, sobretudo a "Receita: novo presságio" e os botões de teste
- `contracts.ts`, `store.ts`, `domain/plano.ts`, `domain/omen.ts`, `domain/percurso.ts`, `domain/krakenMotion.ts` (o modelo a seguir), `domain/luz.ts`, `domain/omenTest.ts`, `ui/OverlayDoPresagio.tsx`, `ui/presagios.css`, `ui/BotoesDeTeste.tsx`, `index.ts` (`inspecao`)
- `src/modules/regras/contracts.ts`: `TipoVampiro`, `PresagioVampiro`
- `src/modules/arremesso/contracts.ts`: `OmenTest`, com os três novos da OS-0094

Decisões do orquestrador (mudança de contrato aprovada; os consumidores estão listados):

1. **Estado.**
   - `EstadoDoPresagio` ganha `vampiro: (PresagioVampiro & { throwId: number }) | null`.
   - É decidido no mesmo tique de `omen`, com `presagioVampiro(omenKinds(dice), results)`.
   - Só um presságio por arremesso. A regra já devolve null quando há presságio de d20/d100.
   - `presagioTocando()` passa a valer também para o vampiro do `throwId` atual, com as mesmas condições de fase `settled`, `omenDone`, recolher e movimento reduzido.
2. **Duração** (`VAMPIRO_MS`):
   - `par-de-criticos`: 5600;
   - `critico-bestial`: 4600;
   - `falha-bestial`: 5400.
   - Inclua o caso em `omenMs` ou crie `vampiroMs`, mas uma fonte só.
3. **Linha do tempo pura** em `domain/vampiroMotion.ts`, no estilo de `krakenMotion.ts`, em ms a partir de `omenAt`.
   - A cena (OS-0097) e o percurso dos dados leem os **mesmos** pontos: as mãos são funções do tempo, e o dado carregado é posto na mão.
   - **`par-de-criticos`:**

     | ms | O que acontece |
     |---|---|
     | 0 a 1500 | `entra`: o vampiro caminha do lado de fora da parede **direita** da bandeja até junto dos dois dados. |
     | 1500 a 2300 | `pega`: a mão esquerda pega o dado A e a direita, o B. Cada dado sobe da pose de pouso `de` até a mão. |
     | 2300 a 3000 | `junta`: o dado da mão esquerda passa para a direita, e os dois ficam juntos na mão direita. |
     | 3000 a 3400 | `prepara`: o braço recua. |
     | 3400 a 3750 | `arremesso`: os dois dados voam **muito rápido** até quase encostar na câmera e ocupam boa parte da tela, como um susto. O impacto é aos 3750. |
     | 3750 a 4300 | `assenta`: os dados recuam até a pose do resultado `para`. O número se revela de 0 a 1. |
     | 3800 a 5600 | `sai`: o vampiro vira e sai andando pela direita. |

     A sombra do dado some aos 1500.
   - **`critico-bestial`:**

     | ms | O que acontece |
     |---|---|
     | 0 a 1000 | `surge`: a cabeça aparece devagar, de baixo da borda direita da mesa, pelo lado de fora da bandeja. Nada quebra. |
     | 1000 a 1500 | `sobe`: sai rápido e sobe na mesa, agachado. |
     | 1500 a 2200 | `pega`: pega o dado da Fome. |
     | 2200 a 3200 | `entrega`: leva o dado e o põe na frente do jogador, na pose `para`. O número se revela entre 2800 e 3200. |
     | 3200 a 4600 | `sai`: salta de volta pela borda direita e desce até sumir. |

     A sombra some aos 1500.
   - **`falha-bestial`:**

     | ms | O que acontece |
     |---|---|
     | 0 a 1700 | `tampa`: duas mãos de unhas afiadas vêm de trás do jogador, das bordas da tela, presas à câmera. Devagar, os dedos tapam quase toda a visão. |
     | ~1500 | Com a visão tapada, o vampiro já está de pé no fundo da bandeja. |
     | 1700 a 2700 | `destapa`: as mãos saem devagar. |
     | 2700 a 3500 | `espera`: o vampiro, parado, se inclina com as garras abertas, pronto para atacar. |
     | 3500 a 3900 | `ataque`: um golpe rápido da mão afiada em direção à câmera. A mão passa pelo dado da Fome e o **leva junto**, e o dado chega à frente da tela, na pose `para`, aos 3900. O número se revela entre 3900 e 4300. |
     | 3900 a 5000 | `foge`: sai rápido pela direita, num recuo ou salto natural, e some. |

     A sombra some aos 3500.
   - Exponha o que a cena precisa: as fases nomeadas, a pose do corpo, as duas mãos, a cabeça visível ou não, e o quanto as mãos dos olhos cobrem (0 a 1). A cena não inventa tempo.
4. **Percurso** (consumidor: `vitrine`, OS-0096).
   - `indicesComPercurso(omen, dice, vampiro = null)` passa a devolver também `vampiro: PresagioVampiro | null`.
   - `movimentoNoPresagio(i, ms, de, para, kraken, tempestade, vampiro = null)` devolve a pose, o `revela`, a `sombra` e o `fim` dos dados de `vampiro.dados`.
   - Os parâmetros novos são opcionais: o código atual da vitrine continua compilando.
5. **Plano.** `PlanoDoPresagio` ganha `vampiro: PresagioVampiro | null`, e o `ms` cobre a duração dele. `planoDoPresagio(omen, dice, vampiro = null)`.
6. **Luz.** A mesma `PointLight`, sem luz nova. O vampiro tem a cor `#b3122a`, rasante e baixa, e a menor prioridade em `fonteDaLuz`.
7. **HTML** (`OverlayDoPresagio` + `presagios.css`).
   - Enquanto toca: `data-vampiro="par-de-criticos|critico-bestial|falha-bestial"` na `.game-area`. É acréscimo ao contrato do DOM.
   - O status (`role="status"`) diz "Crítico em par!", "Crítico bestial!" ou "Falha bestial!".
   - Um bloco `.omen-vampiro` (seletor para os E2E):
     - no `par-de-criticos`, um tremor curto da tela no impacto, aos 3750;
     - na `falha-bestial`, três rasgos de garra vermelhos que cruzam a tela no ataque, aos 3500 a 4300, e um escurecimento sincronizado com a cobertura das mãos;
     - no `critico-bestial`, só uma vinheta vermelha leve.
   - Os tempos do CSS saem das mesmas constantes, como os outros.
   - Atualize a fixture de `tests/overlay.test.ts` **só** com os casos novos. Os antigos ficam idênticos.
8. **Botões de teste** (`OMEN_TESTS`):
   - "Par de críticos", face "d10 Vampiro = 10 ×2";
   - "Crítico bestial", face "d10 Fome = 10";
   - "Falha bestial", face "d10 Fome = 1".
   - `withDiceFor`: o par garante ao menos dois `vtm` na mão; os outros dois garantem um `hunger`.
   - Mantenha a regra do teto de 10 dados.
9. **Inspeção.**
   - `PresagioInspecionado` ganha `vampiro: TipoVampiro | null`, o do arremesso atual.
   - A casca o passa para `window.__dice.state().vampiro`, com o tipo em `src/app/testHook.ts`.
10. **Movimento reduzido:** sem presságio de vampiro, como os outros. **Perfil leve:** o mesmo comportamento dos outros presságios.

Entregáveis:
1. O estado, a duração, `vampiroMotion.ts`, o percurso, o plano, a luz, o overlay, o CSS, os botões, a inspeção e o campo na casca.
2. Testes do módulo:
   - estado;
   - duração;
   - o plano;
   - continuidade do percurso: começa em `de`, termina em `para`, sem salto entre fases. Na `falha-bestial`, o dado fica no lugar até o ataque;
   - o par vai para perto da câmera aos 3750 e volta a `para`;
   - `withDiceFor`;
   - o teste de equivalência `plano.test.ts` estendido aos três, contra `plays` de `arremesso`;
   - a luz;
   - o overlay.
3. `CLAUDE.md` e `NOTAS.md` do módulo atualizados: os três presságios, as durações, `data-vampiro`, os botões e o novo `vampiroMotion`.

Critérios de aceite:
- `npm run build && npm run lint && npm test` passam.
- Sem a OS-0097, nada aparece em 3D. Esperado: o status e o overlay tocam, e o resultado espera a duração.

Fora do escopo:
- O 3D (OS-0097) e a vitrine (OS-0096).

Se precisar de algo fora disso: pare e reporte. Não implemente.
