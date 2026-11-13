# ADR 0005: Barramento de eventos

Status: aceito (o responsável humano autorizou o plano em 2026-11-13; ver `docs/plano-refatoracao.md`)

## Contexto

A regra 4 manda trocar por eventos as chamadas em ciclo entre módulos. Hoje não há barramento: os módulos reagem uns aos outros escrevendo no mesmo store zustand (`src/store.ts`) ou assinando o store inteiro. Exemplos verificados no código:

- `App.tsx:26` assina `useDice` e chama `saveRoll` quando `results` muda (histórico reage ao resultado).
- `store.ts:51` (`selection()`): trocar a seleção também zera o arremesso (fase, `throwId`, `launch`, `results`).
- `store.ts:140` (`publish`): publicar o resultado também calcula e grava o presságio no mesmo `set`, para os assinantes verem um só retrato do estado.

Os eventos acontecem no navegador, num único processo. Os que importam são síncronos com o quadro: um `throwId` descartado, um `publish` atrasado e o fim de um presságio são comparados com o estado atual no mesmo tique (ver `docs/contexto/armadilhas.md`, "throwId guarda tudo").

No servidor há um único módulo (histórico), sem nenhuma reação entre módulos.

## Decisão

**Cliente:** um sinal tipado, síncrono e em memória, em `src/shared/events.ts`:

```ts
export interface Signal<T> { emit(payload: T): void; subscribe(listener: (payload: T) => void): () => void }
export function createSignal<T>(): Signal<T>
```

- Quem publica é dono do sinal: cria a instância dentro do módulo, declara o tipo do payload no `contracts.ts` e expõe só `subscribe` no `index.ts`. O `emit` fica interno.
- Quem consome importa o `index.ts` de quem publica. A dependência vai do consumidor para o publicador, e o publicador não conhece quem o escuta. É assim que o ciclo some.
- A entrega é síncrona, na ordem de inscrição, dentro do mesmo tique de quem emite. Um ouvinte que lança erro é isolado (`try/catch` com `console.error`) e não interrompe o publicador nem os outros ouvintes. Isso preserva a garantia atual de que o histórico nunca atrapalha o jogo.
- O `shared/events.ts` não conhece nenhum evento concreto: não há mapa global de eventos em `shared/`, porque ele dependeria dos módulos.

**Servidor:** nenhum barramento por enquanto. Quando surgir um segundo módulo de backend que precise reagir a outro, um novo ADR define o barramento (o candidato é `node:events` tipado em `server/src/shared/events.ts`).

Os eventos concretos estão em `docs/mapa-modulos.md`, e o payload de cada um vai no `contracts.ts` do módulo que o publica.

## Consequências

- O "retrato único" que o `publish` garante hoje passa a depender de ordem. Quem publica atualiza o próprio estado e depois emite, e os ouvintes atualizam o deles no mesmo tique síncrono. Como os componentes React e os `useFrame` só leem depois que a tarefa termina, nenhum quadro vê um módulo atualizado e o outro não. Os testes da rede de segurança devem cobrir isso: resultado e presságio aparecem juntos.
- O sinal é testável em Node, sem DOM.
- Ninguém assina o store de outro módulo (isso violaria as regras 1 e 2; ver ADR 0003).

## Alternativas descartadas

- **Assinar o store zustand do outro módulo.** É o que existe hoje, e expõe o estado interno (fere as regras 1 e 2).
- **`EventTarget`/`CustomEvent` do DOM.** É global, sem tipo e acopla pelo nome da string.
- **Entrega assíncrona (microtarefa).** Abriria uma janela entre o estado de quem publica e o de quem ouve, justamente onde o código depende de comparar `throwId` e fase no mesmo tique.
- **Biblioteca (mitt, nanoevents).** Pouparia umas 20 linhas, ao custo de uma dependência nova.
