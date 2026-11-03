import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setup, bonePoint } from './skinned_character_fixture.mjs';

const { characterModel } = await import('../src/scene/world_character/model.ts');
const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
const { performanceFor } = await import('../src/scene/world_character/performance.ts');
const actor = (id) => ({ id, name: id, portrait: id, visible: true });
const state = (shotKey) => ({ sceneKey: 'mini_arrival', shotKey, flags: {} });
const joints = (rig) => [rig.body, rig.head, ...rig.arms, ...rig.elbows, ...rig.hands];
const pose = (rig) => joints(rig).flatMap((joint) => [...joint.position, ...joint.rotation]);

test('all gate dialogue and investigation beats continue the same character task and pose', () => {
  for (const [id, task] of [
    ['linlan', 'camera'],
    ['zhouyan', 'admire'],
    ['xuzhi', 'glance'],
    ['luchen', 'welcome'],
  ]) {
    let expected;
    for (const shot of [
      'arrival_gate',
      'arrival_unload',
      'arrival_gate_beauty',
      'arrival_weather',
      'arrival_zhouyan',
      'arrival_luchen',
      'arrival_inner',
      'arrival_plaque',
      'arrival_cat',
    ]) {
      const game = state(shot);
      assert.equal(performanceFor(actor(id), game), task);
      const rig = characterModel(id);
      animateCharacter(rig, actor(id), game);
      rig.root.blenderEnabled = true;
      rig.root.animate(7.3, 0);
      assert.equal(rig.root.blenderAction, undefined, 'a short clip cannot restart the gate task');
      expected ??= pose(rig);
      assert.deepEqual(pose(rig), expected, `${id} keeps the same ongoing pose during ${shot}`);
      assert.ok(rig.legs.every((leg) => leg.rotation[0] === 0 && leg.bend.angle === 0));
    }
  }
});

test('camera lowers and raises across loop boundaries without a hand or camera jump', () => {
  const { rig, frame } = setup('standing', 'arrival_weather');
  for (const time of [6.4, 12.8, 19.2]) {
    frame(time - 0.001);
    const before = ['R', 'L'].map((side) => Array.from(bonePoint(rig, 'hand.' + side)));
    const camera = [...rig.camera.position];
    frame(time + 0.001);
    for (const [index, side] of ['R', 'L'].entries()) {
      const after = bonePoint(rig, 'hand.' + side);
      assert.ok(Math.hypot(...after.map((value, axis) => value - before[index][axis])) < 0.001);
    }
    assert.ok(
      Math.hypot(...rig.camera.position.map((value, axis) => value - camera[axis])) < 0.001,
    );
    assert.ok(rig.legs.every((leg) => leg.rotation[0] === 0 && leg.bend.angle === 0));
  }
});
