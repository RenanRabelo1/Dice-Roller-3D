# Ordem de serviço: `dados`, catálogo reativo, inspeção e CLAUDE.md

Ordem: OS-0023 (extração nº 3, `dados`, parte 4 de 4)
Módulo: `dados`
Escopo de escrita:
- `src/modules/dados/`: `domain/catalogo.ts`, `domain/modelo.ts`, `domain/inspecao.ts` (novo), `scene/AparenciaDoDado.tsx`, `index.ts`, `cena.ts`, `contracts.ts` (só para acrescentar), `tests/` e `CLAUDE.md` (novo).
- **Legado:** `src/scene/Die.tsx` (saem as props `custom` e `color` e a assinatura do store).
- **Casca:** `src/app/Cena.tsx`. Sai o `color={gemColor(kind)}` do `<Die>`, e `labels`, `numbersVisible` e `gemLook` passam a chamar a inspeção do `dados`.
- **Docs:** `docs/specs/arremesso.md` e `docs/specs/vitrine.md`, com uma linha cada (item 5). Também `docs/contexto/dados.md` e `docs/contexto/testes.md`, onde citarem o que muda.

Objetivo: o `dados` fica completo, conforme a spec (`docs/specs/dados.md`).
- O catálogo avisa quando muda, e a aparência reage sozinha, sem o legado passar registro e cor.
- O cache de modelo é liberado quando um tipo é removido.
- A inspeção de teste do dado na cena passa a ser do módulo.
- O módulo ganha o `CLAUDE.md`.

O comportamento e o visual não mudam.

Leia antes de começar:
- `docs/specs/dados.md`, inteiro (é curto)
- `src/modules/dados/index.ts`, `cena.ts`, `domain/catalogo.ts`, `domain/modelo.ts` e `scene/AparenciaDoDado.tsx`
- `src/scene/Die.tsx`, inteiro, e `src/app/Cena.tsx:190-260` e `:325-335`
- `src/shared/events.ts` (ADR 0005)
- `src/modules/regras/CLAUDE.md` e `server/src/modules/historico/CLAUDE.md`, como modelo de formato

Decisões do orquestrador:
1. **`catalogoAlterado`.**
   - É um `Signal<{ kind: CustomKind; mudanca: 'registrado' | 'removido' }>` criado em `domain/catalogo.ts`.
   - `registerCustom` emite `registrado` e `unregisterCustom` emite `removido`. `registerPoly`, que só o worker usa, não emite.
   - O `index.ts` exporta `catalogoAlterado` só com `subscribe`. Quem publica é dono da instância (ADR 0005).
   - Os nomes `registerCustom`/`unregisterCustom` ficam, pela decisão 1 da OS-0020.
2. **Aparência reativa.**
   - `AparenciaDoDado` passa a ter só `{ index, kind }`.
   - Ela obtém o registro com `useSyncExternalStore(catalogoAlterado.subscribe, () => customDie(kind))` e a cor com `gemColor(kind)`. Hoje é exatamente o que a casca e o `Die.tsx` passam.
   - Confira que `customDie` devolve a mesma referência entre emissões, porque o `useSyncExternalStore` exige snapshot estável.
   - `Die.tsx` deixa de ler `useDice((s) => s.customs…)` e não recebe mais `color`. A casca para de passar `color`.
   - O `updateCustom` do store re-registra o mesmo `kind`, e a aparência tem de acompanhar como hoje (cor, tinta, acabamento).
3. **`forgetModel` na remoção.**
   - `domain/modelo.ts`, ao carregar, assina `catalogoAlterado` e chama `forgetModel(kind)` em `removido`.
   - `catalogo.ts` não importa `modelo.ts`, que continua só sob demanda.
   - Em `registrado`, nada muda: o comportamento de hoje fica.
4. **`inspecao`.**
   - `domain/inspecao.ts`, puro (`three`, sem React), recebe a raiz onde procurar e o índice: `rotulos(raiz, index)`, `numeraisVisiveis(raiz, index)` e `aparenciaDaGema(raiz, index)`. O código é o de `Cena.tsx:196-258`, movido sem mudar.
   - Os tipos de retorno vão para o `contracts.ts`.
   - O `index.ts` exporta `inspecao = { rotulos, numeraisVisiveis, aparenciaDaGema }`.
   - A casca chama passando as mesmas raízes de hoje: `dice.current` para rótulos e numerais, e `scene` para a gema.
   - O `DiceHook` de `testHook.ts` não muda.
5. **O que a spec lista e fica para depois.** `definirOpacidade`, `definirSombra` e `rotulos(obj)` só têm uso no `Hand.tsx` (linhas 163-167 e 236-239), que sai na extração de `arremesso` e de `vitrine`. Não crie funções sem chamador. Acrescente uma linha a `docs/specs/arremesso.md` e outra a `docs/specs/vitrine.md`: "o trecho que procura `gem-i`/`die-i` pelo nome passa a pedir a `dados` `definirOpacidade`/`definirSombra`/`rotulos`, criados nessa extração".
6. **`CLAUDE.md` do módulo.**
   - Tem os cinco blocos da spec: Responsabilidade, Regras de negócio, Expõe, Consome e Fora do escopo. Fica entre 30 e 50 linhas.
   - Os nomes são os reais do `index.ts`/`cena.ts`, em inglês onde ficaram em inglês.
   - Diga as duas portas (ADR 0010) e que `domain/modelo.ts` só entra por `carregarModelo`.
   - Diga o que o módulo possui: o registro de importados e os caches de poliedro, símbolo e modelo.

Entregáveis:
1. O sinal, a aparência reativa, o `forgetModel` na remoção e a inspeção, como nas decisões.
2. Testes no módulo:
   - `catalogoAlterado` emite `registrado`/`removido` e não emite em `registerPoly`.
   - Depois de `unregisterCustom`, um `carregarModelo` do mesmo tipo relê o arquivo. Use o fixture de modelo que os testes já têm. Se exigir mock pesado, teste só que o cache esvazia.
   - `inspecao` sobre uma cena montada à mão com `die-0`/`gem-0`.
3. `CLAUDE.md` do módulo e as linhas nas specs de `arremesso` e `vitrine`.

Critérios de aceite:
- `grep -n "customs\|color" src/scene/Die.tsx` não mostra leitura do store nem prop de cor.
- `grep -n "gem-\|die-" src/app/Cena.tsx` só mostra o que não é inspeção de dado (`meshes`, se ficar).
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam.
- Os chunks sob demanda não mudam, e `modelo` continua fora da carga inicial.
- O worker não cresce além de 2379,76 kB.
- O `index.ts` continua sem React (`indexSemReact`).
- **Sem E2E no dev.** O orquestrador roda o E2E de aceite do `dados` depois da revisão.

Fora do escopo:
- Renomear funções para os nomes em português da spec.
- Mexer em `Hand.tsx`.
- Mexer em `store.ts`, além do que a decisão 2 exige. Se exigir algo, pare e reporte.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

**Módulo:**
- `domain/catalogo.ts`: o sinal `catalogoAlterado`, emitido em `registerCustom` (`registrado`) e em `unregisterCustom` (`removido`).
- `domain/modelo.ts`: assina o sinal ao carregar e chama `forgetModel` em `removido`.
- `domain/inspecao.ts`: `rotulos`, `numeraisVisiveis` e `aparenciaDaGema`. É o código de `Cena.tsx`, agora com a raiz como parâmetro.
- `AparenciaDoDado`: recebe só `{ index, kind }` e lê registro e cor sozinha (`useSyncExternalStore` e `gemColor`).
- `contracts.ts`: ganhou `RotuloNaCena` e `AparenciaDaGema`.
- `CLAUDE.md`: 40 linhas.
- Testes novos: `catalogoAlterado`, `modelo` e `inspecao`, escritos antes do código (TDD).

**Legado e casca:**
- `Die.tsx` não lê mais o store nem recebe `color`.
- `Cena.tsx` não passa `color` e delega a inspeção ao `dados`.

**Specs:** `arremesso.md` e `vitrine.md` passam a dizer que `definirOpacidade`, `definirSombra` e `rotulos` nascem nessas extrações.

**Divergência:** o sinal fazia o worker crescer para 2380,03 kB. O dev marcou `createSignal` com `/* @__PURE__ */` e trocou o `subscribe` público por um wrapper em arrow. O worker voltou a 2379,76 kB.

## Parecer do revisor

**APROVADO COM RESSALVAS** (revisão da OS e auditoria de aceite do `dados`).
- Decisões 1 a 6 cumpridas.
- O snapshot é estável.
- `inspecao` é cópia fiel do que saiu da casca.
- O `@__PURE__` com o wrapper é seguro.
- A cor ficou até mais correta: antes, a prop `color` só se atualizava quando `dice` mudava.

Auditoria:
- ninguém fora do `dados` lê o registro;
- `omenD20s` não existe;
- o ciclo `custom ↔ polyhedra` sumiu;
- os chunks sob demanda continuam;
- tudo o que a spec "Expõe" existe com o nome em inglês ou tem destino registrado.

**Ressalva**, corrigida pelo orquestrador: `tests/modelo.test.ts` importava `tests/helpers/models.ts`, que puxa o legado `src/dice/importer`. O teste ganhou um escritor de STL local, e o módulo não alcança mais o legado nem nos testes.

## Gate

2026-11-14, rodado pelo orquestrador. É o **aceite do módulo `dados`**, com E2E.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB; sob demanda: `ImportDie`, `tableFile`, `HDRLoader`, `ler`, `modelo` |
| `npm run lint` | ✅ |
| `npm test` | ✅ 43 arquivos, 443 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 97 de 98 na suíte completa (20,0 min) e 3 de 3 na reexecução isolada |

A primeira tentativa de E2E foi interrompida por falta de memória na máquina. Na segunda, falhou `table.spec.ts:34` (fundo da mesa): depois do `reload`, o `__dice.table()` não respondeu em 120 s. O teste é da mesa, que a ordem não tocou. Rodado sozinho com `--repeat-each=3`, passou nas 3 vezes (~25 s cada). Fica registrado como sensível à carga, como os botões de presságio.
