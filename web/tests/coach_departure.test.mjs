import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier.startsWith('@/')
        ? new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href
        : specifier,
      context,
    );
  },
});
const { journeyFrame } = await import('../src/scene/world_vehicle/journey.ts');
const { cameraMatrix, project } = await import('../src/scene/renderer/frame.ts');
const { DEPARTURE_CAMERA_DURATION_MS, DEPARTURE_ROAD_DURATION_MS } =
  await import('../src/shared/lib/story_timing.ts');

function vehiclePoint(frame, [x, y, z]) {
  const rx = x * Math.cos(frame.roll) - y * Math.sin(frame.roll);
  const ry = x * Math.sin(frame.roll) + y * Math.cos(frame.roll);
  const py = ry * Math.cos(frame.pitch) - z * Math.sin(frame.pitch);
  const pz = ry * Math.sin(frame.pitch) + z * Math.cos(frame.pitch);
  return [
    frame.position[0] + rx * Math.cos(frame.yaw) + pz * Math.sin(frame.yaw),
    frame.position[1] + py,
    frame.position[2] - rx * Math.sin(frame.yaw) + pz * Math.cos(frame.yaw),
  ];
}

function visibleCorners(frame, aspect) {
  const matrix = cameraMatrix(frame.camera, aspect);
  return [-1.3, 1.3]
    .flatMap((x) =>
      [0, 3.35].flatMap((y) =>
        [-4.8, 4.8].map((z) => project(vehiclePoint(frame, [x, y, z]), matrix)),
      ),
    )
    .filter(Boolean).length;
}

test('结尾拉远后固定机位，大巴不断行直到整车驶出横竖屏', () => {
  const lockTime = DEPARTURE_CAMERA_DURATION_MS / 1000;
  const endTime = DEPARTURE_ROAD_DURATION_MS / 1000;
  const locked = journeyFrame(lockTime, true);
  assert.ok(endTime > lockTime + 10, '固定镜头后留出完整下山行程');
  assert.notDeepEqual(journeyFrame(lockTime - 1, true).camera, locked.camera);
  const before = journeyFrame(lockTime - 0.01, true);
  const after = journeyFrame(lockTime + 0.01, true);
  const enteringSpeed = before.along - locked.along;
  const leavingSpeed = locked.along - after.along;
  assert.ok(enteringSpeed > 0.02 && leavingSpeed > 0.02, '锁镜时大巴不能停下');
  assert.ok(Math.abs(leavingSpeed / enteringSpeed - 1) < 0.05, '锁镜交界处车速连续');
  for (const aspect of [16 / 9, 320 / 740]) {
    assert.equal(visibleCorners(locked, aspect), 8, '锁镜时整车仍然可见');
    let departed = false;
    let previous = locked;
    for (let t = lockTime + 0.1; t <= endTime + 2; t += 0.1) {
      const frame = journeyFrame(t, true);
      assert.deepEqual(frame.camera, locked.camera, '眼位、朝向与焦距始终固定');
      const visible = visibleCorners(frame, aspect);
      if (departed) assert.equal(visible, 0, '驶出后不再重新入画');
      departed ||= visible === 0;
      if (t < endTime) assert.ok(frame.along < previous.along, '出画前持续往山下行驶');
      previous = frame;
    }
    assert.ok(departed, '车身所有角点最终离开画面');
  }
});
