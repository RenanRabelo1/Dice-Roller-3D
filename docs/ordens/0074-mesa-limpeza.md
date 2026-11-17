# Ordem de serviço: limpeza da auditoria, mesa

Ordem: OS-0074 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: `mesa`
Escopo de escrita:
- `src/modules/mesa/**`

Objetivo:
- Porta mais estreita, exports só internos e a classe `panel` sem efeito.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **Sem `export`** (Anexo A): `MesaImportada` (`domain/importacao.ts`), `LuzDaMesa` (`domain/luz.ts`), `PLACEHOLDER` (`domain/tableBuild.ts`), `PanoramaFormat` e `isHex` (`domain/tableTheme.ts`).
2. **Fora da porta** (Anexo B):
   - **`index.ts`:** `MesaImportada`, `MesaInspecionada`, `PresetName`, `TableState`, `TableError`, `clampBlur`, `clampDim`, `clampIntensity`, `clampPanoramaBlur`, `clampRotation`, `clampTile`, `fileSafe`, `PRESETS`, `panoramaPicture`, `panoramaTexture`, `preparePanorama`, `reduceImage`, `colorsOf`, `disposeTable` e `carregarArquivoDeMesa`;
   - **`cena.ts`:** `useMesa`.
   - E também os da última linha do Anexo B (`Background`, `DEFAULT_THEME`, `TableTheme`, `temaDaMesaImportada`), trocando o import dos testes do módulo para o arquivo interno, **se** não houver consumidor de fora.
   - Atenção ao `window.__dice` (`src/app/Cena.tsx`) e às ordens das luzes: confira cada nome com `rg`.
3. **A classe `panel`** sai do `<aside>` do `PainelDaMesa`, e o `chat` fica. O fixture `tests/fixtures/painel-antes.json` e o `painel.test.ts` acompanham.
4. **`CLAUDE.md` e `NOTAS.md`:** a seção "Expõe" fica com a porta nova.

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
