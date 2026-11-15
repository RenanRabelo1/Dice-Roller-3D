// Allowed: b through its folder (index.ts), contracts.ts as import type, and c's scene door (cena.ts, ADR 0010).
import { b } from '../b';
import type { Contrato } from '../b/contracts';
import { cena } from '../c/cena';

export const permitido: Contrato = { valor: b };
export const desenha = cena;
