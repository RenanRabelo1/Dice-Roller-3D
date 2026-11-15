# Ordem de serviço: `dados`, aparência na cena e modelo importado

Ordem: OS-0021 (extração nº 3, `dados`, parte 2 de 3)
Módulo: `dados`
Escopo de escrita:
- `src/modules/dados/`: `scene/*.tsx`, `domain/modelo.ts`, `index.ts`, `contracts.ts` (só para acrescentar) e `tests/`.
- Legado:
  - `src/scene/Die.tsx` (fica só a parte física);
  - `src/dice/importer.ts` (só as linhas 332-380 e 461-495, que saem, e os imports);
  - `src/dice/notation.ts` (só o `dieName`).
- Testes que testam o que muda de lugar: `git mv` ou ajuste de import.
- `tests/arquitetura/fixtures/`: duas fixtures a mais para a regra `moduloSemLegado`, uma com `import type` do legado e outra com `import()` do legado. É uma observação da revisão da OS-0020.

**Decisão do responsável humano (2026-11-13), depois da primeira rodada:** o `index.ts` com componentes fazia o worker e os testes em Node carregarem React. Ficou decidido o **[ADR 0010](../adr/0010-duas-portas-para-modulo-com-cena.md)**: duas portas.
- `index.ts` é a porta pura, sem React.
- `cena.ts` é a porta dos componentes e hooks.

Entram no escopo:
- `src/modules/dados/cena.ts`;
- os importadores de componentes do `dados`;
- `tests/arquitetura/**`: as regras `portaUnica` e `moduloSemLegado` passam a aceitar `cena.ts`, e uma regra nova barra React no fecho do `index.ts`;
- `tsconfig.test.json`: inclui o `src/troika-three-text.d.ts` e tira o `/// <reference>`.

Objetivo: a aparência do dado (gema, tinta, numerais, símbolos, modelo importado) e o nome de exibição passam a ser do `dados`. O `Die.tsx` do legado fica só com o corpo físico, que vai para o `arremesso` na extração dele, e passa a desenhar o dado com o componente do módulo. O comportamento e o visual não mudam.

Leia antes de começar:
- `docs/specs/dados.md`, nas seções "Expõe → Aparência", "Regras de negócio" (tinta, nome, um objeto por dado, gema sem refração) e "Origem do código"
- `src/modules/dados/index.ts` e `contracts.ts`, que vieram da OS-0020
- `src/scene/Die.tsx`, inteiro (229 linhas)
- `src/dice/importer.ts:330-380` e `:455-495`
- `src/dice/notation.ts:8-16`
- `docs/contexto/armadilhas.md`, na seção de desempenho (numerais, luzes, shaders)

Decisões do orquestrador:
1. **Nomes.** Os nomes atuais ficam (`GemMaterial`, `usePainted`, `paintGlb`, `FONT`, `FONT_URL`, `SYMBOL`, `GEM`, `gemColor`, `inkTriangles`, `markInk`, `hasTexture`, `forgetModel`, `modelObject`). São novos dois nomes: `<AparenciaDoDado>`, o componente de malha + numerais, sem corpo físico, e `nomeDoTipo`, que é o `dieName` de hoje.
2. **Modelo continua sob demanda (ADR 0007, ponto 11).** Hoje `Die.tsx:92` carrega o `importer` com `import()`, e os loaders de GLB/STL vão num chunk separado. Isso tem de continuar.
   - `domain/modelo.ts` (`modelObject`, `markInk`, `hasTexture`, `forgetModel`, `inkTriangles`, `dentTester`) só pode ser carregado por `import()` de dentro do módulo.
   - O `index.ts` não o reexporta estaticamente. Ele exporta uma função `carregarModelo(die)` que faz o `import('./domain/modelo')`. Siga a forma que o `Die.tsx` já usa.
   - Confira no `vite build` que nenhum chunk sob demanda passou a ser estático e que os loaders não entraram no `index` nem no `dados`.
3. **Limites ao ler um dado salvo.** O `modelObject` de hoje relê o arquivo salvo com os limites de importação (`LIMITS` do `importer`, que é de `meus-dados`). Em `dados`, a releitura usa `readModel` de `src/shared/modelos3d` com os mesmos três valores, numa constante própria `LIMITES_DO_MODELO_SALVO`. O comentário deve dizer que são os limites com que o dado foi aceito na importação e que precisam acompanhar os de `meus-dados`. Assim, um dado salvo sempre relê. O comportamento não muda.
4. **Erros.** O `useModel` de hoje trata a falha de leitura voltando ao sólido ideal. Esse comportamento fica. Se o tratamento depender de `ImportError`, que é de `meus-dados`, troque por `ModelError` ou por um `catch` genérico, o que der o mesmo resultado, e registre no relatório.
5. **`Die.tsx` no legado.** Fica o `RigidBody`, o colisor, o `register`, a posição inicial (`vortexCenter`) e o `MATERIAL`. Dentro do `RigidBody` vai `<AparenciaDoDado kind index … />`. As props passam só o que a aparência precisa.
6. **`importer.ts`.** As linhas que vão para `dados` saem. O que fica (`inkOf`, `looksNumbered`, a detecção e a calibração, que são de `meus-dados`) passa a importar `dentTester` e `inkTriangles` de `dados`. Pode ser pelo `index.ts`, como funções puras, desde que não puxem os loaders. Se não der sem puxá-los, pare e reporte.
7. **`notation.ts`.** Passa a ter `export const dieName = nomeDoTipo; // ponte até a OS-0022`.

Entregáveis:
1. `src/modules/dados/scene/` com `AparenciaDoDado.tsx` (gema, numerais, símbolos, modelo, tinta), `GemMaterial` e `usePainted`/`paintGlb`. Os componentes não têm regra de negócio. Cor, tinta, nome e base vêm do `domain/`.
2. `domain/modelo.ts`, carregado sob demanda, e `nomeDoTipo` no `domain/`.
3. O `index.ts` expõe os nomes da decisão 1 e mais `carregarModelo`.
4. `Die.tsx` reduzido, `importer.ts` sem as linhas movidas e `notation.ts` com a ponte.
5. Testes:
   - o que testa as funções movidas acompanha a função (por exemplo, `inkTriangles` em `tests/importer.test.ts`, ou `tests/inkGlow.test.ts`, se testar algo daqui);
   - nenhuma asserção muda;
   - `nomeDoTipo` ganha teste no módulo com os casos da spec: `d10 Vampiro`, `d10 Fome`, `d6 Fogo`, `Moeda`, importado padrão `<base> <nome>`, forma livre só `<nome>`.

Critérios de aceite:
- `vite build`: os chunks sob demanda seguem `importer`, `ImportDie`, `tableFile`, `HDRLoader` e `ler`. A carga inicial (`index` + `three` + `dados` + `plataforma`) não cresce mais que cerca de 1 kB. Mostre os tamanhos.
- `src/modules/dados/` continua sem importar o legado (regra `moduloSemLegado`).
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam.
- **Sem E2E** (regra de gate). O aceite do `dados` vem depois da OS-0022, e o E2E de lá cobre `smoke`, `roll`, `screens` e `import`.

Fora do escopo:
- Trocar os outros pontos de chamada do legado, `isD20`, o evento `catalogoAlterado` e `inspecao()`, que ficam para a OS-0022.
- Mudar cor, fonte, tamanho de numeral, material ou número de objetos na cena.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

**Módulo `dados`:**
- `domain/aparencia.ts`: `GEM`, `gemColor`, a tinta dos numerais, `FONT`, `FONT_URL`, `SYMBOL`, `nomeDoTipo` e `carregarModelo`, que faz `import('./modelo.ts')`.
- `domain/modelo.ts`, só sob demanda: `modelObject`, o cache, `forgetModel` e `LIMITES_DO_MODELO_SALVO`, com os mesmos valores do `LIMITS` do importer.
- `domain/gravacao.ts`, puro e estático: `dentTester`, `inkTriangles`, `markInk` e `hasTexture`.
- `scene/AparenciaDoDado.tsx`, `scene/GemMaterial.tsx`, `scene/Pintura.tsx` (`usePainted`, `paintGlb`) e `tests/nome.test.ts`.
- A porta `cena.ts` (ADR 0010) traz os componentes e hooks. O `index.ts` ficou puro.

**Legado:**
- `Die.tsx` ficou só com a parte física e desenha `<AparenciaDoDado>`.
- `importer.ts` perdeu as linhas que foram para o módulo.
- Pontes até a OS-0022: em `Die.tsx`, em `importer.ts` (`carregarModelo as modelObject`) e em `notation.ts` (`dieName = nomeDoTipo`).

**Arquitetura:**
- `portaUnica` aceita `cena.ts`.
- Regra nova `indexSemReact`, com fixture.
- Fixtures de `import type` e de `import()` do legado para `moduloSemLegado`.
- `tsconfig.test.json` inclui o `.d.ts` do troika.

**Divergências (aceitas):**
1. Decisão 2 contra a decisão 6: `ImportDie.tsx` importa `markInk`/`hasTexture` estaticamente. Por isso as quatro funções puras ficaram em `gravacao.ts`, e não no `modelo.ts` sob demanda.
2. A assinatura do store continua no `Die.tsx`, que passa `custom`/`color` como prop. Isso fica até o `catalogoAlterado` (OS-0022).
3. Decisão 4: o `useModel` mantém o `catch` genérico. A releitura agora falha com `ModelError` em vez de `ImportError`, e nada dependia do tipo.
4. Worker: 2373,99 → 2379,76 kB, **sem React**. A hipótese de isolar o `carregarModelo` não reduziu o tamanho (mesmo hash). A causa provável são os barris `index.ts` gerando código no worker, mas não foi isolada. A diferença (0,24%) foi aceita pelo orquestrador.

**Primeira rodada:** o `index.ts` exportava os componentes, e o worker e os testes passaram a carregar React (+7,3 kB e o aviso `THREE_CJS_DEPRECATED`). O responsável humano decidiu pelo **ADR 0010**, com duas portas.

## Parecer do revisor

**APROVADO.** Itens 1, 2, 4, 5, 6, 7 e 9 ✅. Os itens 3 e 8 não se aplicam.

**Visual.** `AparenciaDoDado`, `GemMaterial` e `Pintura` são cópia literal do `Die.tsx` do HEAD. Ficaram iguais:
- cores, fonte, materiais e sombras;
- os nomes `die-i` e `gem-i`;
- o `userData`;
- um objeto por dado;
- o fallback para o sólido ideal.

Linhas não triviais que mudaram:
- `numeralInk` devolve as mesmas referências que antes;
- `carregarModelo` agora baixa o chunk `modelo` (0,38 kB) em vez do `importer` (9,95 kB);
- os efeitos foram divididos entre pai e filho, sem efeito observável.

**Chunks.** `modelo` e os loaders só entram por `import()`. Nenhum chunk sob demanda virou estático. A carga inicial passou de 3702,80 para 3703,23 kB (+0,43 kB), em 5 requisições iniciais em vez de 4 (o `BufferGeometryUtils` ganhou chunk próprio).

**Observações que vão para a OS-0022:**
- marcar cada linha de ponte do `Die.tsx`;
- comentário recíproco no `LIMITS` do `importer`, ou um teste de igualdade com `LIMITES_DO_MODELO_SALVO`;
- `forgetModel` sem chamador, que passa a ser chamado por `removerTipo`;
- `docs/contexto/dados.md`, que ainda manda mexer em `Die.tsx`, inclusive no passo "adicionar dado".

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (regra de gate).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 40 arquivos, 432 testes, sem o aviso `THREE_CJS_DEPRECATED` |
| `npm run test:server` | ✅ 23 testes |
