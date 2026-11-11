# Mesa e fundo personalizados: design (fases 1 e 2)

Data: 2026-11-11 · Status: implementada (fases 1 e 2; ver §12) · Branch: `dev-jg`

## 1. Objetivo

O jogador muda o fundo da cena e a aparência da mesa (bandeja), salva isso no navegador e consegue **exportar a mesa como arquivo `.glb`**, editá-la num programa 3D e **importá-la de volta**.

- **Fase 1:** fundo (cor, foto ou tema pronto) e mesa por cores e textura do feltro.
- **Fase 2:** exportar e importar a mesa como `.glb`, com o tema inteiro (cores, texturas e foto do fundo) dentro do mesmo arquivo.
- **Fora (fase 3, depois):** fundo 360° que reflete nos dados; mudar a forma física da mesa (mesa redonda, paredes em outro lugar).

**Regra que vale para tudo:** nada do que o jogador personaliza ou importa muda a física nem os resultados. Os colisores da bandeja continuam os de `trayColliders()` (`src/physics/world.ts`). A mesa personalizada é só o que se vê.

## 2. Como está hoje

| Peça | Onde | O que é |
|---|---|---|
| Fundo | `src/scene/Stage.tsx` | `<color attach="background" args={['#140E10']}>`; reflexos vêm de `Lightformer`s, não do fundo |
| Mesa visível | `src/scene/Tray.tsx` | grupo `tray-surface` (base de madeira 15×0,42×10 e feltro 14×0,08×9, topo do feltro em y = 0) + 4 paredes de madeira (altura 1,5) |
| Física da mesa | `trayColliders()` | chão, 4 paredes e tampa invisível; área interna 14×9 |
| Quebra da mesa (kraken) | `src/scene/Kraken.ts`, `Tray.tsx` | esconde `tray-surface` e desenha cacos com cores **fixas** `FELT #3A0F1A` / `WOOD #815435`, cobrindo 15×10 |
| Canvas | `App.tsx` | o R3F já cria o WebGL com `alpha: true`; hoje o fundo de cor o cobre |
| Armazenamento | `src/dice/customStore.ts` | IndexedDB `dice-roller` v1, store `customDice` |

## 3. Requisitos

| ID | Requisito |
|---|---|
| M1 | Fundo de **cor** (seletor), **foto** do jogador (PNG/JPG/WebP até 15 MB, reduzida para no máximo 4096 px no lado maior) ou **tema pronto** (Taverna, Pôquer, Cosmos) |
| M2 | Foto do fundo com ajuste de **desfoque** (0–20 px) e **escurecer** (0–60%), para os dados continuarem legíveis |
| M3 | Mesa: cor do **feltro**, cor da **madeira** e **textura do feltro**: liso, veludo, couro (geradas pelo app, sem arquivo) ou imagem do jogador repetida (até 2048 px) |
| M4 | Mudanças aparecem na hora, sem recarregar e sem travar animação em curso |
| M5 | A mesa ativa e as salvas ficam no IndexedDB e voltam ao recarregar. Sem IndexedDB, vale só na sessão, com aviso |
| M6 | **Restaurar mesa padrão** sempre disponível (saída para qualquer importação ruim) |
| M7 | A quebra da mesa (crítico do d100) usa as cores da mesa ativa nos cacos e esconde o piso personalizado; as paredes continuam visíveis |
| M8 | **Exportar mesa** baixa `mesa-<nome>.glb` com piso, moldura, guia da área de jogo e o tema (cores, textura e foto) dentro do arquivo |
| M9 | **Importar mesa** aceita só `.glb` autocontido de até 20 MB, 100 mil triângulos e texturas de até 2048 px (foto do fundo até 4096 px) |
| M10 | Na importação, o app **corrige sozinho** escala, eixo (Z para cima) e posição usando a guia da área de jogo; sem guia, usa o piso |
| M11 | O app **remove** luzes, câmeras e animações do arquivo importado |
| M12 | Problemas que não impedem o jogo (moldura invadindo a área, piso fora da altura, tema ausente) viram **avisos** antes de aplicar; problemas que impedem (formato, tamanho, sem piso nem guia) viram **erro** e nada é salvo |
| M13 | Exportar e importar de volta sem editar devolve a mesma mesa (mesmas cores, textura, fundo e encaixe) |
| M14 | Desempenho: com a mesa padrão, nenhuma perda; com mesa importada no limite, o crítico do d100 continua com p95 ≤ 20 ms na GPU de referência (Intel Iris Xe) |

## 4. Fase 1: fundo e mesa por cores

### 4.1 Tema (`src/scene/tableTheme.ts`, puro)

```ts
interface TableTheme {
  version: 1;
  id: string; name: string; createdAt: number;
  background:
    | { kind: 'color'; color: string }
    | { kind: 'preset'; preset: 'taverna' | 'poquer' | 'cosmos' }
    | { kind: 'image'; image: Blob; blur: number; dim: number };
  felt: { color: string; texture: 'liso' | 'veludo' | 'couro' | { image: Blob; tile: number } };
  wood: { color: string };
  model: { name: string; bytes: ArrayBuffer } | null;   // fase 2: mesa importada
}
```

- O tema padrão reproduz a mesa de hoje (`#140E10`, feltro `#3A0F1A`, madeira `#3B2416`, liso), então quem não personaliza não vê diferença.
- Os temas prontos são dados (cores + gradiente CSS), sem imagens no repositório.
- Validação de entrada: cores só em hex, números dentro dos limites, imagens decodificadas com `createImageBitmap` (formato inválido → erro em pt-BR) e reduzidas num canvas antes de salvar.

### 4.2 Fundo

- **Cor:** continua como hoje (`scene.background`).
- **Foto e tema pronto:** ficam **atrás do canvas**, em CSS na `.game-area` (imagem `cover` ou gradiente, com `filter: blur()` e uma camada escura num pseudo-elemento). O `scene.background` fica nulo e o canvas transparente (`alpha: true`, que o R3F já usa). Custo zero na GPU e o desfoque sai de graça.
- Os reflexos dos dados continuam vindo dos `Lightformer`s: o fundo não muda o material dos dados nem recompila shaders.

### 4.3 Mesa

- `Tray.tsx` passa a ler o tema: `meshStandardMaterial` do feltro e da madeira com as cores do tema; textura do feltro como `CanvasTexture` gerada uma vez por tipo (veludo e couro) ou a imagem do jogador com `RepeatWrapping`.
- Trocar textura troca o `map` do material existente (sem desmontar a bandeja).
- **Kraken:** `Kraken.start` recebe `{ felt, wood }` do tema; `shard()` usa essas cores em vez das constantes. Os cacos já são gerados a cada ruptura, então não há custo extra.

### 4.4 Armazenamento

- IndexedDB `dice-roller` sobe para **v2**: o `onupgradeneeded` cria `tables` (`keyPath: 'id'`) sem tocar em `customDice`. A abertura do banco sai de `customStore.ts` para um módulo compartilhado (`src/indexedDb.ts`), usado pelos dois.
- Blobs (foto, textura, `.glb`) vão direto no registro, sem base64.
- O id da mesa ativa fica em `localStorage['mesa.ativa']` (em try/catch; sem ele, volta a padrão).

### 4.5 Interface

Botão **Mesa** no cabeçalho, ao lado do Chat (atalho `M`), abre o painel "Personalizar mesa" no padrão do chat (`aside`, `inert` fechado, `Esc` fecha):

- **Fundo:** Cor · Foto · Tema, com desfoque e escurecer na foto.
- **Mesa:** feltro, madeira, textura.
- **Arquivo (fase 2):** Exportar mesa · Importar mesa · mesas salvas (aplicar, excluir) · Restaurar mesa padrão.

## 5. Fase 2: exportar e importar a mesa

### 5.1 O arquivo exportado

`GLTFExporter` (já incluso no three) com `binary: true, onlyVisible: false`:

```
mesa                      raiz; extras.diceRollerTable = tema (sem blobs) + versão
├─ piso                   some na quebra da mesa
│  ├─ base                madeira 15 × 0,42 × 10
│  └─ feltro              14 × 0,08 × 9, topo em y = 0
├─ moldura                as 4 paredes; pode mudar de forma à vontade
├─ guia-area-de-jogo      caixa 14 × 1,5 × 9 (área onde os dados batem); o app não desenha
└─ fundo                  plano com a foto do fundo como textura (só se o fundo for foto); o app não desenha
```

- Unidade: 1 unidade do app = 1 metro no Blender (o dado tem ~1,4 m de largura ali, e isso é esperado).
- O tema vai em `extras` da raiz `mesa` **e** da cena, porque editores preservam melhor as propriedades de objeto.
- Texturas e foto vão embutidas no `.glb` (um arquivo só, abre em qualquer visualizador 3D).

### 5.2 Importação (`src/scene/tableFile.ts`)

1. **Ler:** mesmo `parseGlb` do importador de dados (`src/dice/importer.ts`): só `data:`/`blob:`, nada de rede; texturas até 2048 px, a de `fundo` até 4096 px.
2. **Limpar:** remover `Light`, `Camera` e animações (luz a mais recompilaria o shader de todos os dados; ver `docs/contexto/armadilhas.md`).
3. **Achar as peças pelo nome**, sem diferenciar maiúsculas e aceitando sufixos do Blender (`piso.001`).
4. **Encaixar:**
   - com `guia-area-de-jogo`: escala, rotação (Z para cima → Y para cima) e posição que levam a caixa da guia para 14 × 1,5 × 9 centrada em (0, 0,75, 0);
   - sem guia: topo do `piso` em y = 0 e piso escalado para 15 × 10;
   - sem guia e sem piso: erro.
5. **Conferir** (vira aviso, não erro): moldura com vértices dentro da área de jogo; topo do piso a mais de 0,1 de y = 0; moldura mais baixa que 1,5; sem `piso` (na quebra da mesa o modelo inteiro some); tema ausente (mantém fundo e cores atuais).
6. **Aplicar e salvar:** o nó `piso` recebe o nome `tray-surface` (o kraken e o test hook já o procuram); o resto ganha sombras por `traverse`.

### 5.3 Exportar → importar sem editar

Teste obrigatório (M13): exportar, importar o mesmo arquivo, e as cores, a textura, o fundo e a caixa da guia batem com a mesa original.

## 6. Guia: editar a mesa do jeito fácil

### 6.1 Só cores e texturas, sem instalar nada — editor do three.js

1. No app: **Mesa → Exportar mesa** (baixa `mesa-<nome>.glb`).
2. Abra <https://threejs.org/editor/> e arraste o arquivo para a janela.
3. Na lista de objetos, clique em `feltro`, `base` ou numa parede da `moldura`. Na aba **Material**, troque a cor ou, em **Map**, escolha uma imagem.
4. **File → Export → GLB**.
5. No app: **Mesa → Importar mesa**.

### 6.2 Mudar o formato da moldura — Blender (gratuito)

1. **Importar:** File → Import → glTF 2.0 → escolha o `.glb`. Você vê `piso`, `moldura`, `guia-area-de-jogo` e, se houver, `fundo`.
2. **Pode mexer à vontade:**
   - a **moldura**: entalhar, arredondar cantos, pôr pés, runas, velas nos cantos, deixar mais alta;
   - materiais e texturas de qualquer peça (arraste uma imagem para a Base Color);
   - acrescentar objetos decorativos, desde que **dentro de `moldura`** (arraste na lista para virar filho dela).
3. **Não mexa:**
   - na `guia-area-de-jogo`: não mova, não escale, não apague (o app usa ela para encaixar sua mesa);
   - no tamanho da cena inteira: não escale tudo de uma vez;
   - no topo do `feltro`: ele marca onde os dados encostam;
   - nos nomes `piso`, `moldura` e `guia-area-de-jogo`;
   - nada da moldura **para dentro** da guia: lá os dados batem em paredes invisíveis e atravessariam o que você desenhou.
4. **Exportar:** File → Export → glTF 2.0 com:
   - **Format:** glTF Binary (`.glb`);
   - **Include → Custom Properties:** marcado (é onde vai o tema);
   - **Transform → +Y Up:** marcado (já vem assim);
   - **Mesh → Apply Modifiers:** marcado;
   - **Include → Cameras / Punctual Lights:** desmarcados (o app removeria de qualquer jeito).
5. No app: **Mesa → Importar mesa**. Se aparecer aviso, leia antes de aplicar.

Dica: deixe a mesa abaixo de 100 mil triângulos e texturas em 2048 px ou menos. No Blender, o modificador **Decimate** reduz triângulos.

## 7. O que acontece se importar errado

Nenhum caso abaixo muda resultados ou a física. O pior que acontece é a mesa ficar feia, e **Restaurar mesa padrão** desfaz tudo.

| Erro | O que você veria sem proteção | O que o app faz |
|---|---|---|
| Exportou em centímetros ou escalou tudo | mesa gigante ou minúscula em volta dos dados | corrige pela guia (M10); sem guia, pelo piso |
| Exportou com Z para cima | mesa em pé | corrige pela guia |
| Moveu a mesa ou o piso | dados flutuando ou afundando no feltro | corrige pela guia; sem guia, alinha o topo do piso em y = 0 |
| Moldura invade a área de jogo | dados atravessando parte da moldura | **aviso** com o que invade; aplica se você confirmar |
| Moldura mais baixa que 1,5 ou apagada | dados quicando numa parede que não aparece | **aviso** |
| Sem nó `piso` | na quebra da mesa, cacos sobre o piso intacto | **aviso**; na quebra, o modelo inteiro some e só os cacos aparecem |
| Sem guia e sem piso | o app não sabe onde fica a área de jogo | **erro**, nada salvo |
| Blender sem Custom Properties | o fundo e as cores do tema não vêm junto | **aviso**; mantém fundo e cores atuais |
| Arquivo `.gltf` com `.bin`/imagens separados | texturas faltando | **erro**: exporte como `.glb` |
| Arquivo pesado (> 20 MB, > 100 mil triângulos, textura > 2048 px) | FPS caindo, principalmente na quebra da mesa | **erro** com o número que estourou |
| Luzes ou câmeras no arquivo | luz estranha e travada ao trocar shaders | removidas (M11) |
| Material muito brilhante ou transparente | mesa estranha | aplica como veio (só visual) |
| Arquivo corrompido ou de outra versão | — | **erro** "não consegui ler esse arquivo" |

## 8. Testes

**Vitest:**
- `tableTheme`: tema padrão igual à mesa de hoje; validação de cores, limites e versão.
- Encaixe: guia em escala 100×, girada (Z para cima) e deslocada volta para 14 × 1,5 × 9 em (0, 0,75, 0); sem guia, pelo piso; sem os dois, erro.
- Conferências: moldura invadindo, piso fora da altura, sem piso e tema ausente geram os avisos certos.
- Limpeza: luz, câmera e animação removidas.
- `shard()` com cores do tema.

**Playwright:**
- Fundo por cor, foto (fixture pequena) e tema; recarregar mantém.
- Feltro e madeira mudam a cor renderizada da mesa (pixel na região do feltro).
- Exportar → importar → mesma mesa (M13). O `GLTFExporter` binário usa `FileReader`, que só existe no navegador; por isso o ida-e-volta fica no E2E.
- Importar uma fixture com problemas (escala, Z para cima, moldura invadindo): encaixe corrigido e avisos mostrados.
- Kraken forçado (`rigOmen`) com mesa personalizada: `trayBroken` liga e desliga, e os cacos usam a cor do feltro.
- Restaurar padrão.
- Test hook: `table()` com o tema ativo e se há modelo importado.

**Desempenho:** crítico do d100 com a mesa padrão e com uma mesa importada perto do limite, no Chrome com GPU, mesmo script de medição (M14).

## 9. Riscos

- **Blender e `extras`:** a ida e volta das Custom Properties pelo Blender precisa ser confirmada na implementação (Blender 4.x). Se falhar, o tema vira aviso (seção 7) e a mesa ainda entra.
- **Fundo transparente e testes de pixel:** os testes que leem pixels do canvas (`smoke`, `screens`) assumem fundo opaco; com foto, o canvas fica transparente. Esses testes continuam com o tema padrão.
- **Foto pesada:** reduzida para 4096 px ao importar; mesmo assim um WebP enorme pode demorar a decodificar. Mostrar "Preparando imagem…".
- **Decoração fora do enquadramento:** moldura muito larga pode sair da tela; é só visual.

## 10. Decisões em aberto

1. Temas prontos: Taverna, Pôquer e Cosmos servem?
2. Limites: foto 15 MB / 4096 px, mesa 20 MB / 100 mil triângulos / 2048 px?
3. Atalho `M` para o painel?

## 11. Ordem de construção

1. `src/indexedDb.ts` (v2) e migração do `customStore.ts`; testes atuais verdes.
2. `tableTheme.ts` + armazenamento + tema padrão idêntico ao atual.
3. Fundo (cor, foto, tema) e mesa (cores, texturas) + painel.
4. Cores do tema nos cacos do kraken.
5. Exportar (`GLTFExporter`).
6. Importar: leitura, limpeza, encaixe, conferências, avisos.
7. Testes, medição de desempenho e atualização de `docs/contexto/` (apresentação: kraken; visão geral: novos arquivos; testes: test hook).

## 12. Implementação e medições (2026-11-11)

Implementada na ordem da seção 11, com os padrões da seção 10 (temas Taverna/Pôquer/Cosmos; foto 15 MB → 4096 px; mesa 20 MB, 100 mil triângulos, texturas 2048 px; atalho `M`). Guia de uso do código: `docs/contexto/mesa.md`.

**Diferenças em relação ao desenho**
- O módulo de montagem da mesa padrão (`scene/tableBuild.ts`) fica separado do de arquivo (`scene/tableFile.ts`) para o GLTFLoader/Exporter não entrar no chunk principal.
- O feltro sempre tem um `map` (um pixel branco quando liso): trocar liso/textura não troca o programa de shader. O pixel branco não vai para o `.glb` exportado.
- O tema ativo é sempre um registro salvo (editar a mesa padrão cria "Minha mesa"); a gravação tem atraso de 300 ms e é forçada no `pagehide`.
- Mesa importada com modelo: cores e textura do painel ficam travadas (vêm do arquivo); o fundo continua editável.
- Aviso novo sem equivalente na seção 7: a foto de fundo pedida pelo tema mas ausente do arquivo.

**Verificação do guia (seção 6)**
- Feito: ida e volta pelo `GLTFExporter` e pelo parse do app (M13, E2E), arquivos montados à mão com escala 100×, Z para cima, deslocamento e moldura invadindo (E2E e Vitest), nomes no estilo Blender (`piso.001`).
- **Não feito:** abrir o arquivo no editor do three.js e no Blender 4.x (nada foi instalado nem baixado). Segue como risco aberto: a ida e volta das Custom Properties pelo Blender e a aparência exata dos passos da seção 6. Se o tema se perder, o app avisa e mantém as cores do modelo.

**Desempenho (M14)** — Chrome 1440×900 com Intel Iris Xe / D3D11, tempo real, `requestAnimationFrame` durante o crítico do d100 forçado por `rigOmen` (do lançamento até o fim da apresentação), três rodadas por caso (`screens/table-performance.json`, `temp/measure-table.mjs`, local):

| Mesa | FPS | p95 | pior quadro |
|---|---|---|---|
| Padrão | 60,0 / 60,1 / 60,1 | 16,9 / 16,9 / 17,0 ms | 33,4 / 17,2 / 17,1 ms |
| Importada no limite (12,6 MB, 96 062 triângulos, textura 2048² de ruído, ornamento de 96 mil triângulos) | 57,9 / 60,1 / 60,0 | 16,9 / 16,9 / 16,9 ms | 233 / 17,1 / 17,1 ms |

p95 ≤ 20 ms nos dois casos. **Custo à parte, uma vez só:** aplicar a mesa pesada congela a página por 1 a 5 s, e a causa está na decodificação do PNG 2048² de ruído pelo navegador (um `createImageBitmap` isolado também deixa a página parada); com textura de 16 px ou ornamento de 64 triângulos o congelamento some ou cai para ~1 s. Texturas reais comprimem melhor, mas a decodificação custa por pixel; fica registrado como limitação conhecida.

**Testes:** `tests/table.test.ts` (15), `e2e/table.spec.ts` (6, incluindo M13 e o upgrade do IndexedDB v1→v2), `e2e/table-kraken.spec.ts` (2).
