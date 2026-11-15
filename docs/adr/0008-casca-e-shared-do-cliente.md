# ADR 0008: A casca do cliente e o conteúdo do `shared/`

Status: aceito (o responsável humano autorizou o plano em 2026-11-13; ver `docs/plano-refatoracao.md`)

## Contexto

A regra 5 limita `shared/` a autenticação, banco, logging e barramento de eventos. O guia não prevê uma "casca" que componha os módulos, e o frontend que ele desenha não tem cena 3D. No código atual:

- Há infraestrutura sem regra de negócio usada por vários domínios, e ela não está nessa lista:
  - abertura do IndexedDB (`src/indexedDb.ts`);
  - detecção de falha de WebGL, renderizador e física (`src/failure.ts`, `src/ui/Safeguard.tsx`);
  - preferência de movimento reduzido (`App.tsx:19-24`);
  - aviso de renderizador por software (`markSoftwareGl`, `tableImages.ts:53`);
  - leitura segura de GLB/STL (`parseGlb`/`readModel` em `importer.ts:33-92`, também usada pela mesa em `tableFile.ts:3`);
  - tipos vetoriais `Vec3`/`Quat` (em `physics/world.ts:1-2`, usados por geometria, física e cena);
  - utilitários de animação (`easeOut`, `clamp01`, `span`), duplicados em `Omens.tsx`, `highlight.ts` e `krakenMotion.ts`.
- `App.tsx` e `Stage.tsx` compõem tudo. Além disso, `Stage.tsx` tem lógica de vários domínios: o replay do arremesso, a aplicação do panorama, o DPR, o enquadramento da câmera e o test hook (diagnóstico, §5). `App.tsx` liga o histórico (`App.tsx:26`).

## Decisão

1. **A casca** (`src/main.tsx`, `src/App.tsx` e `src/app/`) é a raiz de composição. Ela não é módulo. Pode importar o `index.ts` de qualquer módulo; nenhum módulo a importa. A casca:
   - monta o layout HTML, o `<Canvas>`, o `<Physics>`, as luzes e os `Lightformer`s, e põe no lugar os componentes que cada módulo expõe;
   - faz o enquadramento da câmera e o DPR adaptativo. A regra "o DPR e o panorama só mudam entre animações" vira uma função da casca, que combina `arremesso.fase()` e `vitrine.vitrineConcluida()`;
   - chama a inicialização de cada módulo (`meusDados.carregar()`, `mesa.carregar()`);
   - monta o `window.__dice` com a inspeção de cada módulo (ADR 0003).
   A casca **não tem regra de negócio**. Ligar o histórico ao resultado, por exemplo, sai da casca e vai para o `historico`, que assina o evento.
2. **`src/shared/`** contém só infraestrutura, sem nome nem regra de negócio:
   - `db/`: abre o banco `dice-roller` e cuida da versão. Cada módulo declara a própria store. O `shared/db` não conhece o nome de nenhuma store;
   - `events.ts`: o sinal tipado (ADR 0005);
   - `plataforma/`: a falha registrada (`webgl`, `graphics`, `physics`, a primeira vence), o error boundary (`Guard`) e a mensagem de falha, a sonda de WebGL, o movimento reduzido (valor e evento) e o renderizador por software;
   - `modelos3d/`: lê GLB e STL só de `data:`/`blob:`. Limites de tamanho, triângulos e textura entram por parâmetro: os do dado (10 MB, 50 mil triângulos) são de `meus-dados`, e os da mesa (20 MB, 100 mil triângulos) são de `mesa`;
   - `math/`: `Vec3`, `Quat`, `Pose`, `easeOut`, `clamp01`, `span`.
3. **Ampliamos a regra 5** para "infraestrutura técnica sem regra de negócio". Os itens acima são exatamente os permitidos. Qualquer item novo em `shared/` precisa de ADR.
4. **No servidor**, `server/src/shared/` tem a conexão MongoDB e o logger do Fastify. `main.ts`/`app.ts` são a casca do servidor.

## Consequências

- Os textos de falha em pt-BR ficam em `shared/plataforma`. Eles são mensagem de infraestrutura (o navegador não tem WebGL), não regra do jogo.
- A auditoria periódica (seção 8 do guia) confere se `shared/` recebeu algo com nome de negócio. O teste de arquitetura impede `shared/` de importar módulos (ADR 0006).
- A casca continua sendo o arquivo que mais muda durante a extração, porque cada módulo extraído troca de lugar nela. Cada ordem de extração inclui o ajuste da casca no próprio escopo (detalhado no plano).

## Alternativas descartadas

- **Um módulo `plataforma` em vez de `shared/plataforma`.** Funciona, mas todos os módulos dependeriam dele, e ele não tem domínio de negócio. Seria o "módulo oculto do qual todos dependem" que a seção 10 do guia aponta como sinal de alerta.
- **Deixar a leitura de GLB no módulo de dados importados e a mesa depender dele.** A mesa passaria a depender de dados importados só para ler um arquivo, uma dependência sem relação de negócio. Hoje a mesa ainda reconhece o erro desse módulo pelo nome da classe (`tableFile.ts:161`).
- **Uma casca que também seja módulo, com `index.ts`.** Ninguém a importa, então ela não precisa de porta.
