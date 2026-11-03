import { spawnSync } from 'node:child_process';

const source = process.argv[2] || 'assets/characters/lu_chen/lu_chen.zip';
const result = spawnSync(
  process.execPath,
  ['scripts/art_assets/pack_native_skinned_character.mjs', 'luchen', source],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
