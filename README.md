# Monomyth

Three.js + TypeScript tooling baseline for a generative game. Application architecture is intentionally undecided. Source, tests, and configuration remain at the repository root; `.github` and `.husky` contain automation only.

The small seeded landscape is a build and browser-test fixture, not the game's world format, scene architecture, or gameplay design.

## Setup

1. Use Node **26.0.0** (`.node-version`) and npm **11.12.1**.
2. Install **Gitleaks 8.30.1** from its [official releases](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1), or `brew install gitleaks` on macOS and verify the version.
3. Run `npm ci`. Husky registers local hooks unless `HUSKY=0`.
4. Run `npx playwright install chromium` (Linux CI uses `--with-deps`).
5. Run `npm run dev` and open the local Vite URL.

Commit `package-lock.json`. Use `npm ci` for clean reproducible installs. Direct dependencies are exact versions. Three.js and `@types/three` share the same release line; Vitest and its coverage provider share the same version.

## Commands

| Command                                | Purpose                                                    |
| -------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                          | Local browser preview                                      |
| `npm run typecheck`                    | Strict project checks plus a browser-only type environment |
| `npm run lint`                         | Type-aware lint and deterministic-generation rules         |
| `npm run format` / `format:check`      | Apply / verify formatting                                  |
| `npm test` / `test:watch`              | Unit, property, and server-security tests                  |
| `npm run test:coverage`                | Coverage for the implemented RNG and logging helpers       |
| `npm run test:e2e`                     | Build and browser smoke/resource checks                    |
| `npm run test:visual`                  | Build and same-seed image reproducibility check            |
| `npm run test:perf`                    | Build and record preview generation timings                |
| `npm run test:browser`                 | Build and run all browser checks                           |
| `npm run scan:secrets`                 | Scan local files with Gitleaks                             |
| `npm run scan:staged` / `scan:history` | Scan staged patches / available Git history                |
| `npm run audit:dependencies`           | Check npm advisories; fail on high/critical findings       |
| `npm run build`                        | Typecheck, build, and scan all public artifacts            |
| `npm run preview`                      | Serve the already-built frontend                           |
| `npm run check`                        | Local delivery gate, including browser tests               |

Gitleaks must be installed; scans fail closed if it is missing. The history scan covers refs present in the checkout, not unreachable objects or remote branches that were never fetched. CI fetches full history and also checks advisories. Local hooks help but do not replace CI.

## What is enforced

- Strict TypeScript, indexed-access checks, exact optional types, override checks, unused code checks, and explicit type imports.
- Typed ESLint rules reject `any`, floating promises, unsafe operations, and undocumented compiler suppressions.
- Authored TypeScript cannot call `Math.random()`. Generation-pattern files also reject direct clock and cryptographic randomness access. These checks are not a proof of determinism; replay/property tests are still required.
- Browser builds refuse `.server` and `node:` imports, including transitive imports. Browser type checking excludes Node globals.
- Vite does not load `.env` files. Only the explicitly approved public variable `VITE_APP_TITLE` is allowed from the process environment. Its value is public and must never contain a secret.
- Built artifacts are scanned for secrets, private test sentinels, key files, environment files, and source maps.
- The seed helper validates signed 32-bit integer seeds and stream IDs. Jump-separated streams do not share draw state. Record RNG/generator versions alongside persistent seeds.
- The preview explicitly disposes its GPU resources and event listeners. Browser tests verify bounded resource counts after regeneration.

## Server security baseline

`createSecuredServer` is a tested factory, not a running server. It chooses no routes, persistence model, auth provider, or application layout. It provides security headers, 64 KiB body limits, request/connection timeouts, IP rate limiting, structured redaction, and generic error responses. It does not expose a paid generation endpoint.

Before adding public generation routes, implement authenticated authorization, per-user quotas, shared rate-limit storage when running multiple instances, provider timeouts/cancellation, bounded retries, and spending caps. The current in-memory IP limiter is only a starting protection. Authentication and trusted proxy settings depend on the eventual deployment. Configure security headers on the frontend host as well as the API. Cookie sessions require CSRF protections.

## Testing and performance

Unit tests exercise invalid inputs, replay, stream isolation, configured log redaction, import rejection, request body limits, rate limits, and sanitized server failures. Tests use fake secrets only.

Browser tests exercise actual WebGL rendering, seed changes, reset, narrow layouts, and repeated regeneration. The visual test compares renders within the same run and attaches an image; it is **not** an approved cross-version screenshot baseline. Golden images and gameplay journeys follow the eventual art direction and mechanics.

`test:perf` records preview generation samples and p95 in a Playwright attachment. Its five-second ceiling detects hangs only. It does not certify 60 FPS, GPU memory usage, or target-device performance. Establish device-specific budgets and representative worlds once scope is decided.

## CI and repository settings

`.github/workflows/ci.yml` runs on pull requests and main updates with read-only token permissions, pinned Action revisions, full-history secret scanning, dependency auditing, and the complete check command. It builds with a fake private sentinel and scans the result. Reports on failure and the passing frontend artifact are retained for seven days. No deployments or remote settings are configured.

After hosting the repository, make **Quality / Verify** a required check and protect the main branch. Enable Renovate using the root configuration; updates require review and do not auto-merge. These hosting settings cannot be enforced by local files alone.

Use the tested artifact for future releases and retain a previous release for rollback. Choose a deployment target before adding publication or credentials.

## Decisions intentionally pending

- Application folders/workspaces, package exports, and full layer/import rules.
- Gameplay simulation, fixed timestep and interpolation, entity ownership, world/save schemas and migrations.
- Asset pipeline, model validation, textures, audio, and licensing inventory.
- Authentication, persistence, cloud saves, jobs, multiplayer, and paid provider integration.
- Target browser/device matrix and actual performance budgets.

`eslint-plugin-boundaries` is not installed: there are no approved layers yet, and the currently evaluated release introduced vulnerable transitive dependencies. Reevaluate it or another checker when architecture is chosen. The active browser/server guard does not depend on it.
