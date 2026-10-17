import { uniformInt } from 'pure-rand/distribution/uniformInt';
import { xoroshiro128plus } from 'pure-rand/generator/xoroshiro128plus';
import { z } from 'zod';

export const SeedSchema = z.number().int().min(-2_147_483_648).max(2_147_483_647).brand<'Seed'>();
export type Seed = z.infer<typeof SeedSchema>;
export const RNG_VERSION = 'xoroshiro128plus-jump-v1';

/** Stream numbers are persistent IDs. Adding draws to one stream cannot advance another. */
export function createRandom(seed: Seed, stream = 0) {
  SeedSchema.parse(seed);
  z.number().int().min(0).max(1024).parse(stream);
  const generator = xoroshiro128plus(seed);
  for (let index = 0; index < stream; index += 1) generator.jump();

  return {
    integer(minimum: number, maximum: number): number {
      if (
        !Number.isSafeInteger(minimum) ||
        !Number.isSafeInteger(maximum) ||
        minimum > maximum ||
        minimum < -2_147_483_648 ||
        maximum > 2_147_483_647
      ) {
        throw new RangeError('Random integer bounds must be ordered signed 32-bit integers.');
      }
      return uniformInt(generator, minimum, maximum);
    },
  };
}
