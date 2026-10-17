# Project instructions

The user is still deciding architecture. Keep source/configuration at the root for now. Do not introduce application directories, npm workspaces, a world schema, or an entity architecture without a new task requesting that work. `.github` and `.husky` are automation directories.

- Use TypeScript with the existing strict checks. Narrow `unknown`; do not add `any`, unsafe casts, or blanket compiler/lint suppressions to make checks pass.
- Follow installed library versions and documented APIs. Keep dependencies exact and update the lockfile through npm.
- Keep server code in `.server.ts` files until architecture is decided. Never import it into browser code or bypass the Vite boundary guard.
- Keep credentials out of source, prompts, fixtures, logs, public variables, and browser artifacts. Test with explicit fake sentinels only.
- Route procedural randomness through `createRandom` and validate seeds. Measure generation time outside deterministic modules.
- Dispose Three.js resources, listeners, and workers according to ownership. Do not dispose shared resources while consumers still use them.
- Test behavior and failure paths. Do not weaken tests, accept screenshots blindly, or add broad scan exceptions to hide failures.
- Run checks appropriate to the change. For baseline/toolchain changes, run `npm run check` and `npm run audit:dependencies`. If a tool is unavailable, report the actual limitation.
- Keep docs current and explicitly distinguish executable safeguards from future architecture work.
