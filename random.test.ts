import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createRandom, SeedSchema } from './random';

describe('seeded randomness', () => {
  it('rejects invalid seeds instead of silently truncating them', () => {
    for (const value of [
      NaN,
      Infinity,
      -Infinity,
      0.5,
      2_147_483_648,
      -2_147_483_649,
      '42',
      null,
    ]) {
      expect(SeedSchema.safeParse(value).success).toBe(false);
    }
  });

  it('replays seeds and honors integer bounds across randomized inputs', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (value, lower, span) => {
          const seed = SeedSchema.parse(value);
          const a = createRandom(seed);
          const b = createRandom(seed);
          for (let draw = 0; draw < 30; draw += 1) {
            const result = a.integer(lower, lower + span);
            expect(result).toBe(b.integer(lower, lower + span));
            expect(result).toBeGreaterThanOrEqual(lower);
            expect(result).toBeLessThanOrEqual(lower + span);
          }
        },
      ),
      { seed: 16491, numRuns: 100 },
    );
  });

  it('isolates streams from unrelated draws', () => {
    const seed = SeedSchema.parse(42);
    const terrain = createRandom(seed, 0);
    const loot = createRandom(seed, 1);
    const reference = createRandom(seed, 1);
    for (let draw = 0; draw < 100; draw += 1) terrain.integer(0, 100);
    expect(Array.from({ length: 10 }, () => loot.integer(0, 100))).toEqual(
      Array.from({ length: 10 }, () => reference.integer(0, 100)),
    );
  });

  it('rejects invalid streams and bounds', () => {
    const seed = SeedSchema.parse(0);
    for (const stream of [-1, 1.5, 1025, Infinity])
      expect(() => createRandom(seed, stream)).toThrow();
    const rng = createRandom(seed);
    for (const [min, max] of [
      [2, 1],
      [0.5, 1],
      [0, NaN],
      [-2_147_483_649, 0],
      [0, 2_147_483_648],
    ] as const) {
      expect(() => rng.integer(min, max)).toThrow(RangeError);
    }
    expect(rng.integer(7, 7)).toBe(7);
  });
});
