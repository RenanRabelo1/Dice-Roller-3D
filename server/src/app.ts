import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import { historicoRoutes } from './modules/historico/index.ts';

// The server shell: CORS, the health check and the modules' routes.
export function buildApp(o: { rolls: Parameters<typeof historicoRoutes>[1]['rolls']; ping: () => Promise<unknown>; origins: string[]; logger?: FastifyServerOptions['logger'] }) {
  const app = Fastify({ logger: o.logger ?? false });
  app.register(cors, { origin: o.origins });

  app.get('/health', async (_req, reply) => {
    try { await o.ping(); return { ok: true, db: 'up' }; } catch { return reply.code(503).send({ ok: false, db: 'down' }); }
  });

  app.register(historicoRoutes, { rolls: o.rolls });

  return app;
}
