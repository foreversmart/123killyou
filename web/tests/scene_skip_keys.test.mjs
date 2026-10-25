import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindSceneSkipKey } from '../src/features/debug/scene_skip/keys.ts';

function key(window, options = {}) {
  const event = new Event('keydown', { cancelable: true });
  for (const [name, value] of Object.entries({ ctrlKey: true, code: 'KeyE', ...options }))
    Object.defineProperty(event, name, { value });
  window.dispatchEvent(event);
  return event;
}

test('Ctrl+E 跳下一剧情，按住不连跳，卸载后不再捕获快捷键', () => {
  const window = new EventTarget();
  let jumps = 0;
  const dispose = bindSceneSkipKey(window, () => jumps++);
  assert.equal(key(window).defaultPrevented, true);
  assert.equal(key(window, { repeat: true }).defaultPrevented, true);
  assert.equal(jumps, 1);
  key(window);
  assert.equal(jumps, 2);
  dispose();
  assert.equal(key(window).defaultPrevented, false);
  assert.equal(jumps, 2);
});

test('编辑文字、输入法和其他组合键保留原本行为', () => {
  const window = new EventTarget();
  let jumps = 0;
  const dispose = bindSceneSkipKey(window, () => jumps++);
  for (const options of [
    { ctrlKey: false },
    { code: 'KeyF' },
    { altKey: true },
    { shiftKey: true },
    { metaKey: true },
    { isComposing: true },
    { target: { isContentEditable: true } },
    { target: { closest: () => ({}) } },
  ])
    assert.equal(key(window, options).defaultPrevented, false);
  assert.equal(jumps, 0);
  dispose();
});
