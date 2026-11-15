# Ordem de serviço: testes de arquitetura — imports e ciclos

Ordem: OS-0011 (F-7, parte 1 de 2, fundação, dev de shared)
Escopo de escrita: `package.json` (só `devDependencies`), `package-lock.json`, `tests/arquitetura/**` (novo: configuração do cruiser e testes), `docs/contexto/testes.md`
Objetivo: uma suíte `tests/arquitetura/` dentro do `npm test` bloqueia import proibido e ciclo novo (regras 1 e 4, ADR 0006 parte A). Os ciclos que o legado ainda tem entram como exceções nomeadas e com motivo.

**Revisão do orquestrador (2026-11-13), depois da primeira rodada:** o `dependency-cruiser` com `swc` não enxergou a aresta do worker (`new URL`). Pelo ADR 0006, a parte A passa a ser um teste próprio. Isso está registrado em **[ADR 0009](../adr/0009-leitor-de-imports-proprio.md)**, que substitui o passo 1 abaixo:
- desinstale o `dependency-cruiser` e mantenha o `@swc/core@1.16.22` (versão exata);
- escreva o leitor em `tests/arquitetura/leitor.ts` com o `parseSync` do swc, como descreve o ADR 0009;
- `tests/arquitetura/leitor.test.ts` prova as quatro arestas reais (a do worker incluída) e mais duas, em fixtures: um import relativo que não resolve faz o teste falhar, e um `new URL` para um arquivo que não é `.ts` é ignorado.

Os passos 2 a 4 e os critérios de aceite continuam valendo, com o leitor próprio no lugar do cruiser.

Leia antes de começar:
- `docs/adr/0006-testes-de-arquitetura.md` (inteiro; é curto) e `docs/adr/0009-leitor-de-imports-proprio.md`
- `docs/adr/0007-diferencas-de-stack.md`, pontos 5, 10 e 11
- `docs/mapa-modulos.md`, a seção "Ciclos de hoje e como somem"
- `docs/plano-refatoracao.md` §2, linha F-7
- `package.json`

Passos:

1. **Prova do leitor (antes de qualquer regra).**
   - Instale `dependency-cruiser` e `@swc/core` como `devDependencies`, com **versão exata** (sem `^`), seguindo a regra de versões fixas de `docs/contexto/armadilhas.md`.
   - Escreva `tests/arquitetura/leitor.test.ts`. Ele roda o cruiser por API (`cruise` do pacote) com `parser: 'swc'` sobre `src/` e confirma quatro arestas reais de hoje:
     - um import estático;
     - um `import type` (por exemplo, `src/dice/read.ts` → `src/shared/math.ts`);
     - um `import()` dinâmico (por exemplo, `src/ui/Controls.tsx` → `ImportDie`);
     - o worker `src/scene/Stage.tsx` → `src/physics/presim.worker.ts`, criado com `new URL(..., import.meta.url)`.
   - **Se o cruiser com `swc` não enxergar alguma das quatro, pare e reporte** qual faltou e o que você tentou. A alternativa (leitor próprio) muda o ADR 0006, e quem decide é o orquestrador. Não implemente a alternativa por conta própria.
2. **Regras** (`tests/arquitetura/imports.test.ts`, com a configuração em `tests/arquitetura/`):
   - **Ciclos.** Nenhum ciclo em `src/`, contando imports de tipo e dinâmicos. Os ciclos que existem hoje entram numa lista `CICLOS_CONHECIDOS`, um por entrada. Cada entrada traz o caminho do ciclo e o motivo, citando a linha da tabela "Ciclos de hoje" do mapa ou o `docs/plano-refatoracao.md` §8. O teste falha se aparecer ciclo fora da lista. Também falha se um ciclo da lista deixar de existir, para a lista não apodrecer: o erro manda tirar a entrada.
   - **`src/shared/**`** não importa nada de `src/` fora de `src/shared/`. Isso vale para a casca, o legado e o futuro `src/modules/`.
   - **Módulos.** As regras de `src/modules/**` do ADR 0006 já ficam escritas, mesmo sem nenhum módulo existir ainda: porta única (`index.ts`, ou `contracts.ts` só de tipo), não importar a casca, e as restrições de `regras`. Cada uma ganha um caso que prova que a regra **dispara**. Use uma árvore de fixture mínima em `tests/arquitetura/fixtures/`, cruzada só pelo teste, para não depender de módulo real.
   - **Servidor.** De `server/**` para `src/**` só podem entrar os arquivos permitidos. Hoje são `src/dice/kinds.ts` e `src/dice/omen.ts`. Isso é uma exceção nomeada, que cai na extração de `regras` (ADR 0002, ADR 0004). Qualquer outro import de `server/` para `src/` falha. Regras internas de `server/`, como `routes.ts` e `mongodb`, ficam para a extração do `historico`. Deixe um comentário dizendo isso.
3. **Mensagens.** Toda falha diz qual regra quebrou, o arquivo de origem, o destino e a regra da seção 2 do guia (1 ou 4) ou o ADR em causa.
4. **Doc.** Em `docs/contexto/testes.md`, registre a suíte `tests/arquitetura/`: o que ela cobre, como acrescentar ou remover um ciclo conhecido e onde ficam as exceções.

Critérios de aceite:
- `npm test` roda a suíte de arquitetura e passa. A suíte leva menos de cerca de 15 s; se passar disso, reporte.
- Prova de que as regras disparam:
  - os casos de fixture mostram falha em import interno de outro módulo, em ciclo entre módulos, em `shared` importando o legado e em `regras` importando `three`;
  - um ciclo novo criado de propósito num arquivo temporário faz o teste falhar. Desfaça antes de entregar e registre o resultado no relatório.
- A lista `CICLOS_CONHECIDOS` vem completa no relatório, com o motivo de cada entrada.
- `npm run build`, `npm run lint` e `npm run test:server` passando. O `@swc/core` é binário nativo: confira que o `npm ci` limpo funciona nesta máquina.

Fora do escopo:
- O teste de dono dos dados (parte B do ADR 0006), que vai na OS-0012.
- Corrigir qualquer ciclo ou import do legado. Aqui eles só são listados.
- Qualquer arquivo de `src/` ou de `server/`.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

**1ª rodada — parada no passo 1, como a ordem manda.** O `dependency-cruiser@18.7.2` com `parser: 'swc'` (`@swc/core@1.16.22`) viu o import estático, o `import type` e o `import()`, mas **não** o worker `new Worker(new URL(...))`: o visitor swc do cruiser não trata `new`; `exoticRequireStrings` não ajuda; `tsc` também falha (e o cruiser só suporta TS < 7). A instalação também avisou `EBADENGINE` (Node 25.9.0). Decisão: leitor próprio, previsto no ADR 0006 e registrado no ADR 0009.

**2ª rodada — leitor próprio.** `dependency-cruiser` desinstalado; fica só `@swc/core@1.16.22` (exata); `npm ci` limpo passa, sem o `EBADENGINE`. Em `tests/arquitetura/`: `leitor.ts` (AST do `parseSync`, resolução própria), `regras.ts`, `config.ts`, `leitor.test.ts`, `imports.test.ts` e `fixtures/`. O leitor vê as quatro arestas reais, inclusive o worker, e recusa: import que não resolve, `import()` sem string literal, especificador com `/`, grafia diferente da do disco (`realpathSync.native`); ignora `new URL` para não-código. Ciclos por Tarjan em dois níveis: arquivo e pasta (a unidade é `src/modules/<m>`, `src/<pasta>` ou arquivo da raiz). Regra a mais, do ADR 0006: `src → server` só `import type` de `contracts.ts`.

**`CICLOS_CONHECIDOS`:**
1. arquivo `src/dice/custom.ts ↔ src/dice/polyhedra.ts` — `polyhedron(kind)` resolve importados pelo registro; some na extração de `dados`.
2. pasta `src/physics ↔ src/throw` — `aim`/`settle`/`vortex` → `world`, e `apply`/`presim` → `aim`/`settle`; some com o módulo `arremesso`.

Ciclo proposital `src/cicloTemp/a.ts ↔ b.ts` (uma aresta só de tipo): a suíte falhou com `[ciclo fora de CICLOS_CONHECIDOS, nível arquivo] … (regra 4 do guia; ADR 0006)`; apagado em seguida.

## Parecer do revisor

**1ª rodada: DEVOLVIDO.** B1: a metade `src → server` de `fronteiraDoServidor` não tinha fixture que provasse que dispara. Observações aceitas: `import()` por variável descartado sem aviso; `/src/...` virava pacote; grafia não conferida no Windows; comentário sobre ciclos do servidor; tabela de ciclos do mapa desatualizada (atualizada pelo orquestrador).

**2ª rodada: APROVADO.**
- ✅ (a) Só arquivos do escopo.
- ✅ (b) Nada em `src/` nem `server/`.
- ✅ (c) Fixture para cada recusa do leitor.
- ✅ (d) As sete regras do ADR 0006 parte A provadas, nos dois lados.
- ✅ (e) Exceções com motivo.
- ✅ (f) Doc atualizada.

A conferência de grafia compara só a parte relativa ao repositório; testada com a base em `c:\`, `C:\USERS` e com barras: 319 arestas, nenhuma recusa. Observações que ficam: a exceção `vitest` de `regras/tests` e o `TsImportType` sem fixture; a citação do plano §8 nos motivos é fraca; o comentário do cabeçalho de `leitor.test.ts` diz "two fixture cases" (são cinco).

## Gate

2026-11-13, pelo orquestrador. Sem E2E: a ordem não toca `src/`, `server/` nem `e2e/` (plano §4).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 30 arquivos, 389 testes (23 de arquitetura, ~0,6 s) |
| `npm run test:server` | ✅ 23 testes |
