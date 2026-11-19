# Ordem de serviço: presságios, o vampiro maior e mais realista

Ordem: OS-0100
Módulo: `pressagios`
Executor: Codex `gpt-6.2-sol`, esforço alto. O revisor aprova ou devolve com o limite apertado, em ciclos.
Escopo de escrita: `src/modules/pressagios/**`

Pedido do usuário (2026-11-18), depois da OS-0099: "a animação tá legal, mas o vampiro tá ruim, ele tá pequeno demais, ele precisa tá um pouco maior, mas ainda deixe ele bem modelado [...] e tente deixar o vampiro mais realista".

## Decisões do orquestrador

1. **Maior sem mexer na câmera.** A câmera padrão deixa só ~14% da altura da tela acima da parede de trás (medido na OS-0099). A câmera é da casca, então não muda. Para crescer, o vampiro **se debruça sobre a parede de trás**, ameaçador, sem tocá-la:
   - o tronco inclina de 25° a 40° na direção da câmera, com a cabeça e os ombros avançando sobre o fundo da bandeja;
   - a capa se abre para os lados, como asas;
   - as mãos ficam no ar, com os dedos abertos e as garras à mostra;
   - a linha do tempo do par não muda: os marcos, a revoada, o sangue e a revelação continuam iguais. Só a pose e o tamanho da figura mudam.
2. **Mais realista, ainda procedural.** Nenhum asset, textura de imagem ou dependência nova. A figura é a mesma para os três presságios. Os bestiais mantêm as linhas do tempo e só ganham a figura nova.
3. **Testes só de código.** É ajuste visual: build, lint, `npm test` e capturas. **Sem E2E** (regra do usuário).

## Limite mínimo (o revisor confere item por item)

### Tamanho e enquadramento (par, câmera padrão `[0, 14, 10]`, FOV 40°)
- A parte visível da figura ocupa **de 24% a 32% da altura da viewport**, com a cabeça inteira em quadro.
- Ela fica centrada em x, com desvio de até 3% da largura.
- A figura não toca a mesa: a folga é de pelo menos 0,15 até a parede e até o feltro.
- A caixa projetada da figura fica nos **38% de cima** da viewport, para não encobrir os dados na revelação nem os números em destaque.
- Escreva um teste que projete a figura nos marcos `surge`, `revoada`, `revela` e `mostrado` e confira esses limites.

### Proporções realistas
- A cabeça mede de 1/7 a 1/8 da altura total da figura, sem a cabeça grande de boneco.
- A largura da cabeça é no máximo 0,4 da largura dos ombros, e o pescoço é visível.
- O tronco é adulto e magro: ombros largos e cintura estreita.

### Rosto
- Parte de uma esfera de alta resolução (pelo menos 96×72), esculpida por funções de deslocamento:
  - arco das sobrancelhas, maçãs do rosto altas e bochechas encovadas;
  - mandíbula e queixo marcados;
  - ponte do nariz e narinas;
  - lábios finos com sulco nos cantos;
  - pálpebras.
- Os olhos ficam em órbitas fundas, com esclera, íris e pupila separadas. A íris é vermelha, com emissivo leve (até 0,6) e sem bolinha brilhante.
- As orelhas são levemente pontudas. As presas saem do lábio superior e são finas.
- O cabelo é preto, penteado para trás, com bico de viúva. Faça-o com fios (tubos de pelo menos 40 mechas, ou uma superfície com sulcos), não com um capacete liso.

### Material e cor
- A pele é um `MeshPhysicalMaterial` pálido, com roughness de 0,5 a 0,65 e sheen leve.
- Use vertex colors para variar o tom: mais rosado nos lábios, pálpebras e orelhas, e mais frio e acinzentado sob os olhos e nas têmporas.
- A capa e a roupa são tecido, com sheen ≥ 0,4.
- A capa tem dobras: as do OS-0099 continuam.
- A gola alta é rígida e curva. O colete é vinho, com botões, e a gravata ou o jabot tem dobras.

### Mãos
- Os dedos são longos e magros, com 3 falanges e nós marcados.
- As unhas são compridas, escuras e afiadas.
- O dorso da mão tem tendões sutis.

### Qualidade, mantida da OS-0099
- O ângulo máximo entre normais vizinhas é **≤ 15°** nas superfícies curvas. As exceções são nomeadas no teste.
- Orçamento: até **90 mil vértices** na figura. Os draw calls continuam agrupados por material e são aquecidos no `compile()`.

## Entregáveis

1. `scene/Vampiro.ts` (e auxiliares em `scene/`) com a figura nova, e a pose debruçada do par em `domain/vampiroMotion.ts`.
2. Testes:
   - o enquadramento acima;
   - as proporções (altura da cabeça sobre a da figura, largura da cabeça sobre a dos ombros);
   - o ângulo das normais e o orçamento;
   - os testes de cena atuais (aquecer, liberar, esconder) continuam verdes.
3. `CLAUDE.md` e `NOTAS.md` do módulo atualizados.
4. Capturas em `screens/`:
   - o par em 400, 900, 1900, 3600 e 4300 ms (`os0100-par-<ms>.png`);
   - o close do rosto de frente e de 3/4 (`os0100-rosto-frente.png`, `os0100-rosto-34.png`);
   - o close da mão (`os0100-mao.png`);
   - o crítico bestial em 1900 e a falha bestial em 3700.

## Critérios de aceite
- `npm run build && npm run lint && npm test` passam. Sem E2E.
- As capturas mostram o vampiro maior, debruçado sobre a parede de trás, e um rosto adulto e realista, sem facetas.

## Fora do escopo
- A câmera, a vitrine, os outros presságios, os morcegos e o sangue (aprovados na OS-0099).
- As linhas do tempo do crítico bestial e da falha bestial.

Se precisar de algo fora disso, pare e pergunte.
