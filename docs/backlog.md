# Próximas features (a especificar)

Combinado com o usuário em 2026-11-11: estas entram **depois** das pendências atuais (exportar textura em JPEG, travada ao aplicar mesa pesada, falhas antigas do `screens.spec` e proteção contra falha de WebGL/física). Cada uma precisa de spec própria em `docs/superpowers/specs/` antes de implementar. Ao especificar, mova o item para a spec e deixe aqui só o link.

## 1. Dado importado de forma livre (caminho B)

- **O quê:** importar dados que não são d4–d20: d3, d7, d30, dado-caveira, cristal, qualquer forma convexa com faces planas.
- **De onde parte:** o caminho A (`docs/superpowers/specs/2026-11-11-importar-dado-design.md`, `src/dice/importer.ts`) já detecta faces planas pelo casco e reconstrói o poliedro pelos planos. O B tira a exigência de bater com 4/6/8/10/12/20 faces.
- **O que muda:**
  - a física e a leitura usam o poliedro do próprio modelo; o worker já recebe os poliedros importados no `RollRequest`;
  - numeração sempre calibrada (não existe layout padrão), sem sugestão de face oposta quando não houver oposta;
  - presságios: decidir se um dado de forma livre pode contar como crítico/falha.
- **Perguntas para a spec:** quantas faces no mínimo e no máximo? Dado justo importa (formas irregulares caem mais numa face)? Como o chat chama esses dados (`2d7caveira`)?

## 2. Fundo 360° (fase 3 da mesa)

- **O quê:** foto panorâmica (2:1, equirretangular) como ambiente: aparece em volta da mesa e **reflete nos dados de gema**.
- **De onde parte:** fases 1 e 2 em `docs/superpowers/specs/2026-11-11-mesa-e-fundo-design.md` e `docs/contexto/mesa.md`. Hoje o fundo de foto é CSS atrás do canvas e os reflexos vêm de `Lightformer`s.
- **Cuidados:** trocar o mapa de ambiente pode recompilar shaders (ver `docs/contexto/armadilhas.md`); custo de PMREM ao trocar; tamanho da imagem; medir o crítico do d100 com o fundo 360° ligado.
- **Perguntas para a spec:** substitui os `Lightformer`s ou soma? Aceita `.hdr`/`.exr` ou só JPG/PNG? Vai dentro do `.glb` da mesa?

## 3. Números pintados no dado importado, também na mesa

- **O quê:** hoje a gravação do dado importado é pintada de escuro só na prévia do assistente (`inkOf` em `src/dice/importer.ts`). Levar isso para o dado na mesa, para os números esculpidos ficarem legíveis durante o jogo.
- **Por que ficou de fora:** o material de gema é translúcido (`meshPhysicalMaterial` com clearcoat); pintar por cor de vértice muda o visual da gema e precisa de cuidado com desempenho (10 dados de até 50 mil triângulos).
- **Perguntas para a spec:** cor da tinta escolhida pelo jogador (dourado, preto, branco)? Opção de acabamento fosco para dados importados? Vale para GLB que já tem textura própria?
