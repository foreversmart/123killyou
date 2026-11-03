import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mat4, vec3 } from 'wgpu-matrix';
import {
  binary,
  metadata,
  decodeCharacterSkin,
  vertexCount,
  skin,
  range,
  vertices,
  setup,
  bonePoint,
  handPropPoint,
  worldMatrix,
  skinPosition,
  node,
} from './skinned_character_fixture.mjs';

test('Lin Lan preserves her complete skeleton and normalized bind poses do not move the rest mesh', () => {
  const { bones } = skin.skeleton;
  assert.equal(bones.length, 51, 'body, limbs and individual fingers retain their source bones');
  for (const name of [
    'root',
    'pelvis',
    'spine',
    'chest',
    'neck',
    'head',
    'upper_arm.L',
    'upper_arm.R',
    'forearm.L',
    'forearm.R',
    'hand.L',
    'hand.R',
    'thigh.L',
    'thigh.R',
    'shin.L',
    'shin.R',
    'foot.L',
    'foot.R',
    'thumb.L_tip',
    'thumb.R_tip',
  ])
    assert.ok(
      bones.some((bone) => bone.name === name),
      name,
    );
  bones.forEach((bone, index) => {
    assert.ok(
      [...bone.bind, ...bone.inverseBind, ...bone.position].every(Number.isFinite),
      bone.name,
    );
    assert.ok(
      Number.isInteger(bone.parent) && bone.parent >= -1 && bone.parent < bones.length,
      bone.name,
    );
    const ancestors = new Set([index]);
    for (let parent = bone.parent; parent >= 0; parent = bones[parent].parent) {
      assert.ok(!ancestors.has(parent), 'acyclic skeleton: ' + bone.name);
      ancestors.add(parent);
    }
    const rest = mat4.multiply(bone.bind, bone.inverseBind);
    rest.forEach((value, component) =>
      assert.ok(Math.abs(value - (component % 5 === 0 ? 1 : 0)) < 0.00002, bone.name),
    );
  });
  assert.ok(
    Math.abs(bones.find((bone) => bone.name === 'head').position[1] - 1.47) < 0.2,
    'the imported armature is normalized into the game metre scale',
  );
});

test('the complete skin stays within its triangle budget and every vertex has valid anatomical weights', () => {
  assert.ok(vertexCount > 0);
  assert.ok(
    range.indexCount / 3 <= 65_000,
    'the current mesh stays within its budget while preserving texture seams',
  );
  assert.equal(binary.byteLength, vertexCount * 8 * 4);
  const neutral = skin.skeleton.bones.findIndex((bone) => bone.name === 'neutral_bone');
  assert.notEqual(neutral, -1);
  assert.equal(
    skin.skeleton.camera?.bone,
    neutral,
    'the former neutral bone drives the source camera',
  );
  let blended = 0,
    cameraVertices = 0;
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    let total = 0;
    let positive = 0;
    for (let slot = 0; slot < 4; slot++) {
      const index = vertex * 4 + slot;
      const joint = skin.joints[index];
      const weight = skin.weights[index];
      assert.ok(Number.isInteger(joint) && joint >= 0 && joint < skin.skeleton.bones.length);
      assert.ok(Number.isFinite(weight) && weight >= 0 && weight <= 1);
      if (weight > 0) {
        if (joint === neutral) {
          assert.equal(weight, 1, 'source camera vertices move as one rigid object');
          const [x, y, z] = vertices.subarray(vertex * 16, vertex * 16 + 3);
          assert.ok(
            x >= -0.145 && x <= -0.0137 && y >= 1.043 && y <= 1.1593 && z >= 0.1115 && z <= 0.1971,
            'camera bone must not capture neighbouring clothing',
          );
          cameraVertices++;
        }
        positive++;
      }
      total += weight;
    }
    assert.ok(Math.abs(total - 1) < 0.0001, 'normalized vertex ' + vertex);
    if (positive > 1) blended++;
  }
  assert.ok(
    cameraVertices > 32 && cameraVertices < vertexCount * 0.1,
    'the dedicated camera mask covers a small visible part of the source mesh',
  );
  assert.ok(blended > vertexCount / 2, 'skin keeps smooth blends across joints');
});

test('skin loading rejects truncated influences and invalid vertex weights', () => {
  assert.throws(() => decodeCharacterSkin(metadata, binary.slice(0, -4), vertexCount), /顶点数量/);
  const broken = binary.slice(0);
  new Float32Array(broken)[4] = Number.NaN;
  assert.throws(() => decodeCharacterSkin(metadata, broken, vertexCount), /权重/);
});

test('standing, seated and kneeling animation poses keep the entire skin finite and anatomically bounded', () => {
  const cases = [
    setup('standing', 'arrival_weather'),
    setup('seated', 'refectory_eating', { meal_linlan_ate: true }),
    setup('kneeling', 'double_calm', { double_calm: true }, {}, 'skin_double'),
  ];
  const headHeights = [];
  for (const item of cases) {
    item.frame(2);
    const { rig } = item;
    headHeights.push(bonePoint(rig, 'head')[1]);
    const palette = rig.root.skinTargets.mesh.skinMatrices;
    for (let vertex = 0; vertex < vertexCount; vertex++) {
      const point = skinPosition(vertex, palette);
      assert.ok(point.every(Number.isFinite), rig.pose + ': finite vertex ' + vertex);
      assert.ok(Math.hypot(...point) < 2.5, rig.pose + ': bounded vertex ' + vertex);
      assert.ok(point[1] > -0.2, rig.pose + ': feet remain above the floor tolerance');
    }
    if (rig.pose !== 'standing') {
      assert.ok(rig.legs.every((leg) => Math.abs(leg.rotation[0]) > 0.8));
      assert.ok(rig.knees.every((knee) => knee.rotation[0] > 1.2));
    }
  }
  assert.ok(headHeights[0] > headHeights[1] + 0.2, 'seated head settles below standing height');
  assert.ok(headHeights[1] > headHeights[2] + 0.4, 'kneeling torso folds down toward the floor');
});

test('camera, review, eating, walking and night gestures keep hand and foot sockets on the skinned bones', () => {
  const cases = [
    setup('standing', 'arrival_weather'),
    setup('standing', 'dawn_courtyard'),
    setup('seated', 'refectory_eating', { meal_linlan_ate: true }),
    setup('standing', 'travel', {}, { traveling: true, walkDuration: 4 }),
    setup('standing', 'double_scripture_1', {}, {}, 'skin_double'),
    setup('kneeling', 'double_calm', { double_calm: true }, {}, 'skin_double'),
  ];
  for (const item of cases) {
    const { rig } = item;
    rig.root.position = [1.2, 0.1, -0.8];
    rig.root.rotation[1] = 0.63;
    const marker = node('held_marker');
    marker.position = [0.02, 0.035, 0.045];
    rig.hands[0].children.push(marker);
    const markerPoints = [];
    for (const time of [0, 0.2, 0.9, 1.7, 2.8, 4.2]) {
      item.frame(time);
      for (const [side, suffix] of [
        [0, 'R'],
        [1, 'L'],
      ]) {
        const hand = worldMatrix(rig.root, rig.hands[side]);
        const foot = worldMatrix(rig.root, rig.knees[side].children[0]);
        assert.ok(
          vec3.distance(hand.subarray(12, 15), bonePoint(rig, 'hand.' + suffix, true)) < 0.00002,
        );
        assert.ok(
          vec3.distance(foot.subarray(12, 15), bonePoint(rig, 'foot.' + suffix, true, true)) <
            0.00002,
        );
      }
      const prop = worldMatrix(rig.root, marker).subarray(12, 15);
      markerPoints.push(Array.from(prop));
      assert.ok(vec3.distance(prop, handPropPoint(rig, 'R', marker.position)) < 0.00002);
      if (item.animation.heldBowl) {
        const bowl = item.animation.heldBowl;
        const position = worldMatrix(rig.root, bowl).subarray(12, 15);
        assert.ok(vec3.distance(position, handPropPoint(rig, 'L', bowl.position)) < 0.00002);
        const up = vec3.normalize(
          vec3.transformMat4Upper3x3([0, 1, 0], worldMatrix(rig.root, bowl)),
        );
        assert.ok(vec3.distance(up, [0, 1, 0]) < 0.00002, 'the held bowl stays upright');
      }
    }
    assert.ok(
      markerPoints.some((point) => vec3.distance(point, markerPoints[0]) > 0.002),
      item.animation.action + ': attached prop follows a moving hand',
    );
  }
});

test('camera shoulder and elbow skin remain continuous when the gesture loop wraps', () => {
  for (const shot of ['arrival_weather', 'dawn_courtyard']) {
    const item = setup('standing', shot);
    const points = [];
    for (const time of [6.4 - 0.0001, 6.4 + 0.0001]) {
      item.frame(time);
      points.push(
        ['upper_arm.R', 'forearm.R', 'hand.R', 'hand.L'].map((name) => bonePoint(item.rig, name)),
      );
    }
    points[0].forEach((point, index) =>
      assert.ok(vec3.distance(point, points[1][index]) < 0.001, shot + ': no gesture wrap jump'),
    );
  }
});
