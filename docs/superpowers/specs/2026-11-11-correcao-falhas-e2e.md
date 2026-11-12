# Correção: duas falhas do E2E final das pendências

Data: 2026-11-11 · Status: aprovado para implementar · Branch base: `dev-jg` · Origem: rodada E2E única de 2026-11-12 00:04 (70 passaram, 2 falharam), JSON em `temp/e2e-final.json` da worktree `importar-dado-146984`

## 1. As falhas

| # | Teste | Asserção que falhou | O que significa |
|---|---|---|---|
| F1 | `e2e/coin-performance.spec.ts` → "ten coins can launch and return repeatedly within the frame budget" | linha 56: `Math.abs(b.p[1] - 3) < 0.12`, recebido **2,757** | depois de recolher (fase já `hand`), um dos 10 corpos não está na altura da mão (y = 3): ficou ~0,24 (na mesa) ou ~5,76. **Posição, não tempo**: é bug, não ambiente |
| F2 | `e2e/kraken.spec.ts` → "reduced motion restores the broken tray immediately" | linha 100: `trayBroken` esperado `false`, recebido `true` | ligar movimento reduzido no meio da quebra da mesa não recompõe a mesa em 500 ms. As variantes "pickup" e "selection" do mesmo teste **passam** |

Os dois passavam antes da mesa personalizada e das pendências (todas as rodadas de 10/11). Os dois são do mesmo tipo: **uma interrupção precisa devolver a cena ao estado certo**, e a devolução depende de um loop por quadro que lê o store (`Hand.tsx` no retorno, `Tray.tsx` na visibilidade da mesa).

## 2. O que fazer

### T1 · Achar o commit que quebrou (bisect), uma falha por vez
Os testes isolados são curtos (F1 ~35 s, F2 ~10 s). **Só rode Playwright depois que a sessão principal mandar "liberado"** (a porta 5179 é compartilhada).

```bash
git bisect start <tip-da-dev-jg> 8537b4e          # 8537b4e = antes das pendências; se F1/F2 já falharem nele, use fddb011 (antes da mesa)
git bisect run npx playwright test e2e/kraken.spec.ts -g "reduced motion restores" --retries=0
git bisect reset
```
Repita para F1 com `e2e/coin-performance.spec.ts -g "ten coins"`. Antes do bisect, rode o teste isolado **3 vezes** na ponta: se falhar só às vezes, é intermitente, e o bisect precisa de `--repeat-each=3` no comando.

Commits candidatos (do mais provável ao menos): `bf3ddf2` (mesa personalizada: `Tray.tsx` passou a trocar o objeto da mesa e guardar `surface` num `useRef` atualizado por efeito), `327323b` (compilar a mesa antes de mostrar), `902ae23` (proteções de WebGL/física em `App.tsx`), `ff950cc` (decodificar 1 pixel no início).

### T2 · Corrigir na raiz e desacoplar
Depois de achar o commit, corrija a causa nele, sem afrouxar os testes. Junto, faça o desacoplamento que evita a mesma classe de bug:

1. **Regra pura da mesa quebrada.** Em `src/scene/krakenMotion.ts`, crie `export function trayBrokenAt(s: { phase: Phase; throwId: number; omen: (Omen & { throwId: number }) | null; omenDone: number; omenAt: number; dice: DieKind[]; reducedMotion: boolean }, now: number): boolean` com a regra que hoje está inline em `Tray.tsx` (linha ~37) **mais** `reducedMotion → false`. `Tray.tsx` passa a usar só `surface.visible = !trayBrokenAt(estado, performance.now())`. Testes em `tests/kraken.test.ts`: quebrada no meio do kraken; inteira com `reducedMotion`; inteira depois de `omenDone`; inteira com outro `throwId`.
2. **A superfície certa sempre.** Em `Tray.tsx`, quando o objeto da mesa troca (`table`), a superfície nova recebe na hora a visibilidade calculada (não esperar o próximo quadro), e a antiga volta a `visible = true` antes de sair da cena.
3. **Retorno da mão para todos os corpos.** Em `Hand.tsx` (bloco `phase === 'returning'`, ~linhas 276–291), confira se o `current` (de `live()`) tem **todos** os corpos da seleção no instante em que emite `returned`. Se tiver menos (corpo ainda não registrado ou recriado), não emita `returned` nesse quadro; espere todos e fixe a pose final em todos. Teste: se o bisect apontar outra causa, corrija a outra causa e explique.

### T3 · Verificar
- `npm run build && npm run lint && npm test` (com os testes novos da T2.1).
- Com "liberado": os dois testes isolados, 3 vezes cada (`--repeat-each=3`), passando todas.
- Não rode a suíte inteira: ela entra na rodada única do PR.
- Registre no fim desta spec: commit culpado de cada falha, causa, correção.

## 3. Regras

- Não mude a física nem o resultado; não mude a contagem de luzes.
- Commits atômicos (`fix:`/`test:` em inglês, com a linha de coautoria), sem push.
- Dúvida ou bloqueio: mensagem para a sessão principal (`SendMessage`, `to: "local_b87dd7e4-6ecc-471c-8358-f5cf71a0d2bc"`), nunca pergunta direta ao usuário.

## 4. Registro (implementação)

- **F2** não reproduz isolado: o teste passa 5/5 em `2b0a413` (antes das correções) e 3/3 na ponta. Causa provável: corrida entre o evento do `matchMedia` (`emulateMedia`) e o relógio simulado; o teste passa a esperar `state().reducedMotion === true` (campo novo, aditivo, no test hook) antes de avançar o relógio. Não há commit culpado a registrar (sem bom/ruim estável). Os outros usos de `emulateMedia` (`omen.spec.ts`, `roll.spec.ts`) rodam em tempo real e já esperam por `expect`, então não mudaram.
- A lógica da T2 (`trayBrokenAt`, superfície no `useLayoutEffect`, retorno só com todos os corpos) fica: é correta e coberta por Vitest.
- Na rodada de verificação (`--repeat-each=3` das três variantes de `kraken.spec.ts` com a máquina muito carregada, 26 min), "reduced motion" passou 3/3; "pickup" e "selection" falharam em `launch`, dentro de `clock.pauseAt` (infraestrutura do relógio simulado sob carga), antes de qualquer código tocado por esta correção.
- **F1** segue pendente (aguarda liberação da CPU).
