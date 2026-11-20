# Ordem de serviço: presságios, o vampiro encara o jogador e passam poucos morcegos

Ordem: OS-0105
Módulo: `pressagios` (e o asset `public/modelos/vampiro.glb`)
Executor: o orquestrador, na sessão principal.
Escopo de escrita: `src/modules/pressagios/**`, `public/modelos/vampiro.glb`, `ferramentas/blender/animar.py`, `docs/contexto/modelos-animados.md`

Pedido do usuário (2026-11-20), depois da OS-0104:
1. "Os morcegos estão demais": diminuir a quantidade, para passarem só alguns, de forma natural, sem preencher a tela.
2. "No final ele olha pra frente e não pra tela": o vampiro tem que olhar para onde o jogador está, como se os dois se encarassem.
3. Na revisão: ele tem que encarar a câmera também na saída, e olhar "mais para cima", para quem está olhando para ele.

## Decisões

1. **Morcegos.**
   - A revoada era uma parede de ~395 morcegos em grade (20×13, 9×9 e 6×5, mais batedores), feita para cobrir a tela.
   - Passa a ter **14 morcegos soltos** em três profundidades (3, 6 e 5).
   - Cada um tem entrada, altura e uma deriva vertical própria. O espalhamento horizontal (`x` em [-1,2; 1,1]) garante que até o mais lento entra e sai da tela.
   - Mantidos o voo da esquerda para a direita, as batidas, o rumo e a orientação.
2. **Olhar.**
   - Medido no clipe: durante toda a encarada, o rosto ficava ~10° abaixo da câmera do jogo, porque `OLHAR_MAX` (65°) limitava cada giro do pescoço e da cabeça.
   - Com o pivô no centro do crânio (OS-0104) e a gola dobrando ao encarar, o limite subiu para 90°.
   - **Os olhos da textura** são pesados e olham um pouco para baixo: com o rosto exatamente na câmera, ele parecia olhar para a frente. O olhar passa a ser a frente do rosto inclinada `OLHOS_ABAIXO` = 18° para baixo, e é ela que mira o alvo (o rosto fica 18° acima da câmera).
   - **Na saída** ele continua encarando (`OLHAR` e `QUEIXO` mantidos até 5.600 ms). Endireitar o peito encarando subia a cabeça para fora da tela, então ele sai debruçado e só endireita depois de afundar (`INCL_PEITO` 82 → 60 → 10 entre 4.800 e 5.600 ms).
   - **A gola** só dobra com o peito debruçado (fator pela inclinação do peito): de pé, deitada, ela apontava para cima atrás da cabeça.
   - Nada muda no código do site: o IK da cabeça no bote (OS-0103) continua só na janela do bote.
3. **Teste.** O teste "occludes a 9 by 6 grid of felt …", que exigia a parede de morcegos, virou a regra nova: no máximo 20 morcegos, nunca mais de um quinto do feltro escondido, e algum morcego passa pela vista.

## Resultado

- **Olhar:** erro entre o olhar e a câmera de ~1° de 1.200 a 5.600 ms, exceto no bote, que olha o dado (antes, 8° a 11° e solto na saída).
- **Clipe:** `CORPO_PIOR` 0,012 m. O topo do cabelo fica ~4% a 8% fora da tela ao encarar e na saída. No fim da saída, a gola alta em pé aparece atrás da cabeça, como no bote.
- **Asset:** GLB de 2,9 MB, texturas de 1024 px.
- **Verificação:** testes do módulo (110), lint e build passaram. O usuário aprovou no `npm run dev`.
- **Gate (interrompido a pedido do usuário, que mandou commitar e abrir o PR):**
  - `build`, `lint`, `npm test` (692 testes em 87 arquivos) e `test:server` (25) passaram.
  - O E2E paralelo terminou com 58 passando e 22 falhando, nenhuma em `omen.spec`: `screens` 7 (falha também na `main`), `table` 8, `coin` 2, `worker` 2, `import`, `roll` e `smoke` 1 cada, quase todas por timeout longo.
  - O grupo em série não rodou. O "test button Par de críticos" de `omen.spec` foi rodado à parte e passou.
  - Fica pendente rodar o E2E completo com a máquina livre.
