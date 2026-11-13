// Allowed: the owner's store and the owner's key, in its repository.ts.
import { defineStore } from '../../shared/db';

export const store = defineStore('tables');
export const ativa = () => localStorage.getItem('mesa.ativa');
