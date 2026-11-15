// Violates: a cycle inside server/ (ida.ts ↔ shared/volta.ts), so also modules/z ↔ shared at folder level.
import { volta } from '../../shared/volta.ts';

export const ida = () => volta;
