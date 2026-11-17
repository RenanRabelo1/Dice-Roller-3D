# Ordem de serviço: arremesso, a luz da carga no perfil leve

Ordem: OS-0064 (HUD imersivo, parte 3, ordem 3 de 5)
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/**`

Objetivo:
- No perfil leve, a luz da carga não é montada. No completo, nada muda.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), parte 3
- [docs/adr/0011-perfil-leve.md](../adr/0011-perfil-leve.md)
- A ordem que criou a luz, a OS-0057, em `docs/ordens/`
- O `CLAUDE.md` do módulo e `scene/MaoDoArremesso.tsx`
- `src/shared/plataforma/index.ts` (`perfilLeve`, da OS-0062)

Decisões do orquestrador:

1. **A luz no perfil:** no JSX do `MaoDoArremesso`, a `<pointLight>` passa a ser `{!perfilLeve() && <pointLight … />}`. No `useFrame`, o trecho da luz roda só se `luz.current` existir (troque o `luz.current!` por uma checagem). A regra "sem `&&` em volta da luz" da OS-0057 é revogada aqui de propósito: o perfil é fixo durante a sessão, então a luz monta ou não monta uma vez só.
2. **Nada mais muda:** a regra pura, a cor, a posição, o tremor e o tratamento de software ficam como estão. No completo, o comportamento é idêntico ao de hoje.
3. **Docs do módulo:** no `CLAUDE.md`, a frase "montada sempre" da luz vira "montada sempre no perfil completo; não monta no leve (ADR 0011)".
4. **Teste:** se o módulo já tem teste de componente que renderiza esse arquivo, acrescente o caso leve. Se não tem, não crie infraestrutura: o `hud.spec.ts` (contagem de luzes por perfil, OS-0062) cobre.

Entregáveis:
1. A condição de montagem.
2. A doc do módulo.

Critérios de aceite:
- `git diff --stat` só em `src/modules/arremesso/**`.
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam.
- **Sem E2E no dev.**

Fora do escopo:
- Qualquer outra luz e qualquer efeito do perfil completo.

Se precisar de algo fora disso: pare e reporte. Não implemente.
