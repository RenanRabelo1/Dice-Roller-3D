# Ordem de serviço: regras, sem o d6 Fogo e com o presságio de vampiro

Ordem: OS-0090 (demanda de 2026-11-18: animações de Vampiro e retirada do dado de fogo)
Módulo: `regras`
Escopo de escrita:
- `src/modules/regras/**`

Objetivo:
- O tipo de dado `fire` (d6 Fogo, "Bola de fogo") deixa de existir.
- Uma regra pura nova diz se o resultado de um arremesso tem um presságio de vampiro, e qual.

Leia antes de começar:
- `src/modules/regras/CLAUDE.md`, `contracts.ts`, `domain/catalogo.ts`, `domain/pressagio.ts`
- `src/modules/dados/domain/solidos.ts`, linhas `vtm`/`hunger`: o valor 10 do d10 é a face de símbolo (`crit` no Vampiro, `fangs` na Fome); o 1 da Fome é a `skull`

Decisões do orquestrador (mudança de contrato aprovada):

1. **Sai o `fire`.**
   - Sai de `BuiltinKind`, `KINDS` e `BASE`, e dos comentários que citam o "Fireball d6".
   - Nada mais muda no catálogo.
   - O servidor importa `KINDS`. Por isso, a partir daqui, a API recusa um `fire` novo; o histórico antigo continua no banco.
2. **Tipos novos em `contracts.ts`** (só acréscimo):
   ```ts
   // The Vampire: The Masquerade omens. 'par-de-criticos': two or more d10 Vampiro (vtm) on 10 (the ankh in a ring);
   // 'critico-bestial': a d10 Fome (hunger) on 10 (fangs); 'falha-bestial': a d10 Fome on 1 (skull).
   export type TipoVampiro = 'par-de-criticos' | 'critico-bestial' | 'falha-bestial';
   export interface PresagioVampiro { tipo: TipoVampiro; dados: number[] } // die indices the show carries
   ```
3. **Regra nova** em `domain/pressagio.ts`: `presagioVampiro(kinds, results): PresagioVampiro | null`, exportada pela porta.
   - Com `omenOf(kinds, results)` não nulo, devolve `null`. O presságio de d20/d100 tem prioridade e só um presságio toca por arremesso.
   - Prioridade entre os de vampiro: `critico-bestial` > `par-de-criticos` > `falha-bestial`.
   - `critico-bestial`: `dados` = [índice do **primeiro** `hunger` com 10].
   - `par-de-criticos`: exige ao menos dois `vtm` com 10. `dados` = os índices dos **dois primeiros**. Um só não conta, porque vale 1 sucesso. O `hunger` com 10 não entra no par.
   - `falha-bestial`: `dados` = [índice do primeiro `hunger` com 1].
   - Os `kinds` chegam como em `omenOf` (o literal `vtm`/`hunger`). Dado importado nunca dispara presságio de vampiro.
4. `omenOf`, `omenKind`, `Omen` e `OmenKind` **não mudam**. O servidor continua gravando só crit/fumble/duality.

Entregáveis:
1. O catálogo sem `fire`, com os testes do módulo ajustados (`catalogo.test.ts`, `pontuacao.test.ts`, `pressagio.test.ts`).
2. `presagioVampiro` com os tipos, exportada no `index.ts`, e testes que cobrem:
   - cada tipo;
   - um só `vtm` 10 (null);
   - três `vtm` 10 (dois índices);
   - `vtm` 10 + `vtm` 10 + `hunger` 10 (bestial);
   - `hunger` 1 + par (par);
   - com um d20 = 20 junto (null).
3. O `CLAUDE.md` do módulo atualizado: a regra nova, e o catálogo sem o Fogo.

Critérios de aceite:
- `npx vitest run src/modules/regras` passa.
- O `npm run build` geral só fecha depois das OS-0091 a OS-0093, que adaptam os consumidores. Elas vêm juntas nesta mesma entrega, então rode o gate completo ao fim da OS-0093.

Fora do escopo:
- A aparência, a notação e o histórico do Fogo: ficam com as OS-0091 a OS-0093.
- O efeito visual: OS-0094 a OS-0097.

Se precisar de algo fora disso: pare e reporte. Não implemente.
