# Spec: `meus-dados`

Pasta: `src/modules/meus-dados/`. Extração nº 5.

## CLAUDE.md (formato final)

### Responsabilidade
Os dados que o jogador traz de arquivo `.stl` ou `.glb`: o assistente de importação (arquivo, forma, números, salvar), a calibração, a escolha de tinta e acabamento, a lista "Meus dados" (mudar a tinta, excluir) e a gravação no navegador. Cada dado salvo é entregue ao catálogo de `dados`, que é quem o torna jogável.

### Regras de negócio
- Arquivo `.stl` ou `.glb` de até 10 MB, 50 mil triângulos e texturas de 2048 px. GLB só aceita recursos `data:`/`blob:`.
- Detecção de dado padrão:
  - pega o menor N em {4, 6, 8, 10, 12, 20} cujas N maiores faces cobrem 60% ou mais da área;
  - a face seguinte precisa ter menos de 25% da menor delas, e a menor das N pelo menos 50% da maior;
  - fora no d4, toda face precisa de uma oposta (dot < −0,995).
  Se nada disso fecha, a mensagem é "Não reconheci um d4–d20" e o assistente oferece a forma livre.
- Sólido ideal: planos opostos simetrizados, cantos pela interseção de três planos, escala para `RADIUS[base]`. O colisor usa esse sólido, não a malha.
- Forma livre:
  - faces de apoio com 10% ou mais da área da maior, de 3 a 60, em até 3 passadas que descartam faces instáveis;
  - centro no centroide do volume, `readsDown`, fonte = 0,45 × menor inraio;
  - "não é justo" quando a maior face passa de 2× a menor (aviso, não erro).
- Shards (pontas em camadas de facetas): `TIER_DROP` 0,7. O padrão é "só as grandes valem resultado" (`withReadable`).
- Gravação detectada: vértices afundados > 1% do raio, longe das arestas; precisa de 8 ou mais e de 1% ou mais do total. O resultado só sugere a calibração.
- Calibração padrão: valores de 1 a N (d10 de 0 a 9, aceitando 10 no lugar de 0), cada valor uma vez. Livre: inteiros de −99 a 999, com repetição permitida. A oposta sugerida é `OPPOSITE_SUM − v`.
- Montagem do dado salvo:
  - `omens` só em base d20;
  - cor só em STL;
  - tinta só se `printed`; com textura, só escura ou nenhuma;
  - acabamento só em STL;
  - nome de 1 a 24 caracteres; apelido validado por `selecao.problemaDoApelido`.
- Ao salvar, o dado entra na mão se houver vaga.
- Salvar:
  - disco cheio (`QuotaExceededError`) recusa com mensagem e o dado não é registrado;
  - outra falha registra o dado só nesta sessão (`sessionOnly`, com aviso).
- Editar a tinta aplica na hora e salva depois; se a gravação falhar, vale só na sessão.
- Excluir pede confirmação, apaga o registro e remove o tipo do catálogo.
- Só registros `version === 1` são carregados, em ordem de `createdAt`.

### Expõe
- `carregar()`: lê o IndexedDB e registra cada dado no catálogo. A casca chama na montagem.
- `<MeusDados/>`: o grupo "Meus dados" (botões via `selecao.BotaoDeDado`, Tinta, 🗑, "Importar dado").
- `<AssistenteDeImportacao/>`: carregado sob demanda.
- `inspecao()`: os dados salvos (kind, id, nome, apelido, base, `printed`).

### Consome
- `dados`:
  - catálogo: `registrarTipo`, `removerTipo`, `tipos`;
  - sólido: `fromTriangles`, `RADIUS`, `OPPOSITE_SUM`;
  - aparência: `GemMaterial`, `usePainted`, `paintGlb`, `corDaGema`, `corDaTinta`, `inkTriangles`, `dentTester`, `carregarModelo`, `temTextura`.
- `selecao`: `adicionar`, `selecao`, `problemaDoApelido`, `sugerirApelido`, `BotaoDeDado`.
- `regras`: `CUSTOM_BASES`, `FREE_VALUES`, `MAX_DICE`.
- `src/shared/db`, `src/shared/modelos3d` (os limites do dado entram por parâmetro).

### Fora do escopo
- Como um dado importado é desenhado na mesa e como é lido: `dados`.
- A física: `arremesso`.
- O nome de exibição: `dados.nomeDoTipo`.

## Dados de que é dono
- IndexedDB, store `customDice` (`CustomDie` com `file.bytes`, `poly` numerado e `version: 1`).
- A lista "Meus dados" e o `sessionOnly` (hoje `store.customs`/`store.sessionOnly`).
- O estado do assistente.

## Origem do código

| De | O quê |
|---|---|
| `src/dice/importer.ts:1-31, 94-330, 382-459` | limites, erro, detecção padrão e livre, sólido ideal, `withReadable`, calibração, `importModel`. As linhas 33-92 (leitura do arquivo) vão para `src/shared/modelos3d`, e as 332-380 e 461-495 para `dados` |
| `src/dice/customStore.ts` | `repository.ts` |
| `src/dice/custom.ts:12-27` | o tipo `CustomDie` (registro salvo = `TipoImportado` + `createdAt`, `version`) |
| `src/store.ts:30-35, 77-114` | `customs`, `sessionOnly`, `loadCustoms`, `addCustom`, `updateCustom`, `removeCustom` |
| `src/ui/ImportDie.tsx`, `src/ui/InkChoice.tsx` | tudo. A montagem do `CustomDie` (`:254-274`) vira uma função pura em `domain/`, com teste |
| `src/ui/Controls.tsx:11-27, 46-48, 63-66` | `InkButton`, excluir, grupo "Meus dados", abrir a importação |

**Pontos de chamada a trocar:**
- `App.tsx` (`loadCustoms`);
- o test hook (`customs`);
- `tests/importer.test.ts`, `tests/custom.test.ts` e `tests/helpers/models.ts`. O `models.ts` é compartilhado com os E2E de importação e continua em `tests/helpers`, importando do `index.ts` do módulo.

## Critérios de aceite da extração
- A regra de montagem do `CustomDie` (`omens` só d20, tinta com textura, cor e acabamento só em STL) está numa função pura testada. O componente só a chama.
- A regra "com textura, só escura ou nenhuma" existe num lugar só.
- Ninguém fora do módulo acessa a store `customDice`.
- Os testes do importador passam no módulo, sem mudar asserções. Os E2E `import` passam sem alteração.
- O chunk sob demanda do assistente continua existindo.
- O gate completo passa.
