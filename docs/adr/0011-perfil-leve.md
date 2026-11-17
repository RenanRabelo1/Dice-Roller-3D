# ADR 0011: Perfil leve em `shared/plataforma`

Status: aceito pelo responsável humano em 2026-11-16, ao pedir "uma versão low para a pessoa conseguir rodar suave, sem afetar a versão high" (parte 3 do [HUD imersivo](../hud-imersivo.md)).

## Contexto

A parte 2 do HUD imersivo acrescentou três luzes pontuais decorativas: a vela (`mesa`), a carga (`arremesso`) e o destaque (`vitrine`). A regra de armadilhas.md proíbe mudar o número de luzes durante o uso, porque isso recompila o shader de todos os dados. Por isso as luzes ficam sempre montadas e se apagam com intensidade 0.

Só que intensidade 0 não economiza nada na GPU: o shader de cada material continua calculando todas as luzes em cada pixel. Em aparelho fraco, isso derrubou o orçamento de quadro. O `coin-software.spec.ts`, que simula um aparelho sem placa de vídeo, passou a falhar.

Hoje, `renderizadorPorSoftware()` só é marcado no `useLayoutEffect` do `Cena`. Isso acontece depois que as luzes montam e logo antes do `Show.compile`. Tarde demais para decidir se a luz monta.

## Decisão

1. **`shared/plataforma` ganha o perfil:** `perfil(): 'completo' | 'leve'` e `perfilLeve(): boolean`, exportados pela porta (`index.ts`).
2. **Decidido uma vez, antes do `<Canvas>`.** O teste de WebGL (`webgl.ts`, que já roda no `useState` do `App`) passa a guardar o nome do renderizador. O perfil é calculado na primeira chamada e não muda mais durante a sessão.
3. **Critério conservador** (na dúvida, completo):
   - `?perfil=` no endereço manda;
   - renderizador por software → leve;
   - `deviceMemory <= 2` → leve;
   - `deviceMemory <= 4` e `hardwareConcurrency <= 4` → leve.
4. **Cada módulo dono de luz decorativa** lê `perfilLeve()` e não monta a luz no leve. Como o perfil é fixo, o número de luzes continua constante durante o uso.
5. **A casca escreve `data-perfil` no `.app`.** O CSS pode usar esse atributo; nenhum módulo lê o atributo.

## Consequências

- O perfil completo não muda.
- No leve, a cena volta a ter só a luz do presságio entre as pontuais.
- Os E2E rodam em SwiftShader e caem no leve. O `?perfil=completo` mantém a cobertura das luzes do completo.
- Um aparelho médio com pouca memória pode cair no leve e perder os três brilhos quentes. É o risco aceito.
- `shared/` continua sem regra de negócio: o perfil é uma medida da plataforma, como o renderizador por software e o movimento reduzido.

## Alternativas descartadas

- **Trocar de perfil durante o uso** (por exemplo, quando o `PerformanceMonitor` derruba o DPR): recompilaria todos os shaders no meio da sessão, o travamento que armadilhas.md proíbe.
- **Cortar as luzes para todo mundo:** contraria a regra do João de não mexer na versão completa.
- **Cada módulo detectar o aparelho sozinho:** três critérios divergentes para a mesma pergunta. A plataforma é a dona natural.
