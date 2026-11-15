// Allowed: a root helper through the doors (index.ts, cena.ts, contracts.ts as import type).
import { porta } from '../../src/modules/m/index.ts';
import { cena } from '../../src/modules/m/cena.ts';
import type { Contrato } from '../../src/modules/m/contracts.ts';

export const valor: Contrato = { valor: porta + cena };
