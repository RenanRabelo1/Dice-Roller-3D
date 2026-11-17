# Limpeza da auditoria (OS-0071 a OS-0081)

A [auditoria](auditoria-codigo.md) (OS-0066) achou código morto e repetido. O João aprovou a limpeza em 2026-11-16. Esta página tem as regras comuns às 11 ordens. O detalhe de cada uma está em `docs/ordens/`.

## Regras comuns (toda ordem da limpeza)

1. **Nenhum comportamento muda.**
   - Nada de animação, efeito, texto de interface, nome acessível ou regra de negócio.
   - Se apagar algo mudar o que o jogador vê ou faz, **não apague**: pare e reporte.
2. **Prove antes de apagar.**
   - A auditoria é de antes das OS-0062 a 0070, então rode de novo, para cada nome, `rg -nw <nome> src server/src tests e2e`.
   - Se aparecer consumidor fora do módulo, o nome fica, e você registra no relatório.
3. **Porta mais estreita** (Anexo B da auditoria):
   - tire do `index.ts` ou do `cena.ts` o que ninguém de fora usa;
   - se um teste **do próprio módulo** importa o nome pela porta, troque o import do teste para o arquivo interno, e o nome sai da porta.
4. **Export só interno** (Anexo A): tire o `export`, e o nome continua no arquivo.
5. **"Exportado só para teste"** (1.2, última linha da auditoria) **fica como está**: o teste precisa do gancho.
6. **Duplicação intencional** (seção 3 da auditoria) **fica como está.**
7. **O `CLAUDE.md` do módulo** (seção "Expõe") acompanha o que saiu da porta, no mesmo commit (regra 8 do `CLAUDE.md` da raiz).
8. **Gate do dev:** `npm run build && npm run lint && npm test` (e `npm run test:server` se tocar o `historico`). Sem E2E, sem servidor de dev. O orquestrador roda o E2E completo no fim.
9. **Commit:** um por ordem, `refac(<dono>): <resumo> [OS-00xx]`.

## Ondas

| Onda | Ordem | Dono | Depende de |
|---|---|---|---|
| 1 | [OS-0071](ordens/0071-casca-css-morto.md) | casca (`src/index.css`) | — |
| 1 | [OS-0072](ordens/0072-shared-math-e-plataforma.md) | `shared` | — |
| 1 | [OS-0073](ordens/0073-rede-esperas-e2e.md) | `e2e/` e `tests/helpers/` | — |
| 2 | [OS-0074](ordens/0074-mesa-limpeza.md) | `mesa` | OS-0072 |
| 2 | [OS-0075](ordens/0075-arremesso-limpeza.md) | `arremesso` | OS-0072 |
| 2 | [OS-0076](ordens/0076-pressagios-limpeza.md) | `pressagios` | OS-0072 |
| 2 | [OS-0077](ordens/0077-dados-limpeza.md) | `dados` | OS-0072 |
| 2 | [OS-0078](ordens/0078-selecao-limpeza.md) | `selecao` | — |
| 2 | [OS-0079](ordens/0079-meus-dados-limpeza.md) | `meus-dados` | OS-0072 |
| 2 | [OS-0080](ordens/0080-historico-limpeza.md) | `historico` | OS-0072 |
| 3 | [OS-0081](ordens/0081-vitrine-limpeza.md) | `vitrine` | OS-0072 e OS-0075 |

## Fora da limpeza

- O `typing` repetido entre `mesa` e `selecao`. Ele precisaria virar infra de DOM em `shared/plataforma`, o que exige ADR. Fica para quando o João pedir.
- A curva cúbica `1 - (1 - t) ** 3` repetida: o ganho é pequeno e mexeria em `shared` só por ela. Só a renomeação no `pressagios` entra, para ninguém "unificar" a curva errada.
