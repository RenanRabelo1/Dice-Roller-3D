// Allowed: its own service.ts, contracts.ts, repository.ts and server/src/shared/. Violates: another module's service.ts and a file of its own that is none of the three.
import { servico } from './service.ts';
import type { ContratoX } from './contracts.ts';
import { repositorio } from './repository.ts';
import { banco } from '../../shared/db.ts';
import { servicoY } from '../y/service.ts';
import { interno } from './interno.ts';

export const rotas = (c: ContratoX) => [c, servico, repositorio, banco, servicoY, interno];
