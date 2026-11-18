# Ordem de serviço: presságios, o vampiro em 3D

Ordem: OS-0097
Módulo: `pressagios`
Escopo de escrita:
- `src/modules/pressagios/**`
- `e2e/omen.spec.ts`: três linhas novas na tabela dos botões de teste

Objetivo:
- As três animações do vampiro aparecem na cena 3D, sincronizadas com a linha do tempo pura da OS-0095 (`domain/vampiroMotion.ts`).

Leia antes de começar:
- `src/modules/pressagios/CLAUDE.md` e `NOTAS.md` (Receita, Desempenho)
- `scene/PresagiosNaCena.tsx`: a classe `Show`, como `Bolt`, `TaiJi`, `Kraken` e `Fire` são criados, aquecidos, escondidos e liberados
- `scene/Kraken.ts`: geometria procedural com tentáculo que segura o dado
- `domain/vampiroMotion.ts` (OS-0095)
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md): desempenho, SwiftShader e luzes

Decisões do orquestrador:

1. **Personagem original.**
   - É um vampiro nobre de arquétipo gótico genérico:
     - capa preta longa com forro vermelho-sangue e gola alta rígida vermelha;
     - roupa escura com colete vinho;
     - mãos pálidas, magras, de unhas longas e afiadas.
   - O usuário mandou uma referência de estilo (um Drácula de série animada). **Não copie** aquele desenho: nada de brasão, cruz no peito, logotipo ou rosto daquele personagem.
   - Rosto, quando aparece: pálido, cabelo preto penteado para trás, olhos vermelhos com brilho (emissivo) e presas. Formas simples e estilizadas.
2. **Tudo procedural, em three.js.**
   - Nenhum asset, modelo ou textura de fora, e nenhuma dependência nova.
   - Uma classe `Vampiro` em `scene/Vampiro.ts`, no padrão do `Show`: criar no construtor, aquecer em `compile`, esconder em `hide`, liberar em `dispose`.
   - Uma figura só, reaproveitada pelas três animações, mais um par de mãos presas à câmera para a `falha-bestial`.
   - Junte geometrias por material (`mergeGeometries`) para poucos draw calls.
   - Use materiais que respondem à luz da cena.
   - **Nenhuma luz nova.** A luz do presságio já vem da OS-0095.
3. **Enquadramento.**
   - No `par-de-criticos`, a cabeça fica **fora** do quadro: a câmera vê do peito para baixo, como pediu o usuário ("vai parecer só a roupa dele").
   - Ele chega andando, com balanço de passo e a capa ondulando, pela **direita** da bandeja.
   - Os braços vão do ombro até os pontos das mãos que a linha do tempo dá (IK simples de dois segmentos ou similar).
   - No `critico-bestial` e na `falha-bestial`, a cabeça aparece.
4. **Cada animação:**
   - **Par de críticos:** pega um dado com cada mão, junta os dois na mão direita e arremessa os dois com muita força em direção à tela. Os dados quase acertam a câmera (susto) e assentam no resultado.
   - **Crítico bestial:** surge por baixo da borda direita da mesa, primeiro a cabeça, sem quebrar nada. Sobe rápido, pega o dado da Fome, põe o dado na frente do jogador e vai embora por onde veio.
   - **Falha bestial:**
     - As mãos de trás do jogador tapam a visão aos poucos, com os dedos na frente dos "olhos" (da câmera), e destapam devagar.
     - O vampiro está na mesa, esperando, e ataca com a mão afiada. A mão leva o dado, que aparece na tela.
     - O vampiro sai rápido e de forma natural.
5. **Desempenho e regras do módulo.**
   - Shaders compilados no mount.
   - Nada visível fora de um presságio.
   - Recolher, trocar a seleção ou ligar o movimento reduzido some com tudo na hora.
   - O perfil leve segue o que os outros presságios fazem.
   - Exponha em `inspecao` um booleano `vampiroVisivel`, se ajudar os testes; se mudar o tipo, a casca recebe o campo como na OS-0095.
6. **E2E.** Em `e2e/omen.spec.ts`, três linhas na tabela dos botões, com um campo `vampiro` para checar `state().vampiro` no lugar de `omen`, que fica `null`:
   - Par de críticos: `vtm` = 10, `.omen-vampiro`;
   - Crítico bestial: `hunger` = 10;
   - Falha bestial: `hunger` = 1.
   - Os dados esperados na mão são os que `withDiceFor` dá a partir da mão padrão.
7. **Prova visual (obrigatória).**
   - Capture quadros de cada animação no Chrome com SwiftShader, nos marcos da linha do tempo:
     - par: 800, 1900, 2700, 3300, 3700, 4200, 5000;
     - bestial: 500, 1200, 1900, 2800, 4000;
     - falha: 900, 1600, 2300, 3200, 3700, 4200, 4700.
   - Salve em `screens/vampiro-<tipo>-<ms>.png` (a pasta `screens/` não é versionada) e liste os caminhos no relatório.
   - Para pausar num marco, use os botões de teste mais um `page.evaluate` que espera `state().omenTime >= ms`.

Entregáveis:
1. `scene/Vampiro.ts` e a integração no `Show`.
2. Testes do módulo: a figura é criada, aquecida, escondida e liberada sem vazamento (contagem de geometrias e materiais), e fica invisível fora do presságio.
3. As três linhas no E2E.
4. `CLAUDE.md` e `NOTAS.md` com a seção "Vampiro".

Critérios de aceite:
- `npm run build && npm run lint && npm test && npm run test:server` passam.
- `npx playwright test e2e/omen.spec.ts` passa, rodado sozinho com a máquina livre.
- As capturas mostram cada fase pedida.

Fora do escopo:
- Qualquer outro presságio.
- O voo comum (`vitrine`).

Se precisar de algo fora disso: pare e reporte. Não implemente.
