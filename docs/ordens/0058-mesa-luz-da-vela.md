# Ordem de serviço: mesa, a luz da vela

Ordem: OS-0058 (HUD imersivo, parte 2, ordem 3 de 6)
Módulo: `mesa`
Escopo de escrita:
- `src/modules/mesa/**`
- **Casca:** `src/app/Cena.tsx`, só a cor e a intensidade das duas luzes base passadas em `luzes`

Objetivo:
- A mesa ganha uma luz de vela, quente e com tremor suave, que muda com o tema.
- A luz-chave da casca fica um pouco mais quente, para a cena deixar de parecer "chapada".

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), parte 2: luz e orçamento
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md), a seção Desempenho
- `src/modules/mesa/CLAUDE.md`, `scene/AmbienteDaMesa.tsx`, `domain/tableTheme.ts` (`TableTheme`, `PRESETS`) e `ui/useMesa.tsx`
- `src/app/Cena.tsx`, o trecho do `<AmbienteDaMesa luzes={…}>`

Decisões do orquestrador:

1. **A regra é pura**, em `domain/luz.ts`. A função é `luzDaMesa(tema: TableTheme): { cor: string; intensidade: number; tremor: boolean }`, decidida pelo fundo:

   | Fundo do tema | Cor | Intensidade | Tremor |
   |---|---|---|---|
   | `color` (o padrão) | `#ff9a4a` | 6 | sim |
   | `preset` `taverna` | `#ff9a4a` | 7 | sim |
   | `preset` `poquer` | `#ffe2b0` | 5 | não |
   | `preset` `cosmos` | `#8fa8ff` | 3 | não |
   | `image` | `#ffb070` | 5 | sim |
   | `panorama` | `#ffd2a0` | 2 | não (o HDRI já ilumina) |

   - Mesa importada (`tema.model`) segue a mesma tabela, pelo fundo.
   - Um tema novo em `PRESETS` sem linha aqui cai no `color`. O teste garante que todo preset tem linha.
   - **Não mude o formato do `TableTheme`** nem o que vai para o IndexedDB: a luz é derivada, não gravada.

2. **O tremor é determinístico**, em `domain/luz.ts`, igual ao fogo dos presságios:

   ```ts
   export const tremorDaVela = (ms: number) => 0.85 + 0.15 * Math.sin(ms / 130) * Math.sin(ms / 310);
   ```

   Sem `Math.random`: assim, as capturas e os E2E são repetíveis.

3. **A luz na cena:** componente `scene/VelaDaMesa.tsx`, renderizado pelo `AmbienteDaMesa` ao lado das `luzes` da casca.
   - É um `<pointLight>` com `ref`, posição `[-6, 3.5, -4]` (fora da bandeja, ao fundo e à esquerda), `distance={18}`, `decay={2}` e **sem** sombra.
   - Ela é montada sempre, sem condição.
   - No `useFrame`:
     - `intensity = renderizadorPorSoftware() ? 0 : l.intensidade * (l.tremor && !movimentoReduzido() ? tremorDaVela(clock) : 1)`;
     - `color.set(l.cor)`, com `l = luzDaMesa(tema)`. Leia o tema do próprio store, sem render a cada quadro.
   - Trocar de tema muda cor e intensidade, nunca o número de luzes. Por isso pode acontecer a qualquer hora, sem o `podeTrocar`.

4. **Casca, luzes base** no `Cena.tsx`, só estes dois valores:
   - `<ambientLight intensity={0.28} />` (era 0,35);
   - a `<directionalLight>` ganha `color="#fff1dc"`.

   Posição, sombra e `shadow-*` não mudam.

5. **Docs do módulo.** O `CLAUDE.md` da `mesa` registra:
   - a vela: a regra pura, a tabela, montada sempre e apagada no software;
   - que o tema não guarda luz.

6. **Teste** em `tests/luz.test.ts`:
   - a tabela inteira;
   - todo `PRESETS` tem linha;
   - `tremorDaVela` fica entre 0,7 e 1.

Entregáveis:
1. `domain/luz.ts` e o teste.
2. `VelaDaMesa` no `AmbienteDaMesa`.
3. As duas linhas do `Cena.tsx`.
4. A doc.

Critérios de aceite:
- A luz aparece no JSX sem condição.
- O `TableTheme` e o repositório da mesa não mudam (`git diff` em `contracts.ts` e `repository.ts` vazio).
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam.
- **Sem E2E no dev.** As cores dos cacos (`table-kraken`) não dependem de luz, e o orçamento é medido na OS-0061.

Fora do escopo:
- Trocar o fundo padrão (decisão do João).
- Sombra da vela.
- Partículas ou chama visível.

Se precisar de algo fora disso: pare e reporte. Não implemente.
