// Violates: an extracted module imports a legacy file, even on demand.
export const legadoDinamico = () => import('../../dice/outro');
