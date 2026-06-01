const { spawnSync } = require('child_process');

const platform = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!platform || !['android', 'ios'].includes(platform)) {
  console.error('Usage: node scripts/run-eas-update.js <android|ios> [extra eas args]');
  process.exit(1);
}

const env = {
  ...process.env,
  CI: '1',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8192',
};

const args = ['update', '--platform', platform, ...extraArgs];
const result = spawnSync('eas', args, {
  stdio: 'inherit',
  shell: true,
  env,
});

process.exit(result.status ?? 1);
