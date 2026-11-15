import { describe, expect, it } from 'vitest';
import { finishOf, INK_COLORS, inkColorOf, type CustomDie } from '../index.ts';

describe('ink and finish of an imported die', () => {
  const base = { printed: true } as CustomDie;
  it('a record without the fields gets automatic ink when printed, nothing otherwise, and the gem finish', () => {
    expect(inkColorOf(base, '#E8F1F8')).toBe(INK_COLORS.escura); // light gem: dark ink
    expect(inkColorOf(base, '#231C20')).toBe(INK_COLORS.ouro); // dark gem: gold
    expect(inkColorOf({ printed: false } as CustomDie, '#E8F1F8')).toBeNull();
    expect(finishOf(base)).toBe('gema');
  });
  it('honours the player’s choice', () => {
    expect(inkColorOf({ ...base, ink: 'branca' }, '#E8F1F8')).toBe(INK_COLORS.branca);
    expect(inkColorOf({ ...base, ink: 'nenhuma' }, '#E8F1F8')).toBeNull();
    expect(finishOf({ ...base, finish: 'fosco' })).toBe('fosco');
  });
});
