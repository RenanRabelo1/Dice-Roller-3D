# Ordem de serviço: meus-dados, a pose de calibração da forma livre

Ordem: OS-0089 (backlog, item 4, "Calibração da forma livre confunde")
Módulo: `meus-dados`
Escopo de escrita:
- `src/modules/meus-dados/**`
- `src/index.css`, só se a pose precisar de algum ajuste no passo de numerar (bloco `/* OS-0089 */`)

Objetivo:
- No passo de numerar um dado de **forma livre**, o assistente mostra o dado **caído na mesa**, como o jogador vai vê-lo.
- A face (ou as faces) **de cima** fica destacada, e a pergunta passa a ser "Com o dado caído assim, que número você lê em cima?".

Como é hoje (backlog, item 4):
- O contorno laranja marca a face em que o dado **está apoiado**.
- A prévia vira essa face para **longe da câmera** (`orientation(-n)`, por volta da linha 197 do `AssistenteDeImportacao.tsx`) e desenha o contorno através do modelo (`Marker through`).
- O número que o jogador lê fica virado para a câmera, em outra face. Parece que o assistente pede para numerar a face marcada.

Leia antes de começar:
- `docs/backlog.md`, item 4, a proposta combinada com o João em 2026-11-12, inteira
- `src/modules/meus-dados/CLAUDE.md` e `NOTAS.md` (o assistente e a calibração da forma livre), `ui/AssistenteDeImportacao.tsx` (o passo `numbers`, o `Rig`, o `Preview` e o `Marker`) e o domínio do importador (`readsDown` e as faces)
- `src/modules/dados/index.ts` (`polyhedron`, as faces e a leitura `readsDown`)
- `src/modules/vitrine/domain/inkGlow.ts` (`upInk`): é a mesma ideia de "o que fica para cima com o dado apoiado na face A", só para ler

Decisões do orquestrador (a proposta do backlog, fechada):

1. **Pose:**
   - no passo de numerar de um dado de forma livre, o modelo fica apoiado na face A, com a face de apoio para **baixo**, encostada num **disco de feltro** (um `CircleGeometry` cor de feltro, logo abaixo);
   - **a câmera** fica de cima e de frente, como a câmera do jogo, uns 55° acima do horizonte;
   - o `OrbitControls` continua: o jogador pode girar a vista em volta, mas o dado não sai da pose.
2. **O que destacar:**
   - **a face de cima:** a face (ou as faces) cuja normal, com o dado nessa pose, aponta mais para cima, ou seja, dentro de 15° da mais alta;
   - num shard, oposta a uma face longa fica uma **aresta**, então duas faces aparecem, e as duas acendem. O backlog já aceita isso;
   - **o destaque:** um contorno dourado (`#FFE38A`) sobre a face de cima, desenhado **sem** atravessar o modelo, porque ela está virada para a câmera;
   - **a face de apoio** fica só com um contorno fraco, encostado no feltro.
   - **A regra é pura:** `facesDeCima(faces, apoio)` em `domain/`, com teste (dado regular, shard de 5 lados com aresta para cima, prisma).
3. **A pergunta** do passo vira "Com o dado caído assim, que número você lê em cima?". O campo do número e a navegação entre as faces não mudam.
4. **Os outros passos não mudam.** O passo anterior (escolher modelo e cor) continua com a prévia girando, porque o João gosta.
5. **Só forma livre.** Um dado de forma padrão (d4 a d20) segue a calibração de hoje.
6. **Docs do módulo:** `CLAUDE.md` e `NOTAS.md`. O orquestrador marca o item 4 do backlog como feito.
7. **Testes:**
   - o `facesDeCima`;
   - o componente, se o módulo já renderiza o passo em teste: a pergunta nova no passo de numerar de um dado livre;
   - **E2E:** o `import.spec.ts` tem o teste do prisma de forma livre. Confira no código se ele lê o texto da pergunta ou o contorno, e **liste no relatório** o que muda, sem rodar.

Entregáveis:
1. A pose no feltro.
2. O destaque da face de cima.
3. A pergunta nova.
4. Testes e docs.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` passam. O importador continua carregando sob demanda (`leitor.test.ts`).
- **Sem E2E nem servidor de dev:** o orquestrador roda e o João testa.

Fora do escopo:
- A calibração dos dados de forma padrão, a ficha do dado (OS-0085) e a detecção de forma.

Se precisar de algo fora disso: pare e reporte. Não implemente.
