# Spec: `dados`

Pasta: `src/modules/dados/`. Extração nº 3.

## CLAUDE.md (formato final)

### Responsabilidade
O dado como objeto: o catálogo dos tipos jogáveis (embutidos e importados registrados), o sólido de cada tipo (geometria, faces, numeração, rótulos), a leitura da face de cima e a aparência do dado na cena (gema, tinta, numerais, símbolos, modelo importado). Não sabe quem está na mão, como se joga nem como um dado é importado.

### Regras de negócio
- Circunraio por forma (`RADIUS`; forma livre 0,85). `RAIO_MAXIMO` é o maior deles (0,9) e há teste que garante isso.
- Faces opostas somam: d6 7, d8 9, d10 9 (faces 0 a 9), d12 13, d20 21. O d100 é um sólido de 100 faces, numerado `((rank*37) % 100) + 1`. O d4 é numerado por vértice. O 6 e o 9 ganham ponto em d10, d12, d20 e d100.
- Moeda: prisma de 48 lados; só as tampas são faces (1 = Cara em cima, 2 = Coroa).
- Símbolos por dígito do d10: `vtm` (6–9 ankh, 0 crit) e `hunger` (1 skull, 6–9 ankh, 0 fangs). Uma face vazia mantém o rótulo `''`.
- Leitura: a face cuja normal está mais alinhada com +Y; no d4, o vértice. Com `readsDown` (forma livre), a face de baixo. Só faces `readable !== false` contam.
- Valor para o jogador: o d10 (inclusive `vtm`/`hunger`) lê 0 e vale 10; os demais valem o que leem.
- Ordem do catálogo: embutidos em `KINDS`, depois os importados em ordem de criação. Um importado que não está no catálogo vale como d20 (comportamento atual, preservado).
- Tinta de importado: `auto` usa a escura (`#1B1A16`) se a luminância linear da gema passa de 0,5, senão a dourada (`#D4A93F`). Sem gravação ou com `nenhuma`, sem tinta. Acabamento padrão: `gema`.
- Nome de exibição: `d10 Vampiro`, `d10 Fome`, `d6 Fogo`, `Moeda`; importado padrão `<base> <nome>`; forma livre só `<nome>`.
- Um objeto por dado para todos os numerais (desempenho). Gema sem passe de refração.

### Expõe
- Catálogo:
  - `tipos()`, `tipo(kind)` (dados do importado: nome, apelido, base, `omens`, sólido, aparência);
  - `registrarTipo(t: TipoImportado)`, `removerTipo(kind)`;
  - evento `catalogoAlterado`;
  - `ordenar(dice)`, `baseDe(kind)`, `nomeDoTipo(kind)`, `paraRegras(kind) → DieKind` (via `regras.tipoParaPresagio`);
  - `poliedrosImportados(dice)`: os sólidos que o worker precisa.
- Sólidos e leitura:
  - `poliedro(kind)`, `fromTriangles(shape, tris, numbering?)`;
  - `RADIUS`, `RAIO_MAXIMO`, `OPPOSITE_SUM`;
  - `lerFaceDeCima(poly, q)`, `paraResultados(dice, raw)`;
  - `simbolo(nome)`;
  - os tipos `Polyhedron`, `Face`, `Label`, `Numbering`, `TipoImportado`, `Ink`, `Finish`.
- Aparência:
  - os componentes `<AparenciaDoDado kind index />` (malha + numerais, sem corpo físico) e `GemMaterial`;
  - `usePainted`, `paintGlb`, `corDaTinta(die, gem)`, `acabamentoDe(die)`, `INK_COLORS`;
  - `corDaGema(kind)`, `FONT`, `FONT_URL`, `SYMBOL`;
  - `carregarModelo(kind)` (sob demanda), `temTextura(obj)`;
  - `inkTriangles`/`dentTester`: a máscara da gravação, que a vitrine e `meus-dados` usam;
  - para quem tem o objeto do dado: `definirOpacidade(obj, o)`, `definirSombra(obj, on)`, `rotulos(obj)`. Assim ninguém procura `gem-i` pelo nome.
- `inspecao()` (só em modo teste): rótulos, visibilidade dos numerais, `gemLook`.

### Consome
- `regras`: tipos, `KINDS`, `BASE`, `SIDES`, `tipoParaPresagio`.
- `src/shared/math` (`Vec3`, `Quat`).
- `src/shared/modelos3d` (leitura do arquivo do modelo).

### Fora do escopo
- O corpo físico e o colisor do dado: `arremesso`.
- Importar, calibrar, salvar e excluir dados do jogador: `meus-dados`.
- Notação e apelidos do chat: `selecao`.
- A pose do dado no voo e o número em destaque: `vitrine`.

## Dados de que é dono
- O catálogo de tipos importados registrados (o `Map` de `src/dice/custom.ts:43-44`, unificado).
- Os caches de poliedro, de símbolo e de modelo carregado. O `forgetModel` passa a ser chamado por `removerTipo` (só libera memória; não muda nada que o jogador veja).

## Origem do código

| De | O quê |
|---|---|
| `src/dice/polyhedra.ts` | tudo, exceto `MAX_DICE` (que vai para `regras`). Separar tipos, construtores e catálogo para desfazer o ciclo com `custom.ts` |
| `src/dice/custom.ts` | registro, `inkColorOf`, `finishOf`, `INK_COLORS`, `customKind`. O tipo `CustomDie` vira `TipoImportado` aqui; o registro salvo é de `meus-dados` |
| `src/dice/read.ts`, `src/dice/symbols.ts` | tudo |
| `src/dice/notation.ts:11-15` | `dieName` → `nomeDoTipo` |
| `src/dice/importer.ts:332-380, 461-495` | `dentTester`, `inkTriangles`, `modelObject`, `markInk`, `hasTexture`, `forgetModel` |
| `src/physics/world.ts:23` | `MAX_RADIUS` → `RAIO_MAXIMO` |
| `src/scene/Die.tsx` | tudo, menos o `RigidBody`, o colisor, o `register` e a posição inicial (que ficam no legado até o `arremesso`) |
| `src/dice/omen.ts` | `isD20` passa a ser `paraRegras(kind) === 'd20'`; o `Set` `omenD20s` deixa de existir |

**Pontos de chamada a trocar:** todos os importadores de `polyhedra`, `custom` (registro), `read`, `symbols` e `Die` (ver `docs/diagnostico/grafo-imports.md`, §4). Os testes de `polyhedra`, `read`, `symbols` e `custom` (a parte de aparência) movem para o módulo. O E2E `e2e/screens.spec.ts` importa `polyhedra`/`world`: atualizar o caminho.

## Critérios de aceite da extração
- Nenhum arquivo fora de `dados` lê o registro de importados diretamente.
- `omenD20s` não existe. O teste de presságio com d20 importado com e sem opt-in passa.
- O ciclo `custom ↔ polyhedra` sumiu (teste de arquitetura).
- Testes de `polyhedra`, `read` e `symbols` no módulo, sem mudar asserções.
- Os chunks sob demanda `importer` e `ImportDie` continuam saindo no `vite build`.
- O gate completo passa (E2E: `smoke`, `roll`, `screens` e `import` são os que exercitam este módulo).
