# Referências Three.js

Ao implementar os dados 3D, consulte os fontes oficiais em `references/threejs/`:

- `physics_rapier_basic.html`: gravidade, colisões, restituição e sincronização entre física e meshes; base para dados e paredes da bandeja.
- `physics_ammo_break.html`: `initInput()` usa Raycaster para lançar objetos; adapte a velocidade fixa para direção e intensidade do gesto. Aproveite os colisores convexos; a fratura é dispensável.
- `misc_controls_drag.html`: DragControls e seleção de grupos para os dados acompanharem o mouse antes do lançamento.
- `webgl_geometries.html`: formas D4/D6/D8/D20. D12 usa `DodecahedronGeometry`; D10/D100 precisam de adaptação.

São fontes para adaptação, com imports/assets relativos ao repositório original; não executam isoladamente. Rapier e Ammo são alternativas de física.

[Origem fixada](https://github.com/mrdoob/three.js/tree/877e9c9f39c60f929b5018372a8c953f5beabc1b/examples). Licença MIT em `references/threejs/LICENSE`.
