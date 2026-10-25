import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindOpeningSkipKey } from '../src/features/session/start_choices/keys.ts';

function key(window, options = {}) {
  const event = new Event('keydown', { cancelable: true });
  for (const [name, value] of Object.entries({ ctrlKey: true, code: 'KeyE', ...options }))
    Object.defineProperty(event, name, { value });
  window.dispatchEvent(event);
  return event;
}

test('片头播放时 Ctrl+E 只跳过片头，按住不重复触发，卸载后恢复原行为', () => {
  const window = new EventTarget();
  let skips = 0;
  const dispose = bindOpeningSkipKey(window, () => skips++);
  assert.equal(key(window).defaultPrevented, true);
  assert.equal(key(window, { repeat: true }).defaultPrevented, true);
  assert.equal(skips, 1);
  dispose();
  assert.equal(key(window).defaultPrevented, false);
  assert.equal(skips, 1);
});

test('片头快捷键不拦截编辑框、输入法或其他组合键', () => {
  const window = new EventTarget();
  let skips = 0;
  const dispose = bindOpeningSkipKey(window, () => skips++);
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
  assert.equal(skips, 0);
  dispose();
});
