# Ordem de serviço: vitrine, o percurso do vampiro

Ordem: OS-0096 (consumidor da OS-0095)
Módulo: `vitrine`
Escopo de escrita:
- `src/modules/vitrine/**`

Objetivo:
- Os dados que o vampiro carrega seguem o percurso do presságio (`movimentoNoPresagio`) em vez do voo comum.
- Ao fim, ficam na pose do resultado, como o d100 do kraken.

Leia antes de começar:
- `src/modules/vitrine/CLAUDE.md`, `scene/Vitrine.tsx`, perto da linha 110 (`indicesComPercurso`) e da 175 (`movimentoNoPresagio`)
- `src/modules/pressagios/index.ts`: as assinaturas novas de `indicesComPercurso` e `movimentoNoPresagio`, com o parâmetro `vampiro` (OS-0095)

Entregáveis:
1. Em `Vitrine.tsx`:
   - pegue `state.vampiro` quando for do `throwId` atual;
   - passe-o a `indicesComPercurso` e guarde o `vampiro` devolvido em `showcase.current`;
   - passe-o a `movimentoNoPresagio`.
   - O resto do percurso (`sombraNaGema`, `revela`, `fim`) já é genérico.
2. Painel: nenhum `data-presagio` novo. O vampiro não é crit/fumble/duality, e o painel já espera pelo `presagioTocando()`.
3. Um teste do módulo de que um índice do vampiro não entra no voo comum, se a estrutura atual permitir testá-lo sem a cena. Se não permitir, diga por quê.
4. `CLAUDE.md` do módulo: "o d100 do kraken ou da tempestade e os dados que o vampiro carrega".

Critérios de aceite:
- `npm run build && npm run lint && npm test` passam.

Fora do escopo:
- Qualquer mudança no voo comum.

Se precisar de algo fora disso: pare e reporte. Não implemente.
