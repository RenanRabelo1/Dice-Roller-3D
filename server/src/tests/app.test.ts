import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db } from 'mongodb';
import { buildApp } from '../app.ts';
import { prepararColecao } from '../modules/historico/index.ts';

// The server shell on a real (in-memory) MongoDB: the health check and CORS. The routes are the modules' tests.
let mongod: MongoMemoryServer, client: MongoClient, db: Db, app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongod.getUri());
  db = client.db('diceroller-test');
  app = buildApp({ rolls: await prepararColecao(db), ping: () => db.command({ ping: 1 }), origins: ['http://localhost:5173'] });
}, 300_000);
afterAll(async () => { await app?.close(); await client?.close(); await mongod?.stop(); });

describe('server shell', () => {
  it('reports its health and lets the dev front end call it', async () => {
    expect((await app.inject({ method: 'GET', url: '/health' })).json()).toEqual({ ok: true, db: 'up' });
    const res = await app.inject({ method: 'OPTIONS', url: '/rolls', headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST' } });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
