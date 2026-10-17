# Security practices

Private API credentials belong only to a backend runtime. Anything sent to a browser is public, including public build variables, JSON, source maps, storage, and network responses. Encoding or obfuscation does not protect a key.

## Secrets

- Never pass production provider keys to frontend builds, untrusted pull requests, AI prompts, game saves, or generated assets.
- `.env` and local files are ignored, but Git ignore rules do not protect already tracked files. Keep only placeholders in `.env.example`.
- The server factory reads no credentials. Add validated environment configuration only after the backend architecture and provider are selected.
- Use the deployment platform's secret store initially. A self-hosted manager such as OpenBao is an optional operational decision, not a frontend library.
- Use separate keys and least privilege for development, staging, and production.
- Keep any browser/public key intentionally public and provider-restricted; never substitute a private key.

## Logs and errors

Use `createLogger` and structured allowlisted metadata such as request ID, operation, status, and duration. Configured fields are redacted. Do not log raw request bodies, full URLs containing credentials, provider responses, or arbitrary error strings. Free-text messages cannot be reliably scrubbed by field redaction. The default error serializer deliberately omits raw messages and stacks.

Do not retain real user/provider data in browser traces, screenshots, test fixtures, or CI artifacts. Only synthetic data belongs in tests.

## Scanning

Gitleaks runs on staged changes and in CI with redacted output. Scanners can miss unknown secret formats and are not substitutes for server isolation. Any allowlist exception must be narrow, documented, and verified to contain no live credential. Never baseline an active leaked credential merely to pass CI.

Use immutable/pinned automation dependencies. CI must use `pull_request`, never execute untrusted PR code with deployment secrets, and retain minimum token permissions. Dependency advisories are checked separately from formatting and tests.

## Exposed credential response

1. Revoke or rotate the credential immediately at its provider.
2. Identify affected builds, logs, artifacts, and Git history without copying the key into tickets or messages.
3. Review provider access and billing records; invalidate affected sessions or jobs when necessary.
4. Remove exposed copies and rebuild artifacts. Coordinate any history rewrite separately; deletion alone does not revoke a key.
5. Add a synthetic regression test and verify scans before restoring access.

## Generated executable code

Prefer validated data executed by trusted mechanics. If generated code is later allowed, design a separate capability-limited execution environment with CPU/memory/time limits and no provider credentials. A Web Worker is a scheduling boundary, not a security sandbox.
