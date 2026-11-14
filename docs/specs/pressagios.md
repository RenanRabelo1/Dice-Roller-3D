# Spec: `pressagios`

Pasta: `src/modules/pressagios/`. Extração nº 8.

## CLAUDE.md (formato final)

### Responsabilidade
Decidir se um resultado publicado tem presságio e mostrá-lo antes do resultado aparecer. O raio é o crítico do d20, o kraken o crítico do d100, o fogo a falha do d20, a tempestade a falha do d100, e os peixes yin-yang a dualidade. Isso inclui o 3D, a camada HTML, a duração, o relógio compartilhado e a quebra da mesa no kraken.

### Regras de negócio
- O presságio é calculado em `resultadoPublicado`, com `regras.omenOf` sobre `dados.paraRegras(kind)`. Com movimento reduzido não há presságio, e ligar o movimento reduzido durante um presságio o cancela. Em modo teste, `forcarPresagio(omen)` vale para os próximos arremessos sem mudar a física.
- O relógio (`omenAt`) começa no `performance.now()` da publicação.
- Um presságio "toca" enquanto a fase é `settled`, ele é do `throwId` atual e ainda não terminou. Recolher os dados encerra o presságio.
- Efeito por dado:
  - raio só em crítico de d20;
  - kraken só em d100 crítico **sem** falha;
  - tempestade só em d100 com falha **sem** crítico;
  - fogo só em d20 com falha **sem** crítico.
  Com dualidade, nenhum desses efeitos acontece, só os peixes (comportamento atual; ver a dúvida 4).
- Duração:
  - raio 1.300 ms, kraken 6.500 ms, fogo 2.400 ms, tempestade 4.600 ms, dualidade 2.600 ms (o choque dos peixes em 1.100 ms);
  - falha com d20 e d100 dura o maior dos dois;
  - os mesmos tempos valem no CSS.
- O fogo continua nos d20 depois do fim, até a fase sair de `settled`.
- Kraken:
  - a mesa quebra entre `rupture` (450) e `restored` (6.300);
  - qualquer interrupção recompõe a mesa;
  - a regra da quebra é uma só (`trayBrokenAt`), e o módulo aplica chamando `mesa.ocultarPiso`;
  - os cacos usam as cores da mesa (`mesa.coresDaMesa`), com a madeira "iluminada".
- O d100 do kraken e o da tempestade fazem um percurso próprio (agarrado, arremessado para fora, trazido de volta) que termina na pose do resultado. A `vitrine` pergunta esse percurso.
- Desempenho:
  - shaders compilados no mount e de novo quando o ambiente fica pronto;
  - luzes sempre na cena, com intensidade 0 fora do efeito;
  - nada visível fora de um presságio.
- Acessibilidade: anuncia "Crítico!", "Falha crítica!" e "Dualidade: crítico e falha!" num `role="status"`.

### Expõe
- `presagio()` (o tipo e os índices do arremesso atual), `presagioTocando()`, `usePresagioTocando()`.
- `tempoDoPresagio()`.
- `indicesComPercurso()`: os dados que não fazem o voo comum.
- `movimentoNoPresagio(i, agora, de, para) → { pose, revela, sombra } | null`.
- `forcarPresagio(omen | null)` (só em modo teste).
- Componentes: `<PresagiosNaCena/>` (3D), `<OverlayDoPresagio gameArea />` (HTML, escreve `data-omen`, `data-kraken` e `data-storm` em `.game-area`).
- `inspecao()`: `omen`, `omenDone`, `omenTime`, `trayBroken`, `burning`, `shards`.

### Consome
- `arremesso`: `resultadoPublicado`, `fase`, `throwIdAtual`, `corpos`, `dadoNaCena`. _(Nomes reais desde a OS-0031/0034: `arremesso()` dá fase, `throwId`, resultado, força e `ready`; `useArremesso(selector)` é o hook; `registroDeCorpos` e `inspecao().corpos()` são os corpos. `fase`, `resultado`, `throwIdAtual` e `corpos` da spec original não existem. `dadoNaCena`, `moverDado` e `envelopeDaMao` nascem na extração da `vitrine`.)_
- `mesa`: `coresDaMesa`, `ocultarPiso`.
- `dados`: `paraRegras`.
- `regras`: `omenOf`, `omenKind`.
- `src/shared/plataforma`: `movimentoReduzido`, `movimentoReduzidoAlterado`.
- `src/shared/math`: `Pose`, `easeOut`, `span`, `clamp01`.

### Fora do escopo
- O voo comum, os números em destaque e o painel: `vitrine`.
- A regra de crítico e falha: `regras`.
- O visual da mesa: `mesa`.

## Dados de que é dono
- `omen`, `omenAt`, `omenDone`, `omenRig` (hoje no `useDice`).

## Origem do código

| De | O quê |
|---|---|
| `src/dice/omen.ts` | `OMEN_MS`, `DUALITY_HIT`, `omenMs`, `isD20` (passa a ser `paraRegras(k) === 'd20'`) |
| `src/store.ts:26-29, 45-46, 59-62, 119, 144-145` | campos, `omenPlaying`, cálculo no `publish`, o cancelamento no `setReducedMotion` |
| `src/scene/Omens.tsx`, `Kraken.ts`, `krakenMotion.ts`, `Fire.ts`, `fireMotion.ts` | tudo. A regra "que efeito em que dado" (`Omens.tsx:199-209`) vira a função pura `planoDoPresagio(omen, dice)`, usada também pela camada HTML |
| `src/ui/OmenOverlay.tsx` | tudo, usando `planoDoPresagio` em vez de recalcular |
| `src/scene/QuebraDaMesa.tsx` (era `Tray.tsx:11-15, 38-47`) | a regra da quebra, aplicada por `mesa.ocultarPiso` |
| `src/scene/Hand.tsx:214-215, 277-287` | o percurso do d100, que vira `movimentoNoPresagio` |
| `src/index.css` (blocos `.omen*` e `.game-area[data-*]`) | `src/modules/pressagios/components/presagios.css` |

**Duplicação de `regras` a desfazer nesta extração** (auditoria do aceite de `regras`, 2026-11-13): `src/dice/omenTest.ts:39` repete a regra de presságio; passar a usar `regras`.

**Pontos de chamada a trocar:**
- `Controls.tsx` (`omenPlaying`), o legado da vitrine em `Hand.tsx`;
- o test hook (`rigOmen`, `state().omen`);
- `tests/omen.test.ts` (a parte da duração), `kraken.test.ts`, `fire.test.ts` e a parte dos cacos de `table.test.ts`, que movem para o módulo;
- o E2E `kraken.spec.ts:33`, que importa `/src/store.ts` por URL e tem o caminho atualizado.

## Critérios de aceite da extração
- A escolha do efeito por dado existe num lugar só (`planoDoPresagio`), com teste.
- O resultado nunca aparece antes do fim do presságio. Isso é coberto pelo E2E `omen` e por um teste do módulo sobre a ordem dos eventos.
- Nenhuma luz é criada ou removida em tempo de execução. O `gl.info.programs` não sobe depois do aquecimento, e o E2E de mesa já confere isso.
- Os E2E `omen`, `kraken` e `table-kraken` passam.
- O gate completo passa.
