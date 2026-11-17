import type { CustomDie } from '../../dados/index.ts';

export type CampoDaFicha = 'nome' | 'apelido' | 'tinta' | 'acabamento' | 'gema' | 'presagios';

// Which fields the die's sheet offers: the ink only where the model carries engraved numerals, the finish and the gem
// colour only for an STL (a GLB has its own look), and the omens only for a d20 base.
export function camposDaFicha(die: Pick<CustomDie, 'printed' | 'base' | 'file'>): CampoDaFicha[] {
  const stl = die.file.format === 'stl';
  return [
    'nome', 'apelido',
    ...(die.printed ? ['tinta' as const] : []),
    ...(stl ? ['acabamento' as const, 'gema' as const] : []),
    ...(die.base === 'd20' ? ['presagios' as const] : []),
  ];
}
