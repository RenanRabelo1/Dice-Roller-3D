import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import { buildApp } from '../src/app.ts';
import { rollStore, rollsCollection } from '../src/rolls.ts';

// The real API on a real (in-memory) MongoDB: validation, the collection's own rules, the index and paging.
let mongod: MongoMemoryServer, client: MongoClient, db: Db, app: ReturnType<typeof buildApp>;
const ana = '0b6c9a3e-4f1d-4c2a-9e8b-1a2b3c4d5e6f', bia = '7e1f0a9b-2c3d-4e5f-8a9b-0c1d2e3f4a5b';
const post = (body: object) => app.inject({ method: 'POST', url: '/rolls', payload: body });
const page = (query: string) => app.inject({ method: 'GET', url: `/rolls?${query}` });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongod.getUri());
  db = client.db('diceroller-test');
  app = buildApp({ store: rollStore(await rollsCollection(db)), ping: () => db.command({ ping: 1 }), origins: ['http://localhost:5173'] });
}, 300_000);
afterAll(async () => { await app?.close(); await client?.close(); await mongod?.stop(); });

describe('roll history API', () => {
  it('saves a throw with the total and omen worked out by the server, and gives it back', async () => {
    const res = await post({ playerId: ana, dice: [{ kind: 'd20', value: 20 }, { kind: 'd6', value: 3 }, { kind: 'coin', value: 1 }], force: 0.73 });
    expect(res.statusCode).toBe(201);
    const saved = res.json();
    expect(saved).toMatchObject({ total: 23, omen: 'crit', force: 0.73, dice: [{ kind: 'd20', value: 20 }, { kind: 'd6', value: 3 }, { kind: 'coin', value: 1 }] });
    expect(ObjectId.isValid(saved.id)).toBe(true);
    expect(Date.parse(saved.createdAt)).toBeGreaterThan(0);
    expect((await page(`playerId=${ana}`)).json().rolls[0]).toEqual(saved);
  });

  it('works out duality and the Cthulhu d100 the same way the table does', async () => {
    expect((await post({ playerId: bia, dice: [{ kind: 'd20', value: 20 }, { kind: 'd100', value: 100 }] })).json()).toMatchObject({ omen: 'duality', total: 120, force: null });
    expect((await post({ playerId: bia, dice: [{ kind: 'd100', value: 1 }] })).json().omen).toBe('crit');
    expect((await post({ playerId: bia, dice: [{ kind: 'vtm', value: 10 }, { kind: 'fire', value: 6 }] })).json()).toMatchObject({ omen: null, total: 16 });
  });

  it('keeps an imported die with its solid, and counts it as a d20 for omens only when the player asked', async () => {
    const skull = 'custom:4f1d9e8b-1a2b-4c3d-8e5f-0a1b2c3d4e5f';
    const on = (await post({ playerId: ana, dice: [{ kind: skull, value: 20, base: 'd20', omens: true }, { kind: 'd6', value: 2 }] })).json();
    expect(on).toMatchObject({ total: 22, omen: 'crit', dice: [{ kind: skull, value: 20, base: 'd20', omens: true }, { kind: 'd6', value: 2 }] });
    expect((await post({ playerId: ana, dice: [{ kind: skull, value: 20, base: 'd20', omens: false }] })).json().omen).toBeNull();
    expect((await post({ playerId: ana, dice: [{ kind: skull, value: 20, base: 'd20' }] })).json()).toMatchObject({ omen: null, dice: [{ omens: false }] });
    expect((await post({ playerId: ana, dice: [{ kind: 'd20', value: 20, base: 'd4' }] })).json().dice).toEqual([{ kind: 'd20', value: 20 }]); // a built-in die keeps no base
  });

  it('records a free-form die: any whole value from -99 to 999, a negative total, and never an omen', async () => {
    const free = 'custom:9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
    const res = await post({ playerId: ana, dice: [{ kind: 'd20', value: 7 }, { kind: free, value: -5, base: 'livre', omens: true }] });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ total: 2, omen: null, dice: [{ kind: 'd20', value: 7 }, { kind: free, value: -5, base: 'livre', omens: false }] });
    expect((await post({ playerId: ana, dice: [{ kind: free, value: -99, base: 'livre' }, { kind: free, value: 0, base: 'livre' }] })).json().total).toBe(-99);
    expect((await post({ playerId: ana, dice: [{ kind: free, value: 999, base: 'livre' }] })).json().total).toBe(999);
  });

  it.each([
    ['a free-form die over 999', { playerId: ana, dice: [{ kind: 'custom:abc', value: 1000, base: 'livre' }] }],
    ['a free-form die under -99', { playerId: ana, dice: [{ kind: 'custom:abc', value: -100, base: 'livre' }] }],
    ['a free-form die with a fractional value', { playerId: ana, dice: [{ kind: 'custom:abc', value: 2.5, base: 'livre' }] }],
    ['an imported die with no solid', { playerId: ana, dice: [{ kind: 'custom:abc', value: 3 }] }],
    ['an imported die past its solid', { playerId: ana, dice: [{ kind: 'custom:abc', value: 7, base: 'd6' }] }],
    ['an imported die of a solid it cannot be', { playerId: ana, dice: [{ kind: 'custom:abc', value: 1, base: 'd100' }] }],
    ['a malformed imported id', { playerId: ana, dice: [{ kind: 'custom:', value: 1, base: 'd6' }] }],
    ['a face the die does not have', { playerId: ana, dice: [{ kind: 'd6', value: 7 }] }],
    ['a coin side that does not exist', { playerId: ana, dice: [{ kind: 'coin', value: 3 }] }],
    ['an unknown die', { playerId: ana, dice: [{ kind: 'd7', value: 1 }] }],
    ['more than ten dice', { playerId: ana, dice: Array(11).fill({ kind: 'd6', value: 1 }) }],
    ['no dice', { playerId: ana, dice: [] }],
    ['a player id that is not one', { playerId: 'ana', dice: [{ kind: 'd6', value: 1 }] }],
    ['a force over 1', { playerId: ana, dice: [{ kind: 'd6', value: 1 }], force: 2 }],
  ])('refuses %s', async (_, body) => {
    expect((await post(body)).statusCode).toBe(400);
  });

  it('ignores a total sent by the client: the server counts it', async () => {
    expect((await post({ playerId: ana, dice: [{ kind: 'd6', value: 1 }], total: 999 })).json()).toMatchObject({ total: 1 });
  });

  it('history is per player, newest first, in pages', async () => {
    const carla = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';
    for (let v = 1; v <= 5; v++) await post({ playerId: carla, dice: [{ kind: 'd6', value: v }] });
    const first = (await page(`playerId=${carla}&limit=2`)).json();
    expect(first.rolls.map((r: { total: number }) => r.total)).toEqual([5, 4]);
    const second = (await page(`playerId=${carla}&limit=2&before=${first.next}`)).json();
    expect(second.rolls.map((r: { total: number }) => r.total)).toEqual([3, 2]);
    const last = (await page(`playerId=${carla}&limit=2&before=${second.next}`)).json();
    expect(last).toMatchObject({ next: null }); expect(last.rolls).toHaveLength(1);
    expect((await page(`playerId=${carla}&limit=100`)).json().rolls.every((r: { dice: { kind: string }[] }) => r.dice[0].kind === 'd6')).toBe(true);
    expect((await page(`playerId=${carla}&limit=101`)).statusCode).toBe(400);
  });

  it('the collection itself refuses a malformed throw, and history is served by its index', async () => {
    await expect(db.collection('rolls').insertOne({ playerId: ana, createdAt: new Date(), dice: [], total: 0, omen: null, force: null })).rejects.toThrow(/validation/i);
    await expect(db.collection('rolls').insertOne({ playerId: ana, createdAt: new Date(), dice: [{ kind: 'custom:x', value: 1, base: 'd7' }], total: 1, omen: null, force: null })).rejects.toThrow(/validation/i);
    const plan = await db.collection('rolls').find({ playerId: ana }).sort({ _id: -1 }).explain('queryPlanner');
    expect(JSON.stringify(plan.queryPlanner.winningPlan)).toContain('player_history');
  });

  it('brings the validator of an older collection up to date', async () => {
    const old = await client.db('diceroller-old');
    await old.createCollection('rolls', { validator: { $jsonSchema: { bsonType: 'object', properties: {
      dice: { bsonType: 'array', items: { bsonType: 'object', properties: { value: { bsonType: 'int', minimum: 1, maximum: 100 }, base: { enum: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] } } } },
      total: { bsonType: 'int', minimum: 0 },
    } } } });
    const free = { kind: 'custom:x', value: -5, base: 'livre', omens: false };
    const doc = { playerId: ana, createdAt: new Date(), dice: [free], total: -5, omen: null, force: null };
    await expect(old.collection('rolls').insertOne({ ...doc })).rejects.toThrow(/validation/i);
    const rolls = await rollsCollection(old);
    await expect(rolls.insertOne({ ...doc } as never)).resolves.toBeDefined();
  });

  it('reports its health and lets the dev front end call it', async () => {
    expect((await app.inject({ method: 'GET', url: '/health' })).json()).toEqual({ ok: true, db: 'up' });
    const res = await app.inject({ method: 'OPTIONS', url: '/rolls', headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST' } });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
