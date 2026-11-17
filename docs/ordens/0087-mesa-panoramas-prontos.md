# Ordem de serviço: mesa, panoramas prontos, fundo padrão 360°, 8K e `.exr`

Ordem: OS-0087
Módulo: `mesa`
Escopo de escrita:
- `src/modules/mesa/**`
- `public/panoramas/` (já tem os arquivos; só leia, ou acrescente um `LICENSE.md`)

Objetivo:
- O fundo 360° ganha **quatro panoramas prontos**, escolhidos por miniatura no capítulo da mesa.
- **O fundo padrão do jogo passa a ser a floresta** (`monks_forest`).
- O 360° fica **nítido em tela grande**: até 8192 px no perfil completo.
- O 360° passa a **aceitar `.exr`**.

Decisões do João (2026-11-17):
- O fundo padrão é um panorama pronto.
- **Pode baixar os panoramas do Poly Haven** (CC0). O orquestrador já baixou e preparou os quatro.
- **A angulação mais imersiva de cada um** fica com o orquestrador, que ajusta depois desta ordem com capturas.
- **"Cuidado com o pixelado":** 8K no perfil completo, "se não ficar pesado demais".

Os arquivos, em `public/panoramas/`, todos 8192 × 4096 com uma miniatura `-mini.jpg` de 320 × 160:

| Id | Nome no painel | Tamanho |
|---|---|---|
| `monks_forest` | Floresta | 7,0 MB |
| `fireplace` | Lareira | 3,9 MB |
| `cobblestone_street_night` | Rua de pedra | 6,9 MB |
| `rogland_clear_night` | Noite estrelada | 8,3 MB |

Leia antes de começar:
- `src/modules/mesa/CLAUDE.md` e `NOTAS.md` ("Fundo 360°", o `tilt` da OS-0084 e a janela de prévia da OS-0082)
- `domain/tableTheme.ts` (`Background` do panorama, `DEFAULT_THEME`, `LIMITS`, a validação, `extras`, `migrarTema`), `domain/tableImages.ts` (`preparePanorama`, `panoramaTexture` e o cache por blob, `panoramaPicture`, o teto de pixels com `renderizadorPorSoftware`), `repository.ts`, `domain/tableFile.ts` (exportar), `ui/PainelDaMesa.tsx`, `scene/AmbienteDaMesa.tsx` e `scene/MesaDePrevia.tsx`
- `src/shared/plataforma/index.ts` (`perfilLeve`, ADR 0011) e [docs/contexto/armadilhas.md](../contexto/armadilhas.md) (o cubemap e não recompilar shader)

Decisões do orquestrador:

1. **Catálogo dos prontos**, puro, em `domain/panoramas.ts`:
   - `PANORAMAS: { id; nome; arquivo; mini; rotation; tilt }[]`, com os quatro da tabela;
   - `rotation` e `tilt` começam em 0, e o orquestrador ajusta depois;
   - o `arquivo` e a `mini` são caminhos relativos à base do Vite: `${import.meta.env.BASE_URL}panoramas/<id>.jpg`.
2. **O tema guarda a referência, não a foto.** O panorama passa a ser **uma de duas origens**:
   - `{ kind: 'panorama', image: Blob, format, … }`: o arquivo do jogador, como hoje;
   - `{ kind: 'panorama', pronto: '<id>', … }`: um pronto. **Nada de foto no IndexedDB**, porque cada mesa salva duplicaria 7 MB.

   Regras:
   - **Formato:** `format` vale `'ldr'` para os prontos. A validação e o `extras` aceitam as duas formas.
   - **Id desconhecido** (um pronto que saiu do jogo) cai no `DEFAULT_THEME`.
   - **Carregar:** o `panoramaTexture` de um pronto busca o arquivo (`fetch`) e usa o mesmo cache, com a chave pelo id.
   - **Exportar `.glb`:** um pronto vai como a foto, por `panoramaPicture` a partir do arquivo buscado, então o arquivo exportado continua sendo autossuficiente. Ao importar, volta como `image`.
   - **Compatibilidade:** mesas salvas antes continuam como estão. A `migrarTema` só preenche o que faltar.
3. **O fundo padrão:** o `DEFAULT_THEME.background` passa a ser `{ kind: 'panorama', pronto: 'monks_forest', rotation/tilt do catálogo, intensity: 1, blur: 0, reflect: true }`.
   - **Para não pesar a primeira tela:** a cena desenha o fundo de cor escuro de hoje (`#140E10`) até a textura do pronto chegar, e só então troca. O `AmbienteDaMesa` já espera o `podeTrocar`, então mantenha isso.
   - **Sem WebGL ou com erro ao baixar:** fica a cor, sem quebrar nada.
4. **Nitidez e peso:**
   - o `LIMITS.panoramaPx` passa a **8192 no perfil completo** e continua **4096 no perfil leve** (`perfilLeve()`) e no renderizador por software (hoje 2048, mantenha);
   - a redução continua no carregamento, então um 8K no perfil leve vira 4K na memória;
   - **arquivos do jogador também ganham os 8K** no perfil completo. O limite em bytes (`panoramaBytes`) sobe para 20 MB.
5. **`.exr`:**
   - o `preparePanorama` aceita `.exr` como aceita `.hdr`: guarda como veio, até `panoramaHdrBytes`, que sobe para 40 MB porque os EXR do Poly Haven em 4K têm uns 30 MB;
   - o `panoramaTexture` lê com o `EXRLoader` do three, em `import()` dinâmico como o `HDRLoader`, com o mesmo tratamento do HDR (2:1, redução 2×2 e half float);
   - `format` ganha `'exr'`;
   - **exportar:** vira JPEG, como o HDR, e o painel avisa;
   - **aceite do input:** `.exr` entra no `accept`;
   - **a ajuda do 360°:** passa a dizer ".hdr ou .exr até 40 MB; .jpg, .png e .webp até 20 MB", lidos de `LIMITS`;
   - **testes:** o teste que espera recusa de `.exr` muda para esperar aceitação.
6. **O painel:** com o fundo 360°, acima do botão de arquivo aparece uma linha **"Prontos"** com as quatro miniaturas (`<button aria-label="Panorama <nome>" aria-pressed>` com a `<img>` da mini e o nome embaixo).
   - **Escolher um pronto:** aplica `{ pronto, rotation, tilt }` do catálogo.
   - **Os controles** Girar, Inclinar, Brilho, Desfoque e Refletir continuam valendo para os dois tipos.
   - **O botão "Arquivo…"** continua, para o 360° próprio.
7. **A janela de prévia** (OS-0082) mostra o pronto do mesmo jeito.
8. **Licença:** `public/panoramas/LICENSE.md` com "Panoramas do Poly Haven (polyhaven.com), CC0 1.0, domínio público", com a lista dos quatro.
9. **Testes:**
   - o catálogo;
   - a validação e o `extras` com `pronto` e com id desconhecido;
   - o `DEFAULT_THEME` novo;
   - a migração de tema antigo;
   - o `.exr` aceito;
   - o teto de pixels por perfil;
   - **as fixtures do painel acompanham.** O DOM de uma mesa padrão muda, porque o padrão agora é 360°.
   - **E2E:** os testes que dependem do fundo padrão ser cor podem quebrar. **Não rode E2E:** liste no relatório quais specs leem o fundo padrão (`grep` em `e2e/` por `background` e `backgroundColor`) para o orquestrador ajustar.
10. **Docs do módulo:** `CLAUDE.md` e `NOTAS.md` (os prontos, o padrão, 8K e perfil, `.exr` e a licença).

Entregáveis:
1. O catálogo e o tema com `pronto`.
2. O padrão novo.
3. 8K por perfil e `.exr`.
4. O painel com as miniaturas.
5. Testes, docs e licença.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` passam.
- Uma mesa salva antes continua abrindo igual.
- O primeiro desenho não espera o panorama.
- **Sem E2E nem servidor de dev:** o orquestrador ajusta os E2E e o João testa.

Fora do escopo:
- A angulação de cada pronto, que fica com o orquestrador, e a pausa da cena com o livro aberto (casca).

Se precisar de algo fora disso: pare e reporte. Não implemente.
