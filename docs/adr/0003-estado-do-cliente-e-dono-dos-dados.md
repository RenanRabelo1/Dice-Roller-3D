# ADR 0003: Como a regra 2 (dono dos dados) vale para o estado do cliente

Status: proposto (aguarda o responsável humano)

## Contexto

A regra 2 fala de tabelas. Neste projeto quase todo o dado mora no navegador. Verificado no código:

- **Um store zustand único**, `useDice` (`src/store.ts`), com 18 campos de sete domínios: seleção, dados importados, gesto, resultado, presságio, apresentação e plataforma. Ele é importado por 13 arquivos. Ações como `selection()`, `publish`, `removeCustom`, `input` e `setReducedMotion` escrevem campos de vários domínios num único `set` (diagnóstico, §6).
- **Um segundo store zustand**, `useTable` (`src/scene/tableState.ts`), cujo campo `colors` tem dois escritores (`tableState` e `Tray.tsx:37`).
- **Registros mutáveis de módulo** que funcionam como tabela: o `Map` de dados importados e o de sólidos (`src/dice/custom.ts:43-44`), e o `Set` `omenD20s` (`src/dice/kinds.ts:21`). Componentes e o cliente da API leem esses registros direto, por fora do store.
- **Estado compartilhado por ref**: o registro de corpos (`bodies` em `Stage.tsx:134`) é escrito por `Die` e lido por `ThrowLoop`, `Hand`, `Omens` e pelo test hook.
- **Persistência**: o IndexedDB `dice-roller` v2, com as stores `customDice` e `tables`, aberto num arquivo comum, e o `localStorage` com as chaves `mesa.ativa` e `diceroller.player`.

## Decisão

1. **Tudo o que guarda estado conta como tabela**: campo de store, store do IndexedDB, chave do `localStorage`, registro ou cache mutável de módulo, ref compartilhada entre componentes e coleção do MongoDB. Cada um tem um único módulo dono, listado em `docs/mapa-modulos.md`.
2. **Um store por módulo, privado.** O módulo que tem estado reativo cria o próprio store em `src/modules/<m>/store.ts`. Esse arquivo não sai do módulo: o `index.ts` não o reexporta.
3. **Leitura por função ou hook exposto**: `fase()`, `useFase()`, `selecao()`, `presagioTocando()`. Nunca pelo store do outro módulo, nem com `getState()`, `subscribe()` ou seletor.
4. **Escrita só por comando do dono**: `selecao.adicionar(kind)`, `meusDados.salvar(die)`, `plataforma.registrarFalha('physics')`. O dono valida e decide. Quando a mudança de um módulo deve mudar o estado de outro (trocar a seleção reinicia o arremesso; publicar o resultado dispara o presságio), o primeiro publica um evento e o segundo atualiza o próprio estado (ADR 0005). Nenhuma ação escreve em dois módulos.
5. **Persistência é privada do dono.** O IndexedDB e o `localStorage` são acessados só no `repository.ts` do módulo dono, por meio de `src/shared/db` (abertura do banco e atualização de versão, ADR 0008). Cada store e cada chave pertencem a um módulo.
6. **Os registros duplicados viram um registro com dono.** O catálogo de tipos jogáveis fica em `dados`. Os registros salvos dos importados ficam em `meus-dados`, que avisa o catálogo quando salva, edita ou exclui. O `store.customs` (cópia do registro) deixa de existir como dado separado: a lista "Meus dados" é estado de `meus-dados`. O `omenD20s` deixa de existir (ADR 0002).
7. **O `window.__dice` dos testes** é montado pela casca a partir de uma função de inspeção de cada módulo (`inspecao()` no `index.ts`, ativa só com `MODE === 'test'`). O test hook não lê store nem procura objeto de cena por nome de outro módulo.
8. **"Join" no cliente** é montar uma resposta lendo o estado de dois módulos. Quem precisa dos dois chama a função exposta de cada um, como `vitrine` faz ao ler o resultado do `arremesso` e o presságio de `pressagios`. Nenhum módulo expõe o estado de outro.

## Consequências

- O `useDice` some aos poucos, módulo a módulo, durante a extração (fase 5). Enquanto houver campos de módulos ainda não extraídos, ele continua no legado. Um módulo extraído não lê o `useDice` direto: a casca liga o legado ao módulo por função, e isso fica registrado na ordem de serviço.
- A garantia de "um retrato só" do `publish` passa a depender da entrega síncrona dos eventos (ADR 0005). A rede de segurança precisa cobrir isso: o resultado nunca aparece antes do presságio.
- `omenPlaying` (hoje em `store.ts`) é regra de apresentação. Passa a ser `pressagios.presagioTocando()`.
- O teste de arquitetura (ADR 0006, parte B) confere os pontos 2 e 5.

## Alternativas descartadas

- **Manter um store global com "fatias" por módulo** (padrão slices do zustand). Isso mantém um objeto que todos podem ler e escrever. A regra 2 só existiria por convenção, e o teste de arquitetura não conseguiria distinguir uma fatia da outra.
- **Store global só para leitura, com escrita por comandos.** É mais trabalho que um store por módulo e ainda deixa todo leitor ver todo o estado.
- **Tratar o estado do cliente como fora da regra 2.** O inventário mostra que é justamente ali que os domínios se misturam hoje.
