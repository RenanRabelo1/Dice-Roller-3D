# Revisão da arquitetura — DiceRoller 3D

**Parecer: viável, com correções antes da execução.** A separação entre geometria/leitura, lançamento, configuração física, cena e controles é adequada. React 19 + Fiber 9 + Rapier 2 são compatíveis; o Rapier 0.19.2 fixado para os testes corresponde à dependência do wrapper 2.2.0. Não é necessário trocar a stack nem o visual aprovado.

Alvo: [spec de design](../specs/2026-11-08-dice-roller-3d-design.md), commit `a25b995`. Linhas abaixo correspondem à versão revisada, de 211 linhas. Esta revisão não altera a spec nem implementa o projeto.

## Correções necessárias

### R1 · P1 — Finalizar pelo estado atual dos corpos, não pelo histórico de reportes

**Spec:127–128.** Um dado A pode dormir e reportar 4; B colide com A e o desperta; B dorme; todos já reportaram, mas A continua rolando. O mesmo ocorre após o empurrão de recuperação. O painel pode fechar com valor antigo.

**Correção:** `onSleep` é um sinal, não o resultado definitivo. Invalidar o reporte em `onWake`; após um passo físico, confirmar que todos os corpos do arremesso atual estão dormindo e sem recuperação pendente. Capturar as rotações e publicar todos os valores juntos. Associar callbacks a um identificador de arremesso para descartar eventos após troca de tipo/quantidade. Testar A dorme → A acorda → B dorme: ainda não pode finalizar. [Sono/despertar do Rapier](https://rapier.rs/docs/user_guides/javascript/rigid_body_sleeping/).

### R2 · P1 — O gate TypeScript pode passar sem verificar a aplicação

**Spec:85,193,196.** O template React TS do Vite usa um `tsconfig.json` com `files: []` e referências aos projetos da aplicação e do Vite. Nesse formato, `tsc --noEmit` na raiz não percorre automaticamente os projetos referenciados; `vite build` sozinho também não substitui a checagem de tipos.

**Correção:** usar o build do template, `tsc -b && vite build`, e garantir que os projetos de checagem incluam também testes e E2E. Manter os comandos do gate alinhados aos scripts efetivamente criados. O template consultado atualmente usa Oxlint; caso a escolha seja ESLint, sua instalação/configuração precisa fazer parte do scaffold. [Configuração oficial do template](https://github.com/vitejs/vite/blob/main/packages/create-vite/template-react-ts/tsconfig.json), [scripts oficiais](https://github.com/vitejs/vite/blob/main/packages/create-vite/template-react-ts/package.json), [project references do TypeScript](https://www.typescriptlang.org/docs/handbook/project-references.html).

### R3 · P1 — Definir um Node suportado pelo Vitest escolhido

**Spec:81–94.** O ambiente local retorna `node v25.9.0`. O pacote Vitest 5.1.0 declara `engines.node = ^22.12.0 || ^24.0.0 || >=26.0.0`, excluindo Node 25. A instalação pode apenas avisar, mas isso não torna a combinação suportada.

**Correção:** executar o projeto com Node 24 LTS e registrar essa versão no setup antes de instalar dependências. Não atualizar Node nem trocar Vitest silenciosamente durante a implementação. [Metadados oficiais do Vitest 5.1.0](https://registry.npmjs.org/vitest/5.1.0).

### R4 · P2 — Timeout e recuperação precisam terminar na pose publicada

**Spec:127–129,169–170.** O fluxo normal depende de sono, enquanto a recuperação desperta o corpo e o timeout manda apenas ler. Se o corpo continuar dinâmico após oito segundos, a face visível pode mudar depois da publicação.

**Correção:** integrar recuperação e timeout ao mesmo protocolo de conclusão de R1. No timeout, capturar e congelar todos os corpos nas mesmas poses antes de publicar a leitura aproximada já prevista. Contar as tentativas de recuperação por corpo/arremesso e invalidar a leitura anterior ao empurrar. Usar o tempo de simulação para o limite físico, inclusive nos testes.

### R5 · P2 — A inclinação do d4 precisa de uma regra própria

**Spec:133–135.** A leitura do d4 é por vértice, mas a única fórmula de inclinação descrita usa normal de face. Num tetraedro regular corretamente apoiado, a melhor normal de face faz `acos(1/3) ≈ 70,53°` com +Y. Aplicar o limite genérico de 15° marcaria um apoio correto como encostado.

**Correção:** para d4, medir a inclinação do vetor normalizado centro → vértice superior, transformado pelo quaternion; no apoio correto o ângulo é 0°. Testar esse caso. Na linha 176, esclarecer que a unicidade é dos valores lógicos: o desenho do d4 repete cada número em três faces, conforme a linha 46. O cálculo de 70,53° foi reproduzido com uma checagem matemática independente; não é um defeito observado em código já implementado.

### R6 · P2 — Delimitar e cancelar a entrada de arremesso

**Spec:61,68,76,123–126.** Clique/toque/Espaço têm funções na cena e nos controles HTML. Sem delimitação, Espaço num botão pode também lançar; perder foco ou receber `pointercancel` pode deixar a carga presa.

**Correção:** iniciar gestos apenas na área de jogo, com foco de teclado identificável; preservar os eventos nativos dos controles HTML. Registrar a origem da carga e o `pointerId`, usar captura do ponteiro e cancelar para `hand` em cancelamento/perda de captura ou foco. Ignorar repetição de tecla e aceitar a soltura somente da entrada que iniciou a carga. Definir `touch-action` na área de gesto. Cobrir esses caminhos e a troca de tipo/quantidade durante carga e rolagem.

### R7 · P2 — Os testes precisam ligar corpo, numeração e resultado

**Spec:180–187.** Verificar faixa e soma não detecta um painel com números válidos que discordem dos dados renderizados. A linha 181 também permite interpretar o máximo d100 como dez corpos, apesar de a linha 123 exigir vinte.

**Correção:** acrescentar uma integração da cena real com poses conhecidas, verificando identidade do corpo, orientação/numeração e valor publicado após a transição mão → arremesso → sono. Incluir despertar após sono e timeout. No máximo selecionável, testar d100 × 10 como vinte corpos, dez pares e dez resultados; preservar os dígitos brutos 0–9 na combinação, convertendo 0 para 10 somente no d10 isolado. Colisores automáticos devem ficar desativados onde houver o casco explícito compartilhado com Node. [Colisores do wrapper](https://pmndrs.github.io/react-three-rapier/#automatic-colliders).

### R8 · P2 — Configurar o WebGL por software dos E2E

**Spec:94,184,206.** `channel: 'chrome'` seleciona o executável instalado; não seleciona renderização por software. A configuração atual não garante o ambiente descrito pelo gate.

**Correção:** configurar explicitamente o modo de teste, por exemplo `launchOptions.args: ['--use-gl=angle', '--use-angle=swiftshader']`, conforme suporte do Chrome instalado. Verificar criação de contexto e renderer antes dos cenários. Timeouts maiores tratam lentidão, não falta de contexto. A documentação do Chromium descreve separadamente o driver SwiftShader e o fallback WebGL, cujo uso exige opt-in. [Configuração oficial do SwiftShader](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md).

### R9 · P2 — Definir como os números continuam visíveis na gema

**Spec:54,89,146.** Posicionar uma malha `Text` literalmente dentro de uma casca contínua pode ocultá-la: o passe compartilhado exclui os dados, e a superfície da gema pode ficar à frente do texto no teste de profundidade. É um risco deduzido da composição proposta, ainda não observado numa implementação.

**Correção:** definir os glifos como marcações na superfície, com compensação de profundidade e aparência de gravação, em vez de apenas deslocar `Text` para dentro da casca. Validar um único dado antes de replicar para todos: numeração legível de vários ângulos e em 390 px. Isso preserva o visual aprovado sem exigir subtração geométrica. [Material de transmissão](https://drei.docs.pmnd.rs/shaders/mesh-transmission-material), [profundidade do texto Troika](https://protectwise.github.io/troika/troika-three-text/#depthoffset).

### R10 · P2 — Completar a fronteira de falhas gráficas

**Spec:166–167.** O fallback do Canvas está previsto e o erro de WASM tem mensagem própria, mas falhas do renderer/contexto também precisam de proteção. Não se deve apresentar toda falha gráfica como erro de física.

**Correção:** colocar uma error boundary externa ao `Canvas`, conservar o fallback e distinguir falha gráfica de falha de física. Usar Suspense para o carregamento assíncrono de Physics e fontes. Verificar essas mensagens em cenários de falha. [Tratamento oficial de erros do Canvas](https://r3f.docs.pmnd.rs/api/canvas#errors-and-fallbacks), [Physics e Suspense](https://pmndrs.github.io/react-three-rapier/#the-physics-component).

## Observações para a execução

- **Buffer compartilhado é viável.** Há um passe de captura compartilhado além do render final; isso não significa que a cena inteira seja desenhada uma única vez. A exclusão dos dados impede que eles apareçam na refração uns dos outros: limitação a registrar, não motivo para trocar a stack. A adaptação de qualidade deve redimensionar o FBO externo, não apenas a propriedade `resolution` dos buffers internos do material. [Drei](https://drei.docs.pmnd.rs/shaders/mesh-transmission-material), [PerformanceMonitor](https://drei.docs.pmnd.rs/performances/performance-monitor).
- **Local não garante offline.** Se o app inteiro precisar funcionar sem rede, fornecer fonte local com `0123456789.` e carregá-la explicitamente em `Text`; a iluminação procedural resolve apenas a dependência do HDRI. A spec não estabelece offline para o app inteiro, portanto isto é esclarecimento, não bloqueio. [Fontes do Troika](https://protectwise.github.io/troika/troika-three-text/#font).
- **Qui-quadrado é diagnóstico.** Sementes fixas tornam a bateria repetível; `p > 0,001` não comprova justiça para toda combinação de mira/força/orientação. Não ampliar o escopo com uma infraestrutura estatística. Testar ao menos que dezenas e unidades do d100 recebem estados distintos; investigar distribuição se a calibração indicar viés.
- **Reduced motion:** aplicar também ao voo decorativo de recolher; manter a física do arremesso como já decidido. Nenhum FPS, contraste ou acabamento visual foi medido nesta revisão documental.

## Handoff para o Claude

1. Incorporar R1–R10 à spec, preservando as decisões aprovadas da seção 2. Resolver primeiro o protocolo de conclusão, a leitura do d4 e o setup dos gates.
2. Produzir o plano de execução a partir da spec corrigida. Começar por geometria/leitura, estado e física testáveis; validar um dado com numeração antes de expandir a cena.
3. Executar e reportar os gates reais. Não tratar esta revisão como prova de build, testes ou FPS aprovados.

## Cobertura e evidências

- Guia consultado pelo Obsidian CLI: `SegundoCérebro/04-Recursos/Guia de Skills por Aplicação.md`.
- Superpowers: template `brainstorming/spec-document-reviewer-prompt.md` e `requesting-code-review`, com três revisores independentes e contextos restritos; `receiving-code-review` para conferir/deduplicar achados e `verification-before-completion` para conferir as evidências. Os templates de código foram adaptados à revisão de design ainda não implementado.
- Critérios consultados: coerência, viabilidade e escopo do `ce-doc-review`; separação de responsabilidades do Kernel/Architecture Overhaul; acessibilidade e performance do guia. Não foi executado o pipeline completo do ce-doc-review, nem revisão externa por outro provedor. Ponytail e writing-for-agents orientaram o tamanho do handoff.
- `context-optimization`: não localizada nas skills locais de Claude, Codex, Agents ou caches pesquisados. O próprio guia marca sua instalação como pendente de conferência. Nenhuma skill foi instalada; a revisão usou leitura seletiva e contextos separados.
- As versões listadas foram consultadas no registro npm. Conferidas as dependências/peers e a correspondência Rapier 2.2.0 → engine 0.19.2. Não há lockfile ou projeto React instalado para validar resolução efetiva.
- Reproduzido o cálculo da inclinação do tetraedro com assert. Conferidas as fontes oficiais de R1/R2/R8/R9/R10; achados de renderização permanecem inferências até o protótipo.
- Não aplicáveis nesta etapa: revisão de diff de implementação, simplify/security-review de código 3D, auditoria de browser ou loop de execução. O alvo é a spec; o app atual permanece 2D. Não foram executados build, lint, Vitest ou Playwright.

SHA-256 da spec revisada: `756D66D18788E4C5477168A9D69E1E2F9A36D50D6AF208032DE2131133782F1A`.
