import type { FastifyPluginAsync } from 'fastify';
import { ROLL_IN_SCHEMA, ROLL_QUERY_SCHEMA, type RollIn, type RollQuery } from './contracts.ts';
import { rollStore, type Rolls } from './repository.ts';
import { record } from './service.ts';

// HTTP API of the roll history. No rule lives here: the schema validates, the service works out what is
// saved, the repository saves and reads, and a refused throw becomes a 400.
export const historicoRoutes: FastifyPluginAsync<{ rolls: Rolls }> = async (app, { rolls }) => {
  const store = rollStore(rolls);

  app.post<{ Body: RollIn }>('/rolls', { schema: ROLL_IN_SCHEMA }, async (req, reply) => {
    const saved = record(req.body);
    if ('error' in saved) return reply.code(400).send({ error: saved.error });
    return reply.code(201).send(await store.add(saved));
  });

  app.get<{ Querystring: RollQuery }>('/rolls', { schema: ROLL_QUERY_SCHEMA }, async (req) => store.page(req.query.playerId, req.query.limit, req.query.before));
};
