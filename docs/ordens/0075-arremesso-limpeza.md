# Ordem de serviço: limpeza da auditoria, arremesso

Ordem: OS-0075 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/**`

Objetivo:
- Porta mais estreita, a álgebra de `shared/math`, o `clamp01` e uma função `corposVivos()` para a `vitrine` parar de copiar o `live`.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **Sem `export`** (Anexo A): `HandMotion` (`contracts.ts`), `SettleState` (`domain/settle.ts`), `Orbit` e `Whirl` (`domain/vortex.ts`) e `Box` (`domain/world.ts`).
2. **Fora da porta** (Anexo B):
   - `ChargeMode`, `GestureEvent`, `GestureState`, `HandMotion`, `Launch`, `Recording`, `RollResponse`, `UltimoLancamento`, `initialGesture`, `MATERIAL`, `BIAS_BUDGET`, `newWhirl`, `ORBITS`, `restingPlaces`, `spinAngle`, `stepWhirl` e `criarWorkerDePresimulacao`;
   - e os da última linha do Anexo B, trocando o import dos testes do módulo, se não houver consumidor de fora.
   - **Cuidado com o worker** (`presim.worker.ts`) e com o `src/app/Cena.tsx`: confira com `rg`.
3. **`domain/vortex.ts`:** as cópias de `cross`/`unit`/`dot`/`sub` saem e passam a vir de `shared/math` (OS-0072). Os testes de vórtice têm de passar sem mudança.
4. **`clamp01`** de `shared/math` no lugar de `Math.min(1, Math.max(0, …))` em `domain/luz.ts:8` e `domain/aim.ts:17`.
5. **`corposVivos()`:** o callback `live` do `MaoDoArremesso` (l.33-38) vira uma função do módulo.
   - Ela filtra o `registroDeCorpos` pelos corpos válidos da seleção atual e devolve a lista só se `ready` e se a contagem bate.
   - Fica num arquivo sem React, para poder sair pelo `index.ts`. O tipo do Rapier pode ser só `import type`.
   - O `MaoDoArremesso` passa a usá-la. A `vitrine` troca a cópia dela na OS-0081.
   - O texto da lógica não muda: é mover, não reescrever.
6. **`CLAUDE.md`:** a seção "Expõe", com `corposVivos` e a porta nova.

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
