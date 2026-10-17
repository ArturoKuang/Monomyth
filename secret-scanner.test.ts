import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('Gitleaks rejects a synthetic credential without exposing it in output', () => {
  // Deliberately constructed test-only token, never issued by a provider.
  const fake = ['ghp', 'AbCdEf0123456789'.repeat(3).slice(0, 36)].join('_');
  const result = spawnSync(
    'gitleaks',
    ['stdin', '--redact', '--no-banner', '--config', '.gitleaks.toml'],
    {
      input: `const githubToken = "${fake}";`,
      encoding: 'utf8',
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).not.toContain(fake);
  expect(result.stderr).toContain('leaks found');
});
