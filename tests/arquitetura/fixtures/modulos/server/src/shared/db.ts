// @ts-nocheck -- fixture: mongodb is installed in server/, not at the root that type-checks it (imports.test.ts).
// Allowed: server/src/shared/db.ts holds the connection.
import 'mongodb';

export const banco = 'db';
