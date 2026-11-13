# ADR 0001: Estrutura de pastas dos módulos neste repositório

Status: aceito (o responsável humano autorizou o plano em 2026-11-13; ver `docs/plano-refatoracao.md`)

## Contexto

O guia (seção 3) desenha `backend/src/modules/<m>/` + `frontend/src/features/<m>/` numa pasta `app/`. Este repositório tem outro layout, verificado no código:

- O frontend é o pacote da raiz: `src/` com Vite (`index.html` aponta para `/src/main.tsx`), `tsconfig.app.json` com `include: ["src"]`, Vitest em `tests/**` e Playwright em `e2e/`.
- O backend é um pacote à parte em `server/` (`server/package.json`, sem workspace npm). Roda TypeScript direto no Node, sem build (`node src/main.ts`).
- Quase todo o domínio fica no cliente (ver ADR 0002). Só um domínio tem parte no servidor: o histórico.
- Há trabalho paralelo ativo em `feat/modo-de-rolagem` sobre os mesmos arquivos (ver o diagnóstico). Cada pasta raiz que muda de lugar torna o merge mais caro.

## Decisão

Manter os dois pacotes onde estão e criar a estrutura de módulos dentro de cada um:

```
CLAUDE.md                         raiz: visão geral, regras da seção 2, mapa de módulos
docs/                             mapa-modulos.md, adr/, specs/, ordens/
src/                              frontend (Vite, raiz inalterada)
├── main.tsx, App.tsx             casca: compõe os módulos (ADR 0008)
├── shared/                       infraestrutura do cliente (ADR 0008)
└── modules/<modulo>/
    ├── CLAUDE.md                 os cinco blocos da seção 3
    ├── index.ts                  única porta de entrada
    ├── contracts.ts              tipos de entrada, saída e eventos
    ├── domain/                   regra de negócio pura (o papel do service.ts)
    ├── store.ts                  estado do módulo (privado; ADR 0003)
    ├── repository.ts             IndexedDB/localStorage do módulo (privado), se houver
    ├── scene/                    componentes R3F (sem regra de negócio)
    ├── components/               componentes React HTML (sem regra de negócio)
    ├── hooks/
    ├── api.ts                    só no módulo com backend (histórico)
    └── tests/
server/src/
├── main.ts, app.ts               composição (Fastify, conexão, módulos)
├── shared/                       conexão MongoDB, logging
└── modules/<modulo>/             CLAUDE.md, index.ts, contracts.ts, routes.ts, service.ts, repository.ts, tests/
e2e/                              Playwright: testes do sistema inteiro (não são de módulo)
```

Um módulo é o par `src/modules/<m>/` + `server/src/modules/<m>/`. Só `historico` tem as duas metades. Os outros só existem no cliente. As subpastas são opcionais: cada módulo cria só as que usa.

Usamos `src/modules/` em vez de `frontend/src/features/` porque os módulos do cliente guardam regra de negócio (`domain/`), não só telas. O nome "features" sugeriria o frontend fino que o guia supõe.

## Consequências

- Vite, `index.html`, Playwright, os scripts de `package.json` e o modo de rodar o servidor não mudam. A fundação mexe nos `include` dos tsconfig e do Vitest (ADR 0007).
- O merge do trabalho paralelo fica mais barato: os caminhos mudam dentro de `src/`, e as pastas raiz ficam onde estão.
- Os agentes acham um módulo do cliente em `src/modules/<m>/` e o do servidor em `server/src/modules/<m>/`. O `CLAUDE.md` raiz registra isso.

## Alternativas descartadas

- **Mover para `frontend/` e `backend/`, como no guia.** Muda a raiz do Vite, dos tsconfig, do Playwright e dos imports do servidor, e cada arquivo do trabalho paralelo vira conflito de caminho. Não ganha nada que a decisão acima não dê.
- **Workspace npm com pacotes `packages/*`.** Resolve o compartilhamento de código entre cliente e servidor, mas acrescenta infraestrutura (workspaces, build ou exports por pacote) para um único ponto de compartilhamento. Fica para quando houver mais de um backend.
