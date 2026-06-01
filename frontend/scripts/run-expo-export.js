const { rmSync } = require('fs');
const { spawnSync } = require('child_process');

const platform = process.argv[2];

if (!platform || !['android', 'ios', 'web'].includes(platform)) {
  console.error('Usage: node scripts/run-expo-export.js <android|ios|web>');
  process.exit(1);
}

const env = {
  ...process.env,
  CI: '1',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8192',
};

const outputDir = `dist-${platform}`;

rmSync(outputDir, { recursive: true, force: true });

const args = [
  'expo',
  'export',
  '--platform',
  platform,
  '--output-dir',
  outputDir,
  '--experimental-bundle',
  '--dump-sourcemap',
  '--dump-assetmap',
];

const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: true,
  env,
});

process.exit(result.status ?? 1);
