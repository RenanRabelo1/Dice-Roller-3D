// Violates: mesa defines the store of meus-dados (wrong owner, and now it is defined twice).
import { defineStore } from '../../shared/db';

export const deOutro = defineStore('customDice');
