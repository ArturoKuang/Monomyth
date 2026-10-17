import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function run(args) {
  const result = spawnSync(
    'gitleaks',
    [...args, '--redact', '--no-banner', '--config', '.gitleaks.toml'],
    { stdio: 'inherit' },
  );
  if (result.error) {
    console.error('Gitleaks is required. Install the pinned CLI version documented in README.md.');
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function artifactFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Deployment artifacts must not contain symlinks.');
    return entry.isDirectory() ? artifactFiles(path) : [path];
  });
}

const mode = process.argv[2];
const expectedVersion = readFileSync('.gitleaks-version', 'utf8').trim();
const version = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
if (version.status !== 0 || version.stdout.trim() !== expectedVersion) {
  console.error(`Install Gitleaks ${expectedVersion} before running security checks.`);
  process.exit(1);
}
switch (mode) {
  case 'source':
    run(['dir', '.']);
    break;
  case 'history': {
    const head = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { stdio: 'ignore' });
    if (head.status === 0) run(['git', '.', '--log-opts=--all']);
    else run(['dir', '.']);
    break;
  }
  case 'staged': {
    const diff = spawnSync(
      'git',
      ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--unified=0'],
      { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    );
    if (diff.status !== 0 || diff.error) process.exit(1);
    const result = spawnSync(
      'gitleaks',
      ['stdin', '--redact', '--no-banner', '--config', '.gitleaks.toml'],
      { input: diff.stdout, stdio: ['pipe', 'inherit', 'inherit'] },
    );
    if (result.error) console.error('Gitleaks is required for staged secret scanning.');
    process.exit(result.status ?? 1);
    break;
  }
  case 'artifacts': {
    if (!existsSync('dist/index.html'))
      throw new Error('Build output is missing. Run the production build first.');
    for (const file of artifactFiles('dist')) {
      if (/\.(?:map|pem|key)$/u.test(file) || /(?:^|\/)\.env/u.test(file)) {
        throw new Error(
          'Private configuration, key material, or source maps found in deployment artifacts.',
        );
      }
      if (
        /\.(?:html|js|json|css)$/u.test(file) &&
        /MONOMYTH_PRIVATE_SENTINEL_/u.test(readFileSync(file, 'utf8'))
      ) {
        throw new Error('Private test sentinel found in deployment artifacts.');
      }
    }
    run(['dir', 'dist']);
    break;
  }
  default:
    throw new Error('Expected source, staged, history, or artifacts.');
}
