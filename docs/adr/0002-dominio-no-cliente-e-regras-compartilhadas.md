# ADR 0002: O domínio mora no cliente; as regras que o servidor usa formam um módulo puro

Status: proposto (aguarda o responsável humano)

## Contexto

O guia supõe a regra de negócio no `service.ts` do backend e um frontend fino. Neste projeto, verificado no código, é o contrário:

- O jogo inteiro roda no navegador, sem rede. Seleção, arremesso, física, leitura do resultado, presságios, dados importados e mesa são todos do cliente. A API de histórico é opcional: sem `VITE_API_URL`, o cliente não manda nada (`src/api/history.ts:31`).
- O servidor não decide nenhuma regra própria. Ele **recalcula** com as regras do jogo o que guarda (total, presságio, faces válidas), para o cliente não conseguir inventar um crítico (`server/src/rules.ts:20-28`). Para isso importa do cliente `src/dice/kinds.ts` (`BASE`, `KINDS`, `SIDES`, `FREE_VALUES`, `CUSTOM_BASES`, `isCustom`) e `src/dice/omen.ts` (`omenOf`, `omenKind`, `OmenKind`), em `server/src/app.ts:3`, `rolls.ts:2-3` e `rules.ts:1-2`.
- Por isso esses dois arquivos importam com extensão `.ts` e não podem depender de `three`, porque o servidor roda TS direto no Node (`docs/contexto/dados.md`).
- O acoplamento fica escondido em três pontos:
  - `omen.ts` lê um registro mutável, `omenD20s` (`kinds.ts:21`), que o registro de dados importados do cliente preenche;
  - a soma do total (moedas não somam) está duplicada: `resultText` em `src/dice/notation.ts` no cliente e `score` em `server/src/rules.ts:27` no servidor;
  - a faixa de valores válidos de cada dado só existe no servidor (`range`, `rules.ts:12`).

## Decisão

1. **Os módulos de domínio são do cliente.** A metade "frontend" de cada módulo guarda as regras em `domain/`, que faz o papel do `service.ts` do guia. Componentes React e R3F continuam sem regra de negócio.
2. **As regras do jogo de que o servidor precisa formam o módulo `regras`**, em `src/modules/regras/`. É um módulo de negócio, não `shared/`: contém regra, e a regra 5 proíbe regra em `shared/`. Ele:
   - é puro: não importa nada de fora dele (nem `three`, nem React, nem estado), usa só sintaxe apagável e imports relativos com extensão `.ts`;
   - é dono do catálogo de tipos de dado (tipos, bases, faces, faixa da forma livre) e das regras de pontuação (faces válidas por dado, total, crítico/falha/dualidade);
   - **não tem estado**. O registro `omenD20s` sai dele: `omenOf` passa a receber os tipos já normalizados (um d20 importado que conta para presságio chega como `'d20'`), como o servidor já faz em `rules.ts:26`. Quem normaliza no cliente é o módulo dono dos dados importados.
3. **A soma do total e a faixa de valores válidos mudam para `regras`.** Cliente e servidor passam a chamar a mesma função, e a duplicação acaba.
4. **Sentido dos imports com o servidor.** `server/src/modules/historico/` importa **só** `src/modules/regras/index.ts`. Nenhum outro arquivo de `src/` pode ser importado pelo servidor, e o teste de arquitetura (ADR 0006) confere isso. Os módulos do cliente também dependem de `regras`, que não depende de ninguém. Não há ciclo.
5. **No servidor, o `service.ts` de `historico`** guarda o que é regra do próprio histórico (o que se grava de cada dado, a paginação) e chama `regras` para a pontuação. As rotas ficam sem regra.

## Consequências

- O guia diz que o frontend importa do backend só tipos. Aqui também é o backend que importa do frontend, e importa valores. A exceção é uma só, para um módulo puro e sem dependências, e o teste de arquitetura a vigia.
- `regras` vira o módulo que todos consomem. O guia alerta para isso ("módulo que todos consomem e não para de crescer"). Por isso o critério de entrada é estreito: só vai para `regras` o que o servidor também precisa para validar ou pontuar um arremesso. Geometria, leitura da face, notação e duração das animações ficam nos módulos de domínio do cliente.
- As durações dos presságios (`OMEN_MS`, `omenMs`, `DUALITY_HIT`, hoje em `omen.ts`) são apresentação. Vão para o módulo que mostra o resultado, não para `regras`.

## Alternativas descartadas

- **Pôr as regras em `server/src/modules/regras/` e o cliente importar valores do servidor.** Inverte o sentido natural: o jogo funciona sem servidor, e o pacote opcional viraria dependência do principal.
- **Pacote de domínio num workspace npm.** É o desenho mais limpo, mas exige workspaces e ajuste dos dois `package.json`. Não compensa para cerca de 60 linhas de regras (ADR 0001).
- **Duplicar as regras no servidor.** Some a dependência e aparece o risco de o servidor e o jogo discordarem do que é um crítico, que é justamente o que o recálculo no servidor existe para impedir.
- **Mover para o servidor a decisão do resultado.** Contradiz o jogo sem rede.
