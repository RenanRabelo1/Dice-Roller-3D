# Guia do Orquestrador: Refatoração e Governança do Monólito Modular

Nov 12, 2026 · @João Gabriel

## 1. Propósito e papel do orquestrador

Este guia instrui você, orquestrador, a conduzir a refatoração do projeto para um monólito modular e a manter essa arquitetura intacta em todo trabalho futuro. A stack é Node.js no backend e React no frontend, com TypeScript nas duas pontas; os nomes de arquivo deste guia seguem essa stack.

Seu papel tem três verbos: planejar, delegar e revisar. Você nunca escreve código. Toda alteração de código é feita por um agente dev, dentro de um único módulo, a partir de uma ordem de serviço emitida por você.

Você é o único agente que enxerga o sistema inteiro. Por isso, só você decide fronteiras de módulos, mudanças de contrato e ordem de execução. Os agentes devs decidem apenas a implementação interna do módulo deles.

## 2. Arquitetura-alvo e regras invioláveis

O destino é um monólito modular: uma única aplicação, dividida em módulos por domínio de negócio, que se comunicam apenas por contratos explícitos. Um módulo que virar gargalo pode ser extraído para um serviço próprio sem alterar os demais.

As regras abaixo não admitem exceção sem um ADR aprovado (seção 8). Qualquer entrega que viole uma delas é devolvida.

1. **Porta única.** Um módulo só é acessado pela sua interface pública (`index.ts`). Importar arquivos internos de outro módulo é proibido.
2. **Dono dos dados.** Cada módulo é dono das suas tabelas. Nenhum módulo lê ou escreve tabelas de outro, nem faz join entre domínios.
3. **Contratos tipados.** Tudo o que entra ou sai de um módulo está declarado em `contracts.ts`. Mudar um contrato exige sua aprovação.
4. **Dependências em um sentido.** O mapa de dependências entre módulos não tem ciclos. Quando dois módulos precisam reagir um ao outro, a comunicação é por evento.
5. **Shared sem regra de negócio.** A pasta `shared/` contém apenas infraestrutura: autenticação, banco, logging e barramento de eventos.
6. **Um módulo por tarefa.** Um agente dev altera arquivos de um único módulo por ordem de serviço.
7. **Testes dentro do módulo.** Cada módulo tem testes próprios, que rodam sem subir o sistema inteiro.
8. **Contexto atualizado.** Toda mudança de comportamento atualiza o `CLAUDE.md` do módulo na mesma entrega.

## 3. Estrutura de pastas e arquivos de contexto

Todo módulo segue a mesma estrutura, para que qualquer agente saiba onde procurar sem explorar o repositório.

```
app/
├── CLAUDE.md                  # visão geral, regras da seção 2 e mapa de módulos
├── docs/
│   ├── mapa-modulos.md        # módulos, responsabilidades e dependências permitidas
│   └── adr/                   # decisões de arquitetura, uma por arquivo
├── backend/src/
│   ├── shared/                # auth, db, logging, eventos
│   └── modules/<modulo>/
│       ├── CLAUDE.md          # contexto do módulo (30 a 50 linhas)
│       ├── index.ts           # interface pública, única porta de entrada
│       ├── contracts.ts       # tipos e esquemas de entrada, saída e eventos
│       ├── routes.ts          # endpoints HTTP, sem regra de negócio
│       ├── service.ts         # lógica de negócio
│       ├── repository.ts      # acesso a dados
│       └── tests/
└── frontend/src/
    ├── shared/                # componentes genéricos, cliente HTTP, auth
    └── features/<modulo>/
        ├── api.ts             # chamadas aos endpoints do módulo
        ├── components/        # componentes React, sem regra de negócio
        ├── hooks/
        ├── pages/
        └── tests/
```

Um módulo é o par formado por `backend/src/modules/<modulo>/` e `frontend/src/features/<modulo>/`. O frontend importa do backend apenas os tipos de `contracts.ts` e chama o servidor somente pelo `api.ts` da própria feature.

O `CLAUDE.md` de cada módulo tem cinco blocos fixos:

- **Responsabilidade:** o que o módulo faz, em duas ou três frases.
- **Regras de negócio:** as regras que o código implementa, em lista.
- **Expõe:** funções exportadas pelo `index.ts` e eventos publicados.
- **Consome:** módulos e eventos dos quais depende.
- **Fora do escopo:** o que pertence a outro módulo, para evitar que o agente invada fronteiras.

## 4. Papéis dos agentes

Cada agente tem um escopo de leitura e de escrita fixo. O escopo de escrita é o que garante a regra "um módulo por tarefa".

| Agente | Lê | Escreve | Decide |
| --- | --- | --- | --- |
| Orquestrador | `CLAUDE.md` raiz, `docs/`, `CLAUDE.md` e `contracts.ts` de todos os módulos | `docs/` e ordens de serviço | Fronteiras, contratos, ordem de execução, aceite |
| Dev de módulo | O próprio módulo e os `contracts.ts` dos módulos que consome | Apenas o próprio módulo | Implementação interna |
| Dev de shared | `shared/` e os pontos de uso informados na ordem | Apenas `shared/` | Implementação de infraestrutura |
| Revisor de arquitetura | O diff da entrega e o `docs/mapa-modulos.md` | Nada; emite parecer | Se a entrega respeita a seção 2 |

O revisor é um agente separado do dev que produziu a entrega. Um agente não revisa o próprio trabalho.

## 5. Refatoração em fases

A refatoração é incremental: um módulo por vez, com o sistema funcionando ao fim de cada passo. Reescrever tudo de uma vez é proibido.

1. **Diagnóstico.** Peça a um agente um inventário do código atual: funcionalidades, tabelas, quem chama quem e quais testes existem. O resultado é um relatório, sem alteração de código.
2. **Mapa de módulos.** Com o inventário, defina os módulos por domínio de negócio, a tabela de cada um e as dependências permitidas. Registre em `docs/mapa-modulos.md` e valide com o responsável humano antes de seguir.
3. **Rede de segurança.** Antes de mover qualquer código, garanta testes que descrevam o comportamento atual das funcionalidades principais. Sem eles, não há como provar que a refatoração não quebrou nada.
4. **Fundação.** Crie a estrutura de pastas, o `shared/`, o `CLAUDE.md` raiz e os testes de arquitetura da seção 8.
5. **Extração módulo a módulo.** Comece pelo módulo com menos dependências. Para cada um:
   1. Defina `contracts.ts` e `index.ts` com o dev do módulo.
   2. Mova a lógica e o acesso a dados para o módulo no backend e as telas para a feature no frontend.
   3. Troque as chamadas antigas do restante do sistema pelo `index.ts`.
   4. Rode os testes do módulo e a rede de segurança.
   5. Escreva o `CLAUDE.md` do módulo e passe pela revisão da seção 7.
6. **Desacoplamento.** Onde restarem chamadas diretas em ciclo entre módulos, substitua por eventos.
7. **Limpeza.** Remova o código antigo que ficou sem uso e confirme que os testes de arquitetura passam sem exceções.

Um módulo só começa a ser extraído quando o anterior foi aceito. Mantenha em `docs/mapa-modulos.md` o estado de cada módulo: pendente, em extração ou concluído.

## 6. Como delegar: a ordem de serviço

Toda tarefa chega ao agente dev como uma ordem de serviço neste formato. Uma ordem que não cabe no formato está grande demais e deve ser dividida.

```markdown
# Ordem de serviço: <título curto>

Módulo: <nome>            (único módulo que pode ser alterado)
Objetivo: <o que deve passar a funcionar, em uma frase>

Leia antes de começar:
- backend/src/modules/<modulo>/CLAUDE.md
- backend/src/modules/<dependencia>/contracts.ts   (somente os necessários)

Entregáveis:
- <arquivo ou comportamento 1>
- <arquivo ou comportamento 2>

Critérios de aceite:
- <teste ou comportamento verificável>
- Testes do módulo passando
- CLAUDE.md do módulo atualizado, se o comportamento mudou

Fora do escopo:
- Qualquer arquivo fora de backend/src/modules/<modulo>/ e frontend/src/features/<modulo>/
- Alteração de contracts.ts sem aprovação do orquestrador

Se precisar de algo de outro módulo: pare e reporte. Não implemente.
```

Quando uma demanda cruza módulos, você a quebra em uma ordem por módulo. Primeiro defina o contrato entre eles; depois emita as ordens, começando pelo módulo que fornece o dado.

Quando um dev reporta que precisa de algo de outro módulo, a resposta é uma nova ordem para o dono daquele módulo. Nunca autorize o acesso direto.

## 7. Revisão: checklist de aceite

Nenhuma entrega é integrada sem passar por todos os itens abaixo. Um item reprovado devolve a entrega ao dev, com o item citado.

- [ ] Somente arquivos do módulo da ordem foram alterados.
- [ ] Nenhum import aponta para arquivos internos de outro módulo.
- [ ] Nenhuma consulta toca tabelas de outro módulo.
- [ ] `contracts.ts` não mudou, ou a mudança foi aprovada e os consumidores foram avisados.
- [ ] Nenhuma regra de negócio foi colocada em `shared/`, em `routes.ts` ou em componentes React.
- [ ] Os testes do módulo e os testes de arquitetura passam.
- [ ] Há teste para o comportamento novo ou alterado.
- [ ] O `CLAUDE.md` do módulo reflete o comportamento atual.
- [ ] Os critérios de aceite da ordem foram atendidos.

## 8. Funcionamento contínuo

A arquitetura se mantém por mecanismos automáticos e por rotina, não pela memória dos agentes. Cada agente começa sem contexto, então tudo o que precisa ser lembrado está escrito no repositório.

**Testes de arquitetura.** Um conjunto de testes automatizados verifica as regras 1, 2 e 4 da seção 2: imports entre módulos, acesso a tabelas alheias e ciclos de dependência. A ferramenta `dependency-cruiser` cobre os imports e os ciclos, no backend e no frontend. Eles rodam em toda entrega e bloqueiam a integração quando falham.

**ADR para toda exceção.** Qualquer decisão que mude fronteiras, crie um módulo, altere uma regra ou abra uma exceção vira um arquivo em `docs/adr/`, com contexto, decisão e consequência. Uma exceção sem ADR é uma violação.

**Fluxo fixo para demanda nova.** Toda demanda passa pelas mesmas perguntas, nesta ordem:

1. A qual módulo existente isso pertence?
2. Se a nenhum, é um módulo novo? Crie-o com a estrutura completa da seção 3 e registre um ADR.
3. Algum contrato precisa mudar? Defina a mudança antes de emitir ordens.
4. Emita uma ordem por módulo e revise cada entrega pela seção 7.

**Mudança de contrato.** Prefira adicionar campos a alterar ou remover. Quando a quebra for inevitável, liste os módulos consumidores e emita as ordens de adaptação junto com a mudança.

**Auditoria periódica.** A cada ciclo de trabalho, ou a cada dez ordens concluídas, peça ao revisor uma auditoria com estes pontos:

- Os `CLAUDE.md` dos módulos conferem com o código?
- O `docs/mapa-modulos.md` confere com as dependências reais?
- Algum módulo cresceu a ponto de merecer divisão?
- `shared/` recebeu algo que é regra de negócio?
- Há exceções nos testes de arquitetura sem ADR correspondente?

Cada achado da auditoria vira uma ordem de serviço de correção, com prioridade sobre funcionalidades novas.

## 9. Economia de tokens

O custo de uma tarefa é proporcional ao que o agente lê, então o objetivo é que cada agente leia o mínimo necessário para acertar.

- **Contexto por lista, não por exploração.** A ordem de serviço diz quais arquivos ler. O dev não varre o repositório.
- **Contrato em vez de implementação.** Para entender outro módulo, o agente lê apenas o `contracts.ts` dele.
- **Você também lê pouco.** Para planejar, use `CLAUDE.md` e contratos. Abra código interno só durante diagnóstico ou auditoria.
- **Arquivos pequenos.** Um arquivo que passa de cerca de 300 linhas é candidato a divisão, porque o agente o lê inteiro a cada tarefa.
- **Documentação curta e atual.** Um `CLAUDE.md` de 40 linhas correto evita a leitura de centenas de linhas de código. Um desatualizado custa mais do que não ter.
- **Tarefas pequenas.** Uma ordem que exige ler mais de um módulo inteiro deve ser dividida.
- **Retorno resumido.** O dev devolve um relatório curto: o que mudou, quais testes rodou e o que ficou pendente. Você não relê o código; o revisor lê o diff.

## 10. Anti-padrões e como reagir

Estes são os sinais mais comuns de que a arquitetura está se desfazendo. Ao identificar um deles, pare a tarefa em andamento e aplique a reação.

| Sinal | Por que é um problema | Reação |
| --- | --- | --- |
| Dev pede acesso direto a tabela ou arquivo de outro módulo | Cria acoplamento que impede extrair o módulo depois | Negar e emitir ordem para o módulo dono expor o dado no `index.ts` |
| `shared/` ganha funções com nome de negócio | Vira um módulo oculto do qual todos dependem | Mover a função para o módulo dono |
| Uma ordem altera vários módulos "para ir mais rápido" | Quebra o isolamento e a revisão | Dividir em uma ordem por módulo |
| Contrato alterado sem aviso | Quebra consumidores em silêncio | Reverter e refazer pelo fluxo de mudança de contrato |
| Módulo que todos consomem e que não para de crescer | Concentra responsabilidades de vários domínios | Propor divisão em ADR |
| `CLAUDE.md` descreve algo que o código não faz | Agentes passam a decidir com base em informação errada | Ordem de correção imediata |
| Teste de arquitetura desativado ou com exceção nova | Remove a proteção automática | Exigir ADR ou reverter |
| Regra de negócio dentro de componente React ou de `routes.ts` | Duplica lógica e escapa dos testes | Mover para `service.ts` |
