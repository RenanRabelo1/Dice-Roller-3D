# Desempenho de várias moedas — 2026-11-11

Pedido: remover as travadas ao lançar várias moedas e ao recolhê-las depois do resultado.

## Diagnóstico

Chrome em 1440×900, dez moedas, carga de 350 ms e quatro jogadas consecutivas, com relógio real. Medimos intervalos de `requestAnimationFrame` por fase e tarefas acima de 50 ms. Os registros exploratórios estão em `screens/transitions-*.json` (artefatos locais, ignorados pelo Git).

- A pré-simulação inteira acontecia no quadro de lançamento. Dez moedas custaram aproximadamente 24–33 ms nas chamadas aquecidas; a primeira largada teve uma tarefa de 101 ms.
- Com Intel Iris Xe/D3D11, o recolhimento ficou em 60 FPS na medição inicial. Com SwiftShader, reproduziu a trava: 4,3–5 FPS, com intervalos máximos de 217–267 ms. O custo de desenhar a cena também precisava ser tratado.
- A instrumentação com CPU limitada a 4× prejudicou todos os dados, incluindo d6, e a compilação inicial. Não usamos essa execução para atribuir um ganho à moeda.
- A revisão encontrou também uma defasagem no fim do replay: os assinantes recebiam o resultado antes de Rapier aplicar a última pose. Um teste observou diferença de 0,000271 nos componentes da pose no instante da publicação. Uma busca com a física real encontrou moedas que mudavam de lado nesse último passo (por exemplo, semente 102 com dez moedas e força 0,5).

## Experimentos

| Mudança isolada | Observação | Decisão |
| --- | --- | --- |
| Material Standard opaco para a moeda | Continuou em aproximadamente 5 FPS no SwiftShader; ganho dentro da variação | Revertida |
| DPR fixo de 0,5 | Retorno passou para aproximadamente 13–26 FPS no SwiftShader | Manter a redução de pixels, aplicada de forma adaptativa |
| Sombras de 512 em vez de 1024, já com DPR reduzido | Aproximadamente 14 FPS antes e depois | Revertida |
| DPR pelo `factor/onChange` do monitor | A última redução não era aplicada após a renderização do componente; parava em aproximadamente 0,51 | Substituída pelos callbacks de queda e recuperação |
| Ajustar DPR durante qualquer fase | Redimensionar o buffer provocou pausas nas transições no SwiftShader | Ajustar somente na mão ou após terminar a apresentação |
| Descartar medições durante a animação | Lançar imediatamente não reduzia a carga de pixels a tempo do primeiro recolhimento; o teste excedeu 2 s após a apresentação | Guardar a resolução desejada e aplicá-la no primeiro quadro entre animações; teste passou |
| Esperar a primeira apresentação para reduzir o buffer no SwiftShader | Primeira volta ainda teve intervalo de 1 s e apenas dois quadros, embora as seguintes ficassem perto de 20 FPS | SwiftShader inicia em DPR 0,35 antes do primeiro desenho; os outros renderizadores continuam adaptativos |
| Pré-simulação em worker | O cálculo deixa de ocupar o quadro de lançamento; a mesma função e as mesmas entradas continuam produzindo a gravação | Mantida; regressões verificam repetição, seleção cancelada e falha do worker |
| Fixar a pose final antes de publicar | O teste que detectava a pose anterior no momento da notificação passa a exigir a pose gravada, com tolerância de 0,00001 | Mantida; não altera a face sorteada nem a gravação |

## Implementação

- Um worker é iniciado com a cena para carregar Rapier enquanto o usuário escolhe e mira. A gravação só é aceita se ainda pertencer ao arremesso atual. Trocar a seleção descarta respostas antigas; desmontar a cena encerra o worker.
- Se o navegador impedir o worker ou ele falhar, a simulação existente continua funcionando no processo principal. Nesse caso, permanece o custo síncrono de lançamento.
- O monitor reduz a resolução interna quando as amostras permanecem abaixo de 28 FPS e a recupera acima de 55 FPS, entre DPR 0,35 e o DPR inicial. Acumula as medições durante as animações e aplica o alvo assim que a cena pode ser redimensionada. Os controles HTML mantêm a resolução normal. Materiais, sombras, desenhos das faces e regras da física são preservados.
- O renderizador SwiftShader, identificado pelo contexto WebGL, começa em DPR 0,35 antes da primeira pintura. Isso evita tanto o primeiro lançamento em resolução integral quanto o redimensionamento tardio no primeiro recolhimento. Se a identificação não estiver disponível, permanece a adaptação por quadros.
- O worker acrescenta um arquivo de aproximadamente 2,37 MB sem compressão ao build. Não há novas dependências. O aviso de tamanho dos bundles permanece.

## Regressão

```powershell
npm run build
npm run lint
npm test
npx playwright test e2e/coin-performance.spec.ts e2e/coin-software.spec.ts
```

O teste com GPU usa quatro jogadas de dez moedas e exige p95 abaixo de 70 ms e intervalo máximo abaixo de 180 ms em pelo menos três amostras. Verifica também o retorno nas duas fileiras, a face física e os dez textos Cara/Coroa. Os tempos são anexados ao resultado do Playwright.

O teste com SwiftShader exige redução efetiva da resolução, pelo menos quinze quadros de recolhimento no total de três retornos e mediana dos intervalos abaixo de 125 ms. São orçamentos para detectar regressões nesta máquina; não prometem 60 FPS em renderização por software.

## Validação

- Medição final isolada, mesmas condições do diagnóstico, SwiftShader: dez moedas, quatro lançamentos. Rolagem a 22,2–24,8 FPS, com intervalo máximo de 66,7 ms. Os três recolhimentos ficaram em 23,6 / 20,7 / 24,4 FPS; p95 e máximo de aproximadamente 50 ms, inclusive no primeiro retorno. Antes, o retorno ficava em 4,3–5 FPS e chegava a 267 ms. Registro: `screens/transitions-verified-software.json`.
- Build e lint aprovados; 195 testes em 14 arquivos aprovados.
- Bateria completa de 43 E2E aprovada em Chrome com GPU nativa, incluindo o caso dedicado com SwiftShader. Os ajustes finais de DPR foram novamente validados nos quatro E2E de desempenho, cancelamento e recuperação, incluindo pelo menos cinco quadros já no primeiro recolhimento.
- O teste da pose foi observado falhando antes da correção e passando depois. O teste de recolhimento imediato também falhou antes de guardar o DPR desejado e passou depois.
- Build de produção conferido pelo fluxo de chat e teclado: duas jogadas de dez moedas, worker publicado carregado corretamente, resultados renovados e nenhuma exceção. Captura local em `screens/coin-production.png`.
