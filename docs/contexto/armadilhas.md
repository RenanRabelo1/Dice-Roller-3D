# Armadilhas e invariantes

Coisas que já morderam ou que quebram em silêncio. Ler antes de mexer em física, cena ou desempenho.

## Invariantes do resultado

- **O resultado vem da gravação.** Nunca reler a face na cena para decidir o valor; `results`/`raw` saem de `presimulate`. O showcase usa `raw`.
- **Fixar a pose antes de anunciar.** Antes de `publish` (ThrowLoop) e antes de `returned` (Hand) aplicar `setTranslation/setRotation` com a pose final. Sem isso, assinantes viam a pose do passo anterior e moedas trocavam de lado no último passo; a 2ª jogada da moeda começava no ar (y≈7).
- **`throwId` guarda tudo.** Qualquer callback assíncrono (worker, publish, fim de presságio, showcase) compara com o `throwId` atual e com a fase. Código novo assíncrono deve fazer o mesmo.
- **Os corpos da cena são cinemáticos.** Dinâmica só existe no mundo offline. Não trocar a cena para dinâmica "ao vivo".
- **`physics/apply.ts` é o único lugar** que muda tipo, velocidade ou pose de corpo na simulação (cena e testes compartilham).
- **Versões fixas:** `@dimforge/rapier3d-compat` 0.19.2 precisa ser a mesma do `@react-three/rapier`, senão a pré-simulação diverge da cena. troika, Vitest e Playwright também estão fixos.

## Desempenho

- **Um objeto por dado para os numerais** (`BatchedText` ou malha mesclada). Não voltar a um `Text` por número.
- **Não mudar o número de luzes** em tempo de execução (recompila o shader de todos os dados). Esconder com intensidade 0.
- **Compilar shaders antes** do primeiro uso (`Show.compile`); presságio novo entra nesse aquecimento.
- **DPR só muda entre animações** (fase `hand` ou showcase concluído). `PerformanceMonitor` acumula o alvo em `desiredDpr`; redimensionar o buffer no meio de uma animação trava renderizador por software. SwiftShader começa em DPR 0,35.
- Pré-simulação roda no worker; o fallback síncrono existe e custa ~25–35 ms no quadro de lançamento com 10 moedas. Worker sem resposta em 2 s (`WORKER_TIMEOUT`) → cálculo local; se o motor falhar, os dados voltam à mão com `error: 'physics'` e aviso no painel.
- Detalhes, experimentos revertidos e números: `docs/performance-coins.md`.

## Moeda

- Colisor é `roundCylinder`, não o casco (casco fino balança para sempre).
- Moeda lenta e deitada tem a rotação travada na pré-simulação (moedas empilhadas balançam no aro sem fim).
- Só as tampas são faces: sempre lê Cara ou Coroa, mesmo apoiada no aro.
- No showcase a moeda voa como os dados; "Cara"/"Coroa" fica embaixo dela. Moedas não somam no total.

## Processo / convenções

- UI e mensagens em **pt-BR**; comentários e nomes de código em inglês.
- Commits no estilo `feat:`/`fix:`/`perf:`/`docs:`/`chore:` com descrição curta em inglês.
- Gravação atômica de arquivos: um Vite servindo arquivo truncado já deixou a tela branca.
- `references/threejs/` é material de consulta (ver `CLAUDE.md`), ignorado pelo lint; não importar dali.
- Menor mudança completa; lógica nova não trivial ganha teste em `tests/`.

## Documentação histórica ≠ código atual

`docs/superpowers/` (spec 3D, plano, revisão) e `.superpowers/sdd/` registram o processo, não o estado atual. Divergências conhecidas:

| A spec/plano diz | O código faz hoje |
|---|---|
| d100 = par de d10 (dezenas + unidades), `combineD100` | d100 é **um sólido de 100 faces** |
| conclusão lida ao vivo após cada passo, empurrãozinho em dado encostado (até 3) | resultado decidido na pré-simulação; sem empurrão; `stepSettle` só espera/recupera/revela |
| timeout de 480 passos (8 s) | `SETTLE.timeoutSteps = 240` (4 s) |
| refração por dado com buffer compartilhado | gema por `meshPhysicalMaterial` sem passe de refração |
| "fora de escopo: misturar tipos num arremesso" | seleção mista é suportada |
| error boundaries para WebGL/física (R10) | não há error boundary; `store.error = 'physics'` quando o worker e o cálculo local falham (backlog: tasks 11–12 do plano) |

Em conflito, o código e estes arquivos de `docs/contexto/` valem; atualize-os junto com a mudança.
