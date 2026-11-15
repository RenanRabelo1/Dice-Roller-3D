import { MongoClient } from 'mongodb';

// The MongoDB connection of the server. The modules' repository.ts files are the ones that use its collections.
export async function connect(uri: string, dbName: string) {
  const client = new MongoClient(uri, { appName: 'dice-roller' });
  await client.connect();
  return { db: client.db(dbName), close: () => client.close() };
}
