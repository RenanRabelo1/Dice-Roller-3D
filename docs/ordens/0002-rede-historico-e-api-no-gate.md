# Ordem de serviço: rede de segurança do histórico e da API no gate

Ordem: OS-0002 (RS-1 + RS-4, rede de segurança)
Escopo de escrita: `e2e/history.spec.ts` (novo), `playwright.config.ts`, `package.json` (só `scripts`), `docs/contexto/testes.md`
Objetivo: um E2E prova que cada resultado publicado gera um POST com o corpo atual, e o gate passa a rodar a suíte da API.

Leia antes de começar:
- `docs/contexto/testes.md`
- `src/api/history.ts` e `src/App.tsx` (só para saber o que é enviado; **não altere**)
- `e2e/roll.spec.ts` (o padrão dos specs: esperar `state().ready`, jogar, esperar `settled` e `showcased`)
- `server/package.json` (scripts)

Entregáveis:
- `playwright.config.ts`: o `webServer` sobe o Vite de teste com `VITE_API_URL` apontando para um caminho do próprio servidor de teste (por exemplo `http://127.0.0.1:5179/__api`). Assim o build de teste envia o histórico, e um POST que nenhum teste intercepta só recebe 404, sem efeito no jogo.
- `e2e/history.spec.ts`, interceptando `**/__api/rolls` com `page.route`:
  1. um arremesso de 1 d20 gera **exatamente um** POST, no momento em que o resultado é publicado. O corpo é `{ playerId, dice: [{ kind: 'd20', value }], force }`: `playerId` é um UUID, `value` é igual a `state().results[0]` e `force` fica entre 0 e 1;
  2. uma seleção mista (`d6`, `d10`, `coin`) envia os dados na ordem da seleção, com os valores de `results`;
  3. dois arremessos seguidos geram dois POSTs com o mesmo `playerId`, e o `playerId` continua o mesmo depois de recarregar a página;
  4. uma resposta 500 da API não muda nada no jogo: o resultado aparece e o próximo arremesso funciona.
- `package.json`: script `test:server` = `npm --prefix server run typecheck && npm --prefix server test`.
- `docs/contexto/testes.md`: registrar o `history.spec.ts`, o `VITE_API_URL` de teste e o gate `build → lint → test → test:server → e2e` (o servidor precisa de `npm install` em `server/` uma vez).

Critérios de aceite:
- `npm run build`, `npm run lint`, `npm test`, `npm run test:server` e `npm run e2e` passando. Os 86 E2E de hoje (depois da OS-0001) passam sem alteração, e o novo spec passa.
- Nenhum arquivo de `src/` ou `server/` alterado.

Fora do escopo:
- Qualquer arquivo fora do escopo de escrita.
- Mudar o comportamento do histórico (inclusive enviar antes do presságio; é o comportamento atual e fica).

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Arquivos: `playwright.config.ts` (`webServer` em array, Vite de teste com `VITE_API_URL=http://127.0.0.1:5180` + stub), `e2e/api-stub.mjs` (novo), `e2e/history.spec.ts` (novo), `package.json` (`test:server`), `docs/contexto/testes.md`. Nada em `src/` nem em `server/`.

Testes novos:
1. 1 d20 → exatamente um POST (e nenhum outro 1 s depois do showcase), corpo só com `playerId` (UUID), `dice: [{ kind: 'd20', value }]` (= `results[0]`) e `force` ∈ [0, 1]; quando o POST chega, `throwId` e `results` já são os do arremesso.
2. `d6`, `d10`, `coin` → `dice` na ordem literal `['d6', 'd10', 'coin']` (a de `sortDice`), com os valores de `results`.
3. Dois arremessos → dois POSTs, mesmo `playerId`; depois de recarregar, o terceiro mantém o `playerId`.
4. Resposta 500 → sem erro no jogo, resultado no painel, o próximo arremesso funciona e envia de novo.

Primeira entrega devolvida (ver parecer): a premissa da ordem, "um POST não interceptado só recebe 404, sem efeito", estava errada; o Chromium registra o 404 como `console.error` e 8 E2E que exigem console limpo falharam. Correção: **escopo ampliado pelo orquestrador** com `e2e/api-stub.mjs`, um `node:http` em 127.0.0.1:5180 que responde 204 com CORS (dentro da regra RS-n, `e2e/**`). `history.spec.ts` passou a interceptar `http://127.0.0.1:5180/rolls`.

Pendente: o primeiro `test:server` numa máquina sem o `mongod` em cache pode estourar o tempo (baixa o binário); a segunda rodada passou.

## Parecer do revisor

**Primeira rodada: DEVOLVIDO.**
- B1: o `VITE_API_URL` apontando para um caminho 404 suja o console em `coin`, `kraken` e `omen` (confirmado pelo gate: 8 falhas).
- B2: `testes.md` dizia "sem efeito".

**Segunda rodada: APROVADO**, com a ampliação de escopo registrada (acima).
- ✅ (a) só arquivos do escopo, com `e2e/api-stub.mjs` dentro de `e2e/**`.
- ✅ (b) nada em `src/` nem em `server/`.
- ✅ (c) os 4 casos em `e2e/history.spec.ts:37-102`.
- ✅ (d) o histórico não muda; o stub só troca o 404 por 204.
- ✅ (e) `testes.md:17-18` descreve o stub, a porta e o motivo.
- ✅ (f) `test:server` igual ao da ordem.

Observações sem bloqueio:
- O `OPTIONS` em `history.spec.ts:27` não roda no Chromium (o Playwright atende o preflight); fica como garantia.
- `api-stub.mjs:14` lê `PORT ?? 5180`: com `PORT` definido no ambiente, o stub sobe em outra porta e o `webServer` espera a 5180 até estourar.
- O plano §3 não listava `docs/contexto/**` no escopo das RS; alinhado neste commit.

## Gate

2026-11-13, rodado pelo orquestrador:

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 22 arquivos, 331 testes |
| `npm run test:server` | ✅ typecheck + 23 testes |
| `npm run e2e` (1ª rodada) | ❌ 8 falhas (`omen` ×5, `coin`, `kraken` ×2), causa B1 |
| `npm run e2e` (depois da correção) | ✅ 90 passaram (86 + 4 novos), 18,0 min |

Uma rodada intermediária foi interrompida pelo Claude Code por falta de memória e deixou o Vite (5179) e o stub (5180) órfãos; foram encerrados antes da rodada final. Como `reuseExistingServer` é `false`, servidor órfão faz o Playwright parar logo no início, e não rodar contra a versão antiga.
