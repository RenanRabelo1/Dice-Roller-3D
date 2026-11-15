// Allowed: the platform failure's private store (ADR 0008), named in rule 5.
import { create } from 'zustand';

export const store = create(() => ({ falha: null as string | null }));
