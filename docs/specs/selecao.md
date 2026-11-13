# Spec: `selecao`

Pasta: `src/modules/selecao/`. Extração nº 4.

## CLAUDE.md (formato final)

### Responsabilidade
Quais dados estão na mão do jogador e como ele os escolhe: botões de cada tipo, o chat com notação ("2d10 + d100") e o resumo da mão. Também define como um dado importado se chama no chat (apelido).

### Regras de negócio
- A mão começa com `['d20']` e tem de 1 a `MAX_DICE` dados, sempre ordenados por `dados.ordenar`.
- Adicionar no máximo não faz nada. Remover tira a última ocorrência daquele tipo e nunca tira o último dado.
- `definir(dice)` descarta importados que não estão no catálogo, corta em 10 e ignora lista vazia.
- Quando um tipo some do catálogo (`dados.catalogoAlterado`), ele sai da mão. Se a mão esvaziar, volta a `['d20']`.
- Notação: ignora espaços, `+` e maiúsculas. Aceita `2d10 + d100` e a forma compacta `2d10d100d4`.
  - Os sufixos depois do `d` são testados do mais longo para o mais curto: `10vampiro`, `10fome`, `6fogo`, `10v`, `100`, `20`, `12`, `10`, `8`, `6`, `4`, e cada `<faces><apelido>` importado.
  - Dado de forma livre é escrito só com o apelido (`caveira`, `2caveira`), lido antes do `d`.
  - `boladefogo` = 8 × `fire`; `moeda` / `N moedas`.
  - Ambiguidade (`2d102d4`) se resolve por backtracking, preferindo a leitura em que todos os dados existem.
  - Mais de 10 dados dá erro. As mensagens de erro são em pt-BR.
- Formatação da mão: `"2d10 + 1d10 Vampiro + 2 moedas"`.
- Apelido: `^[a-z][a-z0-9]{0,15}$`. Não pode começar com `d` + dígito nem ser palavra do chat (`v vampiro fome fogo moeda moedas boladefogo`), e precisa ser único. A sugestão sai do nome, sem acento e em minúsculas.
- Chat: tecla `C` abre e fecha (ignorada enquanto se digita ou com Ctrl/Meta/Alt), `Esc` fecha. Só aplica se a notação é válida. Mostra no máximo 20 linhas.
- Toda mudança na mão publica `selecaoAlterada`.

### Expõe
- `selecao()`, `useSelecao()`.
- `adicionar(kind)`, `remover(kind)`, `definir(dice)`.
- Evento `selecaoAlterada` (`{ dice }`).
- `lerNotacao(texto) → { dice } | { error }`, `formatar(dice)`.
- `problemaDoApelido(slug, outros)`, `sugerirApelido(nome)`.
- Componentes: `<BotoesDeDados/>` (embutidos), `<BotaoDeDado kind/>` (adicionar/remover um tipo, usado por `meus-dados`), `<ResumoDaMao/>` (`.pool`), `<Chat/>`.

### Consome
- `regras` (`MAX_DICE`, `KINDS`).
- `dados` (`tipos`, `ordenar`, `nomeDoTipo`, `baseDe`, `catalogoAlterado`).

### Fora do escopo
- O que acontece com o arremesso quando a mão muda: o `arremesso` reage a `selecaoAlterada`.
- Importar e excluir dados: `meus-dados`.
- O texto do resultado: `vitrine`.

## Dados de que é dono
- `dice` (a mão).

## Origem do código

| De | O quê |
|---|---|
| `src/store.ts:14, 36-38, 65, 68-76` | `dice`, `addDie`, `removeDie`, `setDice`. O `selection()` (`:51-57`) deixa de escrever no arremesso: no legado, o arremesso passa a assinar `selecaoAlterada` (o ajuste fica no `store.ts` legado) |
| `src/store.ts:110-113` | a parte "tira da mão" do `removeCustom` vira a reação a `catalogoAlterado` |
| `src/dice/notation.ts` | `parseDice`, `formatDice`, `slugProblem`, `slugOf`. `resultText` vai para `vitrine` e `regras`; `dieName` para `dados` |
| `src/ui/Chat.tsx` | tudo |
| `src/ui/Controls.tsx:35-45, 60-62, 67` | botões de dado, "−", `.pool` |

**Pontos de chamada a trocar:** `Stage.tsx` (lê `dice`), `Hand.tsx`, `Omens.tsx`, `Tray.tsx`, `OmenOverlay.tsx`, `ImportDie.tsx` (`addDie`, `dice.length`), `App.tsx` (histórico) e o test hook (`select`). Os testes de `tests/notation.test.ts` e a parte de seleção de `tests/store.test.ts` movem para o módulo.

## Critérios de aceite da extração
- Ninguém fora do módulo escreve a mão; o `arremesso` legado se reinicia por evento.
- A garantia de hoje se mantém: trocar a mão volta a fase para `hand`, faz `throwId++` e limpa lançamento, resultado e força, no mesmo tique. Há teste no módulo que cobre o evento e a rede de segurança (E2E `chat`, `roll`) que cobre o efeito.
- Os textos, `aria-label` e roles de botão continuam iguais (são contrato dos E2E).
- Testes de notação no módulo, sem mudar asserções.
- O gate completo passa.
