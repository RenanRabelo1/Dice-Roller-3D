// Allowed: b through its folder (index.ts) and contracts.ts as import type.
import { b } from '../b';
import type { Contrato } from '../b/contracts';

export const permitido: Contrato = { valor: b };
