import { MongoClient } from 'mongodb';
import { buildApp } from './app.ts';
import { rollStore, rollsCollection } from './rolls.ts';

// Starts the API: `npm run dev` (reloads on change) or `npm start`, with the settings in server/.env.
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Defina MONGODB_URI em server/.env (copie server/.env.example).');
  process.exit(1);
}
const client = new MongoClient(uri, { appName: 'dice-roller' });
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? 'diceroller');
const app = buildApp({
  store: rollStore(await rollsCollection(db)),
  ping: () => db.command({ ping: 1 }),
  origins: (process.env.CORS_ORIGIN ?? 'http://127.0.0.1:5173,http://localhost:5173').split(',').map((s) => s.trim()),
  logger: true,
});
const stop = async () => { await app.close(); await client.close(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await app.listen({ port: Number(process.env.PORT ?? 3001), host: process.env.HOST ?? '127.0.0.1' });
