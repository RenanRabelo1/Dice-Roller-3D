import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import { KINDS } from '../../src/dice/kinds.ts';
import type { RollStore } from './rolls.ts';
import { score, type Die } from './rules.ts';

// HTTP API of the roll history. The player is an anonymous id the browser keeps (until there are accounts).
const PLAYER = { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' } as const;

export function buildApp(o: { store: RollStore; ping: () => Promise<unknown>; origins: string[]; logger?: FastifyServerOptions['logger'] }) {
  const app = Fastify({ logger: o.logger ?? false });
  app.register(cors, { origin: o.origins });

  app.get('/health', async (_req, reply) => {
    try { await o.ping(); return { ok: true, db: 'up' }; } catch { return reply.code(503).send({ ok: false, db: 'down' }); }
  });

  app.post<{ Body: { playerId: string; dice: Die[]; force?: number } }>('/rolls', {
    schema: {
      body: {
        type: 'object', required: ['playerId', 'dice'], additionalProperties: false,
        properties: {
          playerId: PLAYER,
          dice: {
            type: 'array', minItems: 1, maxItems: 10,
            items: {
              type: 'object', required: ['kind', 'value'], additionalProperties: false,
              properties: { kind: { enum: KINDS }, value: { type: 'integer', minimum: 1, maximum: 100 } },
            },
          },
          force: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  }, async (req, reply) => {
    const { playerId, dice, force } = req.body;
    const scored = score(dice);
    if ('error' in scored) return reply.code(400).send({ error: scored.error });
    return reply.code(201).send(await o.store.add({ playerId, dice, ...scored, force: force ?? null }));
  });

  app.get<{ Querystring: { playerId: string; limit: number; before?: string } }>('/rolls', {
    schema: {
      querystring: {
        type: 'object', required: ['playerId'], additionalProperties: false,
        properties: {
          playerId: PLAYER,
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          before: { type: 'string', pattern: '^[0-9a-f]{24}$' },
        },
      },
    },
  }, async (req) => o.store.page(req.query.playerId, req.query.limit, req.query.before));

  return app;
}
