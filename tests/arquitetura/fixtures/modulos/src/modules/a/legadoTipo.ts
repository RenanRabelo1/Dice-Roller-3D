// Violates: an extracted module imports a legacy file, even as a type only.
import type { outro } from '../../dice/outro';

export const legadoTipo: typeof outro = 1;
