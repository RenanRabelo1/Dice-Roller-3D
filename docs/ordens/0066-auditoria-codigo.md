# Ordem de serviço: auditoria de código morto e repetido (só relatório)

Ordem: OS-0066 (HUD imersivo, parte 3, ordem 5 de 5)
Módulo: nenhum, só leitura
Escopo de escrita:
- `docs/auditoria-codigo.md` (novo). É o único arquivo que você cria. Não altere código.

Objetivo:
- Um relatório com evidência do que pode ser apagado ou unificado no `src/`, no `server/`, no `e2e/` e no `tests/`, para o João decidir o que vira ordem de limpeza.

Leia antes de começar:
- O `CLAUDE.md` da raiz e [docs/mapa-modulos.md](../mapa-modulos.md), porque as portas, os donos e as exceções explicam muita duplicação aparente
- A OS-0050, em `docs/ordens/`, que já fez uma varredura de código sem uso no fim da refatoração: não repita o que ela já decidiu

Decisões do orquestrador:

1. **O que procurar:**
   1. **Código morto:**
      - export que ninguém importa (considere as duas portas, `index.ts` e `cena.ts`, o `window.__dice` e o worker);
      - arquivo que ninguém importa;
      - CSS com seletor que não existe mais no DOM (o HUD trocou muito DOM nas OS-0051 a 0055: confira classes antigas como `.selection`, `.import` e `.chat-toggle` nos lugares que não são mais usados);
      - dependência do `package.json` sem uso.
   2. **Código repetido:**
      - funções iguais ou quase iguais em lugares diferentes;
      - helpers de E2E copiados entre specs (`ready`, `roll`, `shown`, `settled`, `throwWithSpace`);
      - blocos de CSS que se sobrescrevem: a mesma propriedade no mesmo seletor em blocos de OS diferentes do `index.css`.
2. **Como provar:**
   - Cada achado tem o arquivo e a linha, o comando ou a busca que prova (`grep`, `rg`) e o risco de remover.
   - Use só ferramentas que já existem no projeto e busca no código. **Não instale dependência** (nada de `knip` ou `ts-prune` via `npx`, que baixaria pacote).
3. **Formato do relatório:** uma tabela por categoria, com as colunas Onde | O quê | Prova | Ganho | Risco. Ordene por ganho e depois por risco, os fáceis primeiro.
   - O ganho é "manutenção" ou "tamanho do bundle".
   - Este projeto já descarta export sem uso no build. Diga isso quando o ganho for só de manutenção.
4. **Respeite a arquitetura.** Duplicação que existe por causa da regra de porta única ou do dono dos dados (ADR 0003) não é achado: cite como "intencional" numa seção à parte, em uma linha cada.
5. **Não proponha mudar efeito, animação ou função do jogo.** O alvo é só código que não roda ou que roda igual em dois lugares.

Entregáveis:
1. `docs/auditoria-codigo.md`.

Critérios de aceite:
- `git diff --stat` mostra só `docs/auditoria-codigo.md`.
- Todo achado tem prova reproduzível.
- **Sem E2E, sem servidor de dev e sem instalar nada.**

Fora do escopo:
- Apagar ou mudar qualquer código. A limpeza vira ordens próprias, depois da decisão do João.

Se precisar de algo fora disso: pare e reporte. Não implemente.
