import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createLogger } from './logging.server';
import type { DestinationStream } from 'pino';
import { z } from 'zod';

/** Security defaults only: no routes, listeners, authentication scheme, or provider chosen. */
export async function createSecuredServer(destination?: DestinationStream) {
  const server = Fastify({
    loggerInstance: createLogger(destination),
    trustProxy: false,
    bodyLimit: 64 * 1024,
    requestTimeout: 10_000,
    connectionTimeout: 10_000,
  });
  await server.register(helmet);
  await server.register(rateLimit, { max: 30, timeWindow: 60_000 });
  server.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error, requestId: request.id }, 'Request failed');
    const parsed = z.object({ statusCode: z.number().int().min(400).max(599) }).safeParse(error);
    const status = parsed.success ? parsed.data.statusCode : 500;
    void reply.code(status).send({
      error: status >= 500 ? 'Internal server error' : 'Request rejected',
      requestId: request.id,
    });
  });
  return server;
}
