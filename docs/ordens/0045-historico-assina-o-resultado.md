# Ordem de serviço: `historico`, assinar o resultado publicado

Ordem: OS-0045 (fase 6, desacoplamento, parte 1)
Módulo: `historico` (metade do cliente)
Escopo de escrita:
- `src/modules/historico/`: `index.ts`, um arquivo novo em `domain/` ou na raiz do módulo para montar o corpo, `tests/`.
- **Doc compartilhada:** `server/src/modules/historico/CLAUDE.md`, só os blocos Expõe e Consome da metade do cliente. Nenhum código do servidor muda.
- **Casca:** `src/App.tsx` (a assinatura sai e entra `iniciarHistorico()`) e `src/app/historico.ts` (sai, com `git rm`).
- **Testes:** `tests/history.test.ts` vai para `src/modules/historico/tests/` com `git mv`, e só mudam os imports.
- **Docs:** `docs/mapa-modulos.md`, nas linhas do `historico` (12, 98 e 114), e `docs/contexto/visao-geral.md`, se citar `app/historico.ts`.

Objetivo: tirar a última ponte da casca. Hoje o `App.tsx` assina `resultadoPublicado` e monta o corpo de cada dado com `corpoDosDados` (`src/app/historico.ts`). Depois desta ordem, quem faz isso é o próprio `historico`. O comportamento não muda: o mesmo POST, com o mesmo corpo, no mesmo momento.

Leia antes de começar:
- `server/src/modules/historico/CLAUDE.md`, inteiro (as duas metades)
- `src/modules/historico/index.ts`, `api.ts`, `repository.ts` e `tests/*`
- `src/App.tsx` e `src/app/historico.ts`
- `tests/history.test.ts`
- `src/modules/arremesso/index.ts`, só o `resultadoPublicado`
- `src/modules/dados/index.ts`, só o `customDie`
- `docs/adr/0005*.md` (eventos)

Decisões do orquestrador:
1. **`iniciarHistorico(api = API): () => void`** no `index.ts`.
   - Assina `arremesso.resultadoPublicado` e, a cada resultado, chama `registrarArremesso({ dice: corpoDosDados(dice, results), force }, api)`.
   - Devolve a função que cancela a assinatura.
   - Não assina ao carregar o módulo. A casca chama `iniciarHistorico()` uma vez, no mesmo `useEffect` onde a assinatura está hoje, e devolve o cancelamento ao React. Assim a ordem dos assinantes continua a mesma: os módulos que assinam ao carregar (`pressagios`) vêm antes, e o histórico vem por último.
   - O CLAUDE.md fala em `dados.tipo(kind)`, mas essa função não existe. Use `customDie` do `dados`, que já é o que a casca usa, e corrija o CLAUDE.md.
2. **`corpoDosDados`** passa ao módulo com o mesmo código, num arquivo próprio do `historico`, e fica interno ao módulo: o `index.ts` não o exporta. O teste movido importa pelo caminho relativo dentro do módulo, como os outros testes do módulo.
3. **`registrarArremesso`** continua exportado (os testes de `envio` usam).
4. **Teste novo** em `tests/`: com uma `api` de teste e o `fetch` substituído, como no `envio.test.ts`, confira que um resultado publicado vira um POST com o corpo certo, e que depois do cancelamento não sai mais nada. Para publicar, use o caminho público do `arremesso`. Se não houver um caminho público para publicar, use um dublê do `resultadoPublicado` passado por parâmetro (`iniciarHistorico(api, sinal = resultadoPublicado)`), e registre a escolha no relatório.
5. **Sem ciclo:** o `arremesso` não importa o `historico`. Confira com `npm test` (arquitetura).
6. **Docs.**
   - `server/src/modules/historico/CLAUDE.md`: o Expõe do cliente ganha `iniciarHistorico`, e saem o "Até a fase 6" e o "Depois da fase 6". O Consome do cliente ganha `arremesso` (`resultadoPublicado`) e `dados` (`customDie`).
   - `docs/mapa-modulos.md`: a linha 12 perde o "Até a fase 6" do cliente. A linha 98, da ponte, fica riscada (`~~...~~`) e diz "desfeito na OS-0045". A 114 diz que a troca para o evento foi feita na OS-0045.

Entregáveis:
1. `iniciarHistorico` e o corpo dos dados no módulo, com testes.
2. A casca sem a assinatura e sem `src/app/historico.ts`.
3. O teste movido e as docs.

Critérios de aceite:
- `src/app/historico.ts` não existe, e `grep -rn "ponte até" src` volta vazio.
- `grep -n "resultadoPublicado\|corpoDosDados\|registrarArremesso" src/App.tsx` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O worker não cresce além de 2379,76 kB, e a arquitetura passa.
- **Sem E2E no dev.** O orquestrador roda o E2E completo no fim da fase 6.

Fora do escopo:
- O servidor, o `src/ui/Controls.tsx` e qualquer mudança de comportamento.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- TDD: `tests/assinatura.test.ts` novo falhou primeiro (`iniciarHistorico` não existia). Ele publica pelo caminho público do `arremesso` (`input` press/release + `publish`), então não houve dublê nem parâmetro `sinal`. Confere o POST com o corpo certo (um importado d20 com `base`/`omens`) e que nada sai depois do cancelamento.
- `iniciarHistorico(api = API)` no `index.ts` assina `resultadoPublicado` e chama `registrarArremesso` com `corpoDosDados`. `registrarArremesso` continua exportado, e `corpoDosDados` não é exportado.
- Divergência: `src/app/historico.ts` saiu com `git mv` para `src/modules/historico/domain/corpo.ts`, no lugar de `git rm` mais um arquivo novo. Assim o histórico do arquivo fica preservado. O código é o mesmo, e mudaram só o comentário de cabeçalho e os imports (`DieIn` de `../api.ts`).
- `tests/history.test.ts` foi com `git mv` para `src/modules/historico/tests/corpo.test.ts`, e só os imports mudaram. O comentário do `describe` ("The shell builds... until phase 6") ficou desatualizado, porque a ordem só permitia mudar imports.
- Casca: o `App.tsx` chama `useEffect(() => iniciarHistorico(), [])` no mesmo lugar, e o import de `arremesso` saiu. Os dois critérios de `grep` voltam vazios.
- Docs: no `server/.../historico/CLAUDE.md`, o Expõe e o Consome do cliente foram atualizados (`customDie` no lugar do `dados.tipo`, e entrou também `regras.isCustom`). No `mapa-modulos.md`, as linhas 12, 98 (riscada, "desfeito na OS-0045") e 114 foram atualizadas. No `visao-geral.md`, saiu a linha do `app/historico.ts`.
- Gate: `build` ok, com o `presim.worker` em 2.379,76 kB (igual ao limite). `lint` ok, sem avisos. `npm test` passou: 68 arquivos e 558 testes, arquitetura incluída. `test:server` passou: 23 testes. Não rodei E2E, como pede a ordem.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Comportamento:** o mesmo POST, com o mesmo corpo, no mesmo momento. A assinatura fica no mesmo `useEffect` e depois do `pressagios`. No StrictMode, montar, desmontar e montar de novo deixa uma assinatura só, ainda por último (`shared/events.ts`).
- **Arquitetura:** sem ciclo. O `historico` entra só pelas portas de `arremesso`, `dados` e `regras`, e o `corpoDosDados` não sai pelo `index`.
- **Docs:** em dia.

Ressalvas:
1. O "nada depois do cancelamento" de `assinatura.test.ts` podia passar à toa, sem provar que o segundo `publish` emitiu. O orquestrador pôs um assinante espião que conta 2 emissões.
2. O `parar()` repetido no `finally` é redundante. Ficou de propósito, para cancelar mesmo se uma checagem falhar antes.

Decisões do orquestrador sobre o relatório do dev:
- O `git mv` de `app/historico.ts` para `domain/corpo.ts`, no lugar de `git rm`, foi aceito porque guarda o histórico do arquivo.
- O comentário desatualizado de `corpo.test.ts:6` foi corrigido pelo orquestrador.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (o E2E completo vem no fim da fase 6).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB (`BHo0CnSe`, igual) |
| `npm run lint` | ✅ |
| `npm test` | ✅ 68 arquivos, 558 testes |
| `npm run test:server` | ✅ 23 testes |
