import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('real monk and guardian candidates keep auditable licenses and stay offline', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../../assets/environment/guardian_monk_sources.json', import.meta.url)),
  );
  assert.equal(manifest.runtime_policy, 'offline_only');
  assert.ok(manifest.models.length >= 3);
  for (const model of manifest.models) {
    assert.match(model.url, /^https:\/\/sketchfab\.com\/3d-models\//);
    assert.match(model.api, /^https:\/\/api\.sketchfab\.com\/v3\/models\//);
    assert.equal(model.downloadable, true);
    assert.ok(model.runtime_asset === null, 'candidate must not be fetched at runtime');
    assert.ok(model.verified_api.license_api_url);
    assert.ok(model.verified_api.license_label);
    assert.equal(model.verified_api.api_checked_at, '2026-10-31');
  }
  const monk = manifest.models.find((model) => model.name.includes('Chinese monk'));
  const dvarapala = manifest.models.find((model) => model.name.startsWith('Dvarapala'));
  assert.equal(monk.license, 'CC0 Public Domain');
  assert.equal(dvarapala.license, 'CC0 Public Domain');
  assert.match(manifest.selection_policy.polyhaven, /没有满足本作剧情/);
});
