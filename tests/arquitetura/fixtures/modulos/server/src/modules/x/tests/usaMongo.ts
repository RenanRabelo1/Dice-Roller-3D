// @ts-nocheck -- fixture: mongodb is installed in server/, not at the root that type-checks it (imports.test.ts).
// Allowed: a module's tests may import mongodb to build their own database.
import 'mongodb';

export const teste = 'x';
