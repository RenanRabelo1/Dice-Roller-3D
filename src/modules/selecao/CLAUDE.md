# Módulo `selecao`

Duas portas (ADR 0010): `index.ts`, puro e sem React (testes em Node), e `cena.ts`, com o hook e os componentes React. Tipos em `contracts.ts`, regras puras em `domain/` (`mao.ts`, `notacao.ts`), o estado em `store.ts` e os componentes em `ui/`. O hook mora em `ui/useSelecao.tsx` para os componentes o lerem sem importar `cena.ts` (sem ciclo).

## Responsabilidade
Quais dados estão na mão do jogador e como ele os escolhe: os botões de cada tipo (na roda), o chat com notação ("2d10 + d100") e o resumo da mão. Também define como um dado importado se chama no chat (apelido). É dono da mão: o store zustand vanilla de `store.ts`, escrito só por `adicionar`, `remover`, `definir` e pela reação ao catálogo.

## Regras de negócio
- A mão começa com `['d20']` (`MAO_INICIAL`) e tem de 1 a `MAX_DICE` dados, sempre ordenados por `sortDice` de `dados`.
- `adicionar` no máximo é recusado. `remover` tira a última ocorrência do tipo e nunca tira o último dado.
- `definir(dice)` descarta importados fora do catálogo, corta em `MAX_DICE` e recusa lista vazia.
- Toda chamada aceita emite `selecaoAlterada` (`{ dice }`), mesmo quando a mão não muda; a recusa não muda nada e não emite.
- Quando um tipo sai do catálogo (`catalogoAlterado` com `removido`), ele sai da mão e o módulo sempre emite, mesmo sem o tipo na mão. Se a mão esvaziar, volta a `['d20']`.
- A cópia `dice` no store do `arremesso` (`arremesso().dice`, `useArremesso`) é a dos dados do arremesso, alinhada com `results`, e não a mão: ela chega por `selecaoAlterada`. Para a mão, use `selecao()` ou `useSelecao()`.
- Notação (`parseDice`): ignora espaços, `+` e caixa. Aceita `2d10 + d100` e a forma compacta `2d10d100d4`.
  - Sufixos depois do `d`, do mais longo ao mais curto: `10vampiro`, `10fome`, `6fogo`, `10v`, `100`, `20`, `12`, `10`, `8`, `6`, `4` e cada `<faces><apelido>` importado (`20caveira`).
  - Dado de forma livre é escrito só com o apelido (`caveira`, `2caveira`), lido antes do `d`.
  - `boladefogo` = 8 × `fire`; `moeda` / `N moedas`.
  - Ambiguidade (`2d102d4`) se resolve por backtracking, preferindo a leitura em que todos os dados existem.
  - Mais de `MAX_DICE` dá erro. As mensagens de erro são em pt-BR.
- `formatDice(dice)` → `"2d10 + 1d10 Vampiro + 2 moedas"`.
- Apelido (`slugProblem`): `^[a-z][a-z0-9]{0,15}$`, não começa com `d` + dígito, não é palavra do chat (`v vampiro fome fogo moeda moedas boladefogo`) e é único. `slugOf(nome)` sugere um, sem acento e em minúsculas.
- Chat: é controlado pela casca (`Chat({ aberto, onAlternar, onFechar })`), que guarda o capítulo aberto do livro e tem o botão "Chat" (`.chat-toggle`). A tecla `C` (ignorada enquanto se digita ou com Ctrl/Meta/Alt/repeat) chama `onAlternar`; `Esc` e o × chamam `onFechar` (a casca devolve o foco ao botão). Enter/Aplicar só chama `definir` se a notação é válida. Mostra no máximo 20 linhas.
- Roda de dados (`RodaDeDados`): os dados embutidos num anel acima do botão da mão (`ResumoDaMao` + `D`). Começa aberta; a tecla `D` alterna (mesmos filtros do `C`); `Esc` não mexe nela; não lembra entre sessões.
- O DOM dos componentes (textos, `aria-label`, roles, classes) é contrato dos E2E e do CSS; `tests/componentes.test.ts` o compara com o cabeçalho de antes da extração (fixture).

## Expõe
- `index.ts`: `selecao()`, `adicionar(kind)`, `definir(dice)`, `selecaoAlterada` (só `subscribe`), `parseDice`, `formatDice`, `slugProblem`, `slugOf`. O `remover(kind)` fica interno (`store.ts`): a UI do módulo o usa, e os testes o importam de lá.
- Tipo (`contracts.ts`): `SelecaoAlterada`. O `LeituraDaNotacao` é interno (retorno de `parseDice`).
- `cena.ts`: `useSelecao()`; `<BotoesDeDados/>` (o `div.selection` "Dados" com `--n`, um `div.pick` com `--i` por tipo embutido); `<BotaoDeDado kind/>` (o par Adicionar/Remover como fragmento, sem o `div.pick`, que "Meus dados" monta); `<ResumoDaMao/>` (o `span.pool`); `<RodaDeDados/>` (a roda e o botão da mão); `<Chat aberto onAlternar onFechar/>` (só o `aside`, sem botão).

## Consome
- `regras`: `KINDS`, `MAX_DICE`, `isCustom` e os tipos de dado.
- `dados`: `allKinds`, `sortDice`, `customDie`, `customKind`, `customList`, `nomeDoTipo`, `baseOf`, `catalogoAlterado`.
- `src/shared/events` (`createSignal`).

## Fora do escopo
- O que acontece com o arremesso quando a mão muda: o `arremesso` reage a `selecaoAlterada` (o `store.ts` do `arremesso`).
- Importar, editar a tinta e excluir dados (`Importar dado`, `InkButton`, a lixeira): `meus-dados`.
- O texto do resultado (`resultText`), `RollMode` e a força: `vitrine` e `arremesso`.
- Renomear as funções para os nomes em português da spec (`lerNotacao`, `formatar`, `problemaDoApelido`, `sugerirApelido`).
