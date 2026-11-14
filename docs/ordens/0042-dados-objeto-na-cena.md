# Ordem de serviço: `dados`, acesso ao objeto do dado na cena

Ordem: OS-0042 (pedido da `vitrine` ao `dados`, extração nº 9, parte 2 de 4)
Módulo: `dados`
Escopo de escrita:
- `src/modules/dados/`: `domain/objeto.ts` (novo), `index.ts`, `tests/` e `CLAUDE.md`, no bloco Expõe.
- **Legado da vitrine:** `src/scene/Hand.tsx`, só as linhas 20 e 119-122 (`shade`, `gem-i` e `die-i` procurados pelo nome).

Objetivo: quem tem a cena pede ao `dados` o objeto do dado e as operações sobre ele, em vez de procurar `die-i`/`gem-i` pelo nome. É a promessa da spec de `dados` adiada para esta extração (registrada em `docs/specs/vitrine.md`). O comportamento não muda.

Leia antes de começar:
- `src/modules/dados/CLAUDE.md`, `index.ts` e `domain/inspecao.ts` (já procura `die-i`/`gem-i` dentro do módulo)
- `src/modules/dados/scene/AparenciaDoDado.tsx`, onde os nomes `die-i`/`gem-i` nascem
- `src/scene/Hand.tsx:15-25` e `:110-130`
- `src/modules/arremesso/scene/MaoDoArremesso.tsx:110-125`, só para ler: ela será trocada na OS-0043, que é ordem do `arremesso`

Decisões do orquestrador:
1. **Funções puras**, em `domain/objeto.ts`, sem React e só com three, recebendo a raiz onde procurar e o índice:
   - `dadoNaRaiz(raiz, i)`: o grupo `die-i`, ou `undefined`;
   - `gemaNaRaiz(raiz, i)`: o objeto `gem-i`, ou `undefined`;
   - `definirOpacidade(raiz, i, o)`: o `traverse` de `die-i` que hoje está em `MaoDoArremesso.tsx:119-120`, com o mesmo efeito, incluindo as malhas filhas (o brilho da gravação, como na OS-0033);
   - `definirSombra(raiz, i, on)`: o `shade` de hoje sobre `gem-i`.
   - Os nomes `die-i`/`gem-i` passam a existir só dentro de `dados`.
   - O `index.ts` exporta as quatro.
2. **`rotulos`.** A spec pede também `rotulos(obj)`. O `inspecao.rotulos` já existe. Não crie uma função nova sem chamador. Se o `Hand.tsx` ler os rótulos de outro jeito, registre no relatório.
3. **`Hand.tsx`.** A linha 20 (`shade`) sai, e as linhas 119-122 passam a usar `gemaNaRaiz`/`dadoNaRaiz`/`definirSombra` com `scene` como raiz. O resultado é o mesmo.
4. **Testes no módulo,** numa cena montada à mão com `die-0`/`gem-0` e malhas filhas, como o `inspecao.test.ts`: opacidade, sombra, e `undefined` quando não há dado.
5. **`CLAUDE.md` do `dados`:** o bloco Expõe ganha as quatro funções, e sai a nota de que "nascem com a vitrine".

Entregáveis:
1. `domain/objeto.ts`, os exports e os testes.
2. O `Hand.tsx` usando as funções.
3. O `CLAUDE.md` atualizado.

Critérios de aceite:
- `grep -n "gem-\|die-" src/scene/Hand.tsx` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O `index` fica sem React, e o worker não cresce.
- **Sem E2E** (regra de gate).

Fora do escopo:
- `MaoDoArremesso.tsx`, que é do `arremesso` (OS-0043), e `Cena.tsx` (`meshes`), que é da casca (OS-0044).

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Novo `src/modules/dados/domain/objeto.ts`: `dadoNaRaiz`, `gemaNaRaiz`, `definirOpacidade` (o `traverse` de `die-i` da `MaoDoArremesso`, com as malhas filhas e os materiais em array) e `definirSombra` (o `shade` sobre `gem-i`). Só three, sem React. O `index.ts` exporta as quatro.
- TDD: `tests/objeto.test.ts` (5 casos, cena montada à mão) falhou antes e passou depois. Cobre achar, `undefined` sem dado, opacidade com o brilho incluído, sombra só nas malhas da gema e gema-malha de embutido.
- `src/scene/Hand.tsx`: sai o `shade`. A procura de `gems`/`group` passa a usar `gemaNaRaiz`/`dadoNaRaiz(scene, i)`, ainda uma vez só, no início do voo.
- Correção do revisor (desempenho): a primeira versão chamava `definirSombra(scene, i, on)` em todo quadro, com até 10 `getObjectByName` por quadro. Agora existe `sombraNaGema(gema, on)` (o `traverse`), e `definirSombra` delega a ela. As 3 chamadas do `Hand.tsx` usam `sombraNaGema(gems[i], on)`, e o `gems` voltou à desestruturação do quadro. Zero buscas por quadro, como antes. `sombraNaGema` está no `index.ts`, tem teste e está no Expõe.
- Divergência: as linhas da ordem estão deslocadas (o `shade` estava na 17 e as procuras nas 116 e 119). As 3 chamadas de sombra também mudaram, porque o `shade` saiu.
- `rotulos`: nenhuma função nova. O `Hand.tsx` não lê os rótulos da cena: usa `polyhedron(kind).labelList`, do domínio.
- `CLAUDE.md` do `dados`: o Expõe ganhou as funções e saiu a nota "nascem nas extrações". O `CLAUDE.md` do `arremesso` ainda cita a espera por elas e fica para a OS-0043.
- TDD da correção: o caso de `sombraNaGema` falhou antes e passou depois (6 casos em `objeto.test.ts`).
- Gate (depois da correção): `npm test` 64 arquivos/549 testes; `test:server` 23; `build` ok, worker `presim.worker-BHo0CnSe.js` 2.379.760 B (mesmo hash e tamanho de antes); `lint` limpo; os greps de `gem-`/`die-` no `Hand.tsx` e de `react` no `index`/`objeto` voltam vazios.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Equivalência:** `definirOpacidade` e `definirSombra` têm o efeito do código anterior.
- **Nomes:** únicos na cena.
- **Testes:** testam o que dizem.
- **Arquitetura:** o `index` continua sem React e o worker igual.

**Achado 1, corrigido nesta ordem.** A primeira versão procurava a gema na cena **a cada quadro** de `settled`: até 10 `getObjectByName` por quadro, contra nenhum antes.
- O orquestrador mandou o dev criar `sombraNaGema(gema, on)` (`definirSombra` delega a ela).
- O `Hand.tsx` voltou a guardar as gemas uma vez só, no início do voo (`gemaNaRaiz`, linha 113), e passou a chamar `sombraNaGema(gems[i], on)`.
- Teste novo.

**Achado 2.** `arremesso/CLAUDE.md:28` fica para a OS-0043.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (regra de gate; a amostra vem na OS-0043).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 64 arquivos, 549 testes |
| `npm run test:server` | ✅ 23 testes |
