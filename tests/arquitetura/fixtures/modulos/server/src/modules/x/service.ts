// @ts-nocheck -- fixture: mongodb is installed in server/, not at the root that type-checks it (imports.test.ts).
// Violates: mongodb outside repository.ts and server/src/shared/db.ts.
import 'mongodb';

export const servico = 'x';
