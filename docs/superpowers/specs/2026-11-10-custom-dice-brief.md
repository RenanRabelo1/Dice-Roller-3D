# Brief: dados personalizados (Vampiro d10 + Bola de fogo d6)

Autor: Claude (sessão `diceroller-e2`), para o agente Fable da sessão `diceroller-8b`. Data: 2026-11-10.
Projeto: `C:\Users\renpo\Downloads\Aplicacoes\DiceRoller`, branch `feat/dice-3d`. Último commit: `e3809f0`.

## O que o usuário pediu

1. Poder escolher um **d10 de Vampiro: A Máscara**: funciona como um d10 normal (resultado 1 a 10), mas com a aparência do dado real de VtM.
2. Poder escolher **d6 de Bola de fogo** (o dano da magia Fireball de D&D é 8d6): funciona como d6 normal, com visual de fogo.
3. Os dois entram como opções extras; os dados normais continuam iguais.

## Pesquisa: como são os dados reais

**Vampiro: A Máscara 5ª edição** (sets oficiais Modiphius e Renegade): um conjunto traz d10 **pretos** normais (13 no set da Modiphius) e d10 **vermelhos de Fome** (5). As faces usam símbolos, não números:

| Face | d10 normal (preto, símbolos vermelhos) | d10 de Fome (vermelho, símbolos pretos) |
| --- | --- | --- |
| 1 | vazia | **caveira** (falha bestial) |
| 2–5 | vazia | vazia |
| 6–9 | **ankh** (sucesso) | **ankh** (sucesso) |
| 10 | **símbolo de crítico** (ankh destacada) | **crítico sangrento** (presas) |

Regras (contexto, não é preciso implementar a contagem): 6+ é sucesso, cada par de 10 vale crítico, 1 num dado de Fome numa rolagem que falhou é falha bestial, 10 num dado de Fome num crítico é crítico sangrento.
Recomendação: entregar **as duas variantes** (normal e Fome), já que uma rolagem real de VtM usa as duas. O custo é o mesmo mecanismo duas vezes.

**Bola de fogo**: o set oficial "D&D Adventure Dice: Fireball" (Sirius Dice) tem 8 d6 cor de chama (laranja, vermelho, amarelo).

**Direitos:** não copie logotipos nem arte oficial (o ankh estilizado da V5, os ícones de classe de D&D). Use desenhos próprios e genéricos: ankh, caveira, presas e chama simples.

## Como o código está hoje (leia antes de mexer)

- `src/dice/polyhedra.ts`: `Shape`/`DieKind` (hoje iguais: d4…d100), `KINDS` (ordem da UI e da ordenação), `RADIUS`, `polyhedron(shape)` (memoizado), `sortDice`, `MAX_DICE = 10`. O d10 tem faces com dígitos 0–9 (0 = 10). `labelList` tem um rótulo por face, com `value` e `text`.
- `src/dice/read.ts`: `readUp`, `toResults(dice, raw)` (d10: 0 → 10).
- `src/dice/notation.ts`: `parseDice` (aceita `2d10 + d100` e o compacto `2d10d100d4`, com backtracking), `formatDice`.
- `src/physics/presim.ts`: simula o arremesso inteiro offline (Rapier) e grava a trajetória; `dice.map(polyhedron)`.
- `src/scene/Die.tsx`: `GEM` (cor por tipo), `INK` (cor dos números por tipo), `FONT`/`FONT_URL`. Um `BatchedText` por dado = 1 draw call (foi a correção de performance principal; **não volte para um `Text` por número**).
- `src/scene/Hand.tsx` + `src/scene/highlight.ts` + `src/scene/showcase.ts`: depois que os dados param, o número sorteado sobe sobre o dado, o dado voa para a câmera com a face sorteada virada para ela, e o número brilha. Tudo localiza a face com `labelList.find((l) => l.value === raw)`.
- `src/ui/Controls.tsx` (botões por tipo, + e −), `src/ui/Chat.tsx` (chat lateral, tecla C), `src/store.ts` (`dice: DieKind[]`, `addDie`/`removeDie`/`setDice`), `src/testHook.ts` (`window.__dice` só no modo `test`).

## Desenho recomendado (o menor que resolve)

1. **Tipos novos** em `DieKind`: `'vtm'` (d10 Vampiro), `'hunger'` (d10 Fome), `'fire'` (d6 Bola de fogo). Um mapa `BASE: Record<DieKind, Shape>` (`vtm`→`d10`, `hunger`→`d10`, `fire`→`d6`) decide geometria, colisor, raio, numeração e leitura. Os valores das faces continuam os do dado base, então a leitura, a física, a apresentação e o painel funcionam sem mudança.
2. **Resultados:** `toResults` trata `vtm`/`hunger` como d10 (0 → 10) e `fire` como d6.
3. **Faces de símbolo** (vtm/hunger): o texto do rótulo vem de uma tabela por valor (ver a tabela acima). Mantenha um rótulo por face, inclusive nas vazias, para o `find` da apresentação continuar achando a face. A fonte Bricolage não tem ☥ nem caveira. Recomendo desenhar os 4 símbolos como **formas vetoriais próprias** (SVG path → `ShapeGeometry`, mescladas numa única geometria por dado, 1 draw call). A alternativa é uma fonte local OFL com esses glifos (Noto Sans Symbols / Symbols 2, via @fontsource, copiando o arquivo e a licença para `public/fonts/` como já foi feito com a Bricolage); nesse caso, confira se os glifos existem de fato.
4. **Número que sobe (destaque):** em face com símbolo, suba o símbolo; em face vazia, suba o valor numérico (para o destaque nunca ficar vazio).
5. **Visual:** `vtm` em gema preta (~`#141012`) com símbolos vermelhos (~`#C8102E`); `hunger` em vermelho-sangue (~`#8E0F1C`) com símbolos pretos; `fire` em laranja-chama (~`#E8571B`) com números amarelo-claros e um leve `emissive` laranja. Nada de gradiente decorativo na UI; no material 3D vale.
6. **UI:** botões novos com rótulo claro ("d10 Vampiro", "d10 Fome", "d6 Fogo"), com + e − como os outros. Confira em 390 px de largura (a barra do topo já quebra em linhas).
7. **Chat/notação:** aceite `2d10v`, `2d10vampiro`, `2d10fome`, `8d6fogo` (e o compacto `2d10v1d10fome`); aceite também a frase `bola de fogo` → 8 dados `fire`. `formatDice` escreve, por exemplo, "2d10 Vampiro + 1d10 Fome".

## Restrições (obrigatórias)

- **ponytail:** a menor mudança completa; nada além do pedido.
- **Performance:** continuar a 60 FPS com 10 dados (meça como antes: Chrome real, d20×10 e d100×10); 1–2 draw calls por dado.
- **Gravação atômica de arquivos** (temporário + rename) ou só a ferramenta Write/Edit. Um script que truncou um arquivo deixou o Vite servindo o `Hand.tsx` vazio, e a tela ficou branca. Depois de editar, confira que `curl http://localhost:5173/src/<arquivo>` não vem vazio.
- **Testes primeiro** (superpowers TDD):
  - unitários para `parseDice` (aliases + "bola de fogo"), `toResults`, `polyhedron('vtm')` (10 faces, rótulos por valor);
  - E2E: escolher dados de Vampiro pelo chat, rolar, e conferir que o valor no painel é o da face mostrada. Ajuste o gancho `labels()` para devolver o `value`, porque o texto agora pode ser um símbolo.
- **Gate antes de cada commit:** `npm run build`, `npm run lint` (sem avisos), `npm test`, `npx playwright test e2e/smoke.spec.ts e2e/roll.spec.ts e2e/chat.spec.ts`.
- **Git:** commits locais na `feat/dice-3d`, com a mensagem terminando em `Co-Authored-By: <seu modelo> <noreply@anthropic.com>`; **sem push**.
- UI e mensagens em português do Brasil.

## Ao terminar

Responda à sessão `diceroller-e2` com:
- os commits;
- os resultados do gate;
- as capturas que você conferiu;
- o que ficou de fora.
