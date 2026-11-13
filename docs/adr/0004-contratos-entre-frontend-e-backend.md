# ADR 0004: Como o frontend usa os tipos do `contracts.ts` do backend

Status: proposto (aguarda o responsável humano)

## Contexto

O guia manda o frontend importar do backend só os tipos de `contracts.ts`. Hoje, verificado no código:

- O cliente monta o corpo do `POST /rolls` em `src/api/history.ts` (`rollBody`, `dieBody`) sem tipo declarado. O servidor declara o seu (`Die` em `server/src/rules.ts:7`) e valida com JSON Schema em `server/src/app.ts`. Nada liga um tipo ao outro: se um campo mudar de um lado só, nada acusa o erro.
- Os dois pacotes estão no mesmo repositório, sem workspace. O cliente compila com `tsconfig.app.json` (bundler, `verbatimModuleSyntax`), e o servidor com `server/tsconfig.json` (nodenext, `strict`). O servidor roda o `.ts` direto no Node.

## Decisão

1. `server/src/modules/historico/contracts.ts` declara os tipos HTTP do módulo: o corpo de `POST /rolls`, a resposta, a query e a resposta de `GET /rolls`. Pode também exportar os esquemas JSON (valores) que as rotas usam.
2. O cliente importa esses tipos **só com `import type`**, e só no `api.ts` do módulo: `src/modules/historico/api.ts` → `import type { … } from '../../../server/src/modules/historico/contracts.ts'`. Com `verbatimModuleSyntax`, o import some no build: o bundle do cliente não recebe nada do servidor.
3. O `contracts.ts` do backend fica restrito ao que compila nas duas configurações: só tipos e objetos literais, sintaxe apagável, sem imports de Fastify ou MongoDB, e válido em `strict`.
4. O teste de arquitetura (ADR 0006) faz cumprir a regra. De `src/**` para `server/**`, só passa import `type-only` e só para `server/src/modules/*/contracts.ts`. De `server/**` para `src/**`, só para a porta pública do módulo `regras` (ADR 0002).

## Consequências

- Mudar um campo do contrato quebra o `tsc -b` do cliente na hora, e não só em produção.
- O `tsc -b` da raiz passa a checar também o `contracts.ts` do servidor, que precisa compilar com as opções do cliente. Mantê-lo só com tipos torna isso trivial.
- O tipo garante a forma, não o conteúdo. A validação de valores continua no servidor (esquema + `service.ts`).

## Alternativas descartadas

- **Cada ponta declara o seu tipo, ligados por um teste de contrato.** É o cenário de hoje, sem o teste. Duplica a declaração e o erro só aparece quando o teste roda.
- **Pacote `contracts` em workspace npm.** É correto, mas é infraestrutura demais para um contrato de três rotas (ver ADR 0001).
- **Gerar os tipos a partir do JSON Schema.** Exige gerador e etapa de build. Não compensa neste tamanho.
