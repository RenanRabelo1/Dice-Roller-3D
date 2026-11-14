// Violates (indexSemReact): the pure door reaches React directly and through a file of its module.
// Allowed: import type of react (erased) and a file without React.
import type { FC } from 'react';
import { useThree } from '@react-three/fiber';
export { puro } from './puro';
export { comReact } from './comReact';

export type Componente = FC;
export const tres = useThree;
