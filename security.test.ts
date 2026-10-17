import { describe, expect, it } from 'vitest';
import { createLogger } from './logging.server';
import { createSecuredServer } from './server-security.server';
import { publicEnvironmentGuard, browserBoundaryGuard } from './vite.config';
import { build } from 'vite';

describe('secret boundaries', () => {
  it('rejects unapproved public environment variables without revealing values', () => {
    expect(() => {
      publicEnvironmentGuard({ VITE_APP_TITLE: 'Monomyth' });
    }).not.toThrow();
    const fake = 'MONOMYTH_PRIVATE_SENTINEL_environment';
    try {
      publicEnvironmentGuard({ VITE_PROVIDER_KEY: fake });
      throw new Error('Expected rejection');
    } catch (error) {
      expect(String(error)).toContain('Unapproved public environment variable');
      expect(String(error)).not.toContain(fake);
    }
  });

  it.each(['./private.server.ts', 'node:fs'])(
    'rejects %s anywhere in the browser build graph',
    async (source) => {
      await expect(
        build({
          configFile: false,
          logLevel: 'silent',
          plugins: [
            browserBoundaryGuard(),
            {
              name: 'security-test-entry',
              resolveId(id) {
                return id === 'virtual:security-test' ? id : null;
              },
              load(id) {
                return id === 'virtual:security-test' ? `import '${source}';` : null;
              },
            },
          ],
          build: { write: false, rolldownOptions: { input: 'virtual:security-test' } },
        }),
      ).rejects.toThrow('Server-only module');
    },
  );

  it('removes credentials and raw error payloads from structured logs', () => {
    const lines: string[] = [];
    const logger = createLogger({
      write: (line) => {
        lines.push(line);
      },
    });
    const fake = 'MONOMYTH_PRIVATE_SENTINEL_logging';
    logger.info(
      {
        req: {
          method: 'GET',
          url: `/generate?token=${fake}`,
          headers: { authorization: fake, cookie: fake, 'x-api-key': fake },
          body: { key: fake },
        },
        res: { headers: { 'set-cookie': fake } },
        apiKey: fake,
        token: fake,
        password: fake,
        secret: fake,
        provider: { apiKey: fake },
        requestId: 'request-123',
      },
      'Request complete',
    );
    logger.error({ err: new Error(fake) }, 'Provider failed');
    logger.info({ req: {} }, 'Malformed request');
    expect(lines.join('')).not.toContain(fake);
    expect(lines.join('')).toContain('request-123');
    expect(createLogger().level).toBe('info');
  });
});

describe('server security defaults', () => {
  it('sets headers, caps request bodies, limits requests, and sanitizes failures', async () => {
    const logs: string[] = [];
    const server = await createSecuredServer({
      write: (line) => {
        logs.push(line);
      },
    });
    const fake = 'MONOMYTH_PRIVATE_SENTINEL_provider';
    server.get('/limited', { config: { rateLimit: { max: 2, timeWindow: 60_000 } } }, () => ({
      ok: true,
    }));
    server.get('/failure', () => {
      throw new Error(fake);
    });
    server.post('/body', (request) => ({ received: Boolean(request.body) }));
    try {
      const first = await server.inject('/limited');
      expect(first.headers['x-content-type-options']).toBe('nosniff');
      expect(first.statusCode).toBe(200);
      expect((await server.inject('/limited')).statusCode).toBe(200);
      expect((await server.inject('/limited')).statusCode).toBe(429);
      const failure = await server.inject('/failure');
      expect(failure.statusCode).toBe(500);
      expect(failure.body).not.toContain(fake);
      expect(
        (
          await server.inject({
            method: 'POST',
            url: '/body',
            payload: { text: 'x'.repeat(70_000) },
          })
        ).statusCode,
      ).toBe(413);
      expect(logs.join('')).not.toContain(fake);
    } finally {
      await server.close();
    }
  });
});
