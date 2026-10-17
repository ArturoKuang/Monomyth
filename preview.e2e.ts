import { expect, test } from '@playwright/test';
import { z } from 'zod';

const Metrics = z.object({
  revision: z.number(),
  geometries: z.number(),
  textures: z.number(),
  calls: z.number(),
  triangles: z.number(),
});

test('loads a real WebGL scene, generates a seed, and resets without browser errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) => errors.push(request.url()));
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Scene status', exact: true })).toHaveText(
    'Ready · seed 42',
  );
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByLabel('World seed').fill('123');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Scene status', exact: true })).toHaveText(
    'Ready · seed 123',
  );
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Scene status', exact: true })).toHaveText(
    'Ready · seed 42',
  );
  expect(errors).toEqual([]);
});

test('repeated generation keeps GPU resource counts bounded', async ({ page }) => {
  await page.goto('/');
  const output = page.getByLabel('Scene diagnostics');
  await expect(page.getByRole('status', { name: 'Scene status', exact: true })).toHaveText(
    'Ready · seed 42',
  );
  const before = Metrics.parse(JSON.parse((await output.getAttribute('data-resources')) ?? 'null'));
  for (let index = 0; index < 20; index += 1)
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
  const after = Metrics.parse(JSON.parse((await output.getAttribute('data-resources')) ?? 'null'));
  expect(after.revision).toBe(before.revision + 20);
  expect(after.geometries).toBe(before.geometries);
  expect(after.textures).toBe(before.textures);
  expect(after.calls).toBe(1);
  expect(after.triangles).toBe(300);
});

test('same seed produces the same rendered image @visual', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Scene status', exact: true })).toHaveText(
    'Ready · seed 42',
  );
  const canvas = page.locator('canvas');
  const original = await canvas.screenshot();
  await page.getByLabel('World seed').fill('123');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  const changed = await canvas.screenshot();
  expect(changed.equals(original)).toBe(false);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  expect((await canvas.screenshot()).equals(original)).toBe(true);
  await testInfo.attach('seed-42', { body: original, contentType: 'image/png' });
  // This checks render reproducibility. Reviewed cross-version golden images await art direction.
});

test('preview benchmark records generation latency @perf', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Scene status', exact: true })).toHaveText(
    'Ready · seed 42',
  );
  const durations = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) throw new Error('Missing controls');
    return Array.from({ length: 30 }, () => {
      const start = performance.now();
      form.requestSubmit();
      return performance.now() - start;
    });
  });
  const sorted = [...durations].sort((a, b) => a - b);
  await testInfo.attach('preview-generation-ms', {
    body: JSON.stringify({ samples: durations, p95: sorted[Math.floor(sorted.length * 0.95)] }),
    contentType: 'application/json',
  });
  // Only a hang guard: this is not a target-device GPU performance budget.
  expect(Math.max(...durations)).toBeLessThan(5000);
});

test('controls remain usable in a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Scene status', exact: true })).toHaveText(
    'Ready · seed 42',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeInViewport();
});
