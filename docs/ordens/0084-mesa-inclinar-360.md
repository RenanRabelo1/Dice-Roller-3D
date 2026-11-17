# Ordem de serviço: mesa, inclinar o fundo 360°

Ordem: OS-0084
Módulo: `mesa`
Escopo de escrita:
- `src/modules/mesa/**`

Objetivo:
- O fundo 360° ganha o controle **Inclinar**, de −90° a 90°, ao lado do **Girar**.
- Com ele, o jogador escolhe ver mais o chão ou mais o céu do panorama atrás da mesa.
- O reflexo do 360° nos dados acompanha a inclinação, como já acompanha o giro.

Decisões do João (2026-11-17):
- **Faixa:** de −90° a 90°.
- **O reflexo nos dados acompanha.**

Leia antes de começar:
- `src/modules/mesa/CLAUDE.md` e `NOTAS.md`, a seção "Fundo 360°"
- `domain/tableTheme.ts`: o tipo `Background` (panorama), a validação (por volta da linha 59), o `extras` (linhas 70, 81 e 98) e o `clampRotation`
- `domain/importacao.ts`, `scene/AmbienteDaMesa.tsx`, `scene/MesaDePrevia.tsx`, `ui/PainelDaMesa.tsx` (o controle **Girar**, por volta da linha 127) e `repository.ts`
- `tests/table.test.ts`, `tests/importacao.test.ts` e `tests/luz.test.ts`

Decisões do orquestrador:

1. **O tema ganha `tilt`, em graus:** `{ kind: 'panorama'; …; rotation: number; tilt: number; … }`.
   - `clampTilt(v)` em `domain/tableTheme.ts` limita a −90…90 e arredonda para inteiro, no mesmo padrão do `clampRotation`.
   - `LIMITS` ganha `panoramaTilt: 90`, se for o padrão do arquivo para os limites dos controles.
2. **Compatibilidade, que é o ponto principal:** mesas salvas no IndexedDB e `.glb` exportados antes desta ordem **não têm** `tilt`.
   - Ao ler (o repositório, o `readExtras` e o `temaDaMesaImportada`), um panorama sem `tilt` vale `tilt: 0` e continua **válido**.
   - A validação não pode descartar um tema antigo por falta do campo.
   - Escreva um teste para cada caminho: o tema salvo sem `tilt` e o `extras` sem `tilt`.
3. **A cena** (`scene/AmbienteDaMesa.tsx`): `backgroundRotation` e `environmentRotation` passam a `[tilt em radianos, rotation em radianos, 0]`.
   - O reflexo acompanha, por decisão do João.
   - Inclinar não recompila shader, assim como girar: a regra do mesmo alvo do cubemap continua valendo.
4. **A janela de prévia** (`scene/MesaDePrevia.tsx`): `scene.backgroundRotation.set(tilt, rotation, 0)`, em radianos.
5. **O painel:** logo abaixo do **Girar**, um `<label className="table-row">Inclinar <input type="range" min={-90} max={90} step={1} value={bg.tilt} …></label>`, com `clampTilt` no `onChange`.
   - Um panorama escolhido agora começa com `tilt: 0`.
   - A fixture `tests/fixtures/painel-antes.json` só muda se o caso dela tiver fundo 360°. Se mudar, acompanhe.
6. **O arquivo `.glb`:** o `extras` do panorama grava o `tilt`, e o `readExtras` o lê, com `clampTilt` e 0 quando faltar.
7. **Testes:**
   - o `clampTilt` nos extremos e no arredondamento;
   - a validação aceitando um tema sem `tilt` e mantendo um com `tilt`;
   - o `extras` gravando e lendo o `tilt`, com a falta virando 0 e o valor fora da faixa sendo limitado;
   - atualize os testes existentes que comparam o panorama com `toEqual`.
8. **Docs do módulo:** no `CLAUDE.md` (a regra do fundo) e no `NOTAS.md` (o tema do 360°, a cena e o `extras`), o `tilt` e a compatibilidade com mesas antigas.

Entregáveis:
1. O `tilt` no tema, na leitura, na cena, na janela, no painel e no arquivo.
2. Os testes e as docs.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` passam.
- Uma mesa 360° salva antes desta ordem continua abrindo, com inclinação 0.
- **Sem E2E nem servidor de dev:** o João testa no navegador.

Fora do escopo:
- O limite de 4096 px do panorama, os panoramas prontos e o suporte a `.exr`.

Se precisar de algo fora disso: pare e reporte. Não implemente.
