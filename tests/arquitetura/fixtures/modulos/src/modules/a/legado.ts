// Violates: an extracted module imports a legacy file. Allowed: src/shared/.
import { outro } from '../../dice/outro';
import { compartilhado } from '../../shared/compartilhado';

export const legado = [outro, compartilhado];
