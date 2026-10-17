import pino from 'pino';
import type { DestinationStream } from 'pino';
import { z } from 'zod';

const RequestMetadata = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
});

/** Log known structured fields. Redaction cannot sanitize arbitrary free-text messages. */
export function createLogger(destination?: DestinationStream) {
  const options = {
    level: 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'res.headers["set-cookie"]',
        'apiKey',
        'token',
        'password',
        'secret',
        '*.apiKey',
        '*.token',
        '*.password',
        '*.secret',
        'req.body',
        'response.body',
      ],
      remove: true,
    },
    serializers: {
      // Fastify's ordinary request serializer includes URLs; query strings may carry secrets.
      req: (request: unknown) => {
        const result = RequestMetadata.safeParse(request);
        return result.success ? result.data : { method: 'UNKNOWN' };
      },
      // Provider error messages/stacks can contain credentials or raw request payloads.
      err: () => ({
        type: 'Error',
        message: 'Operation failed; use the request ID for diagnosis.',
      }),
    },
  };
  return destination ? pino(options, destination) : pino(options);
}
