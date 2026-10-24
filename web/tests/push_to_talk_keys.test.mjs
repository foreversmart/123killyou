import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindPushToTalkKeys } from '../src/features/voice/pushToTalkKeys.ts';

function fixture(t) {
  const window = new EventTarget(),
    document = new EventTarget(),
    calls = [];
  document.hidden = false;
  let enabled = true;
  const dispose = bindPushToTalkKeys(window, document, {
    enabled: () => enabled,
    press: () => calls.push('press'),
    release: () => calls.push('release'),
    cancel: () => calls.push('cancel'),
  });
  t.after(dispose);
  return {
    window,
    document,
    calls,
    dispose,
    disable: () => {
      enabled = false;
    },
  };
}
function key(f, type, options = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [name, value] of Object.entries({ code: 'Space', key: ' ', ...options }))
    Object.defineProperty(event, name, { value });
  f.window.dispatchEvent(event);
  return event;
}
const input = { closest: () => ({}), isContentEditable: false };

test('空格阻止滚屏；系统重复 keydown 不会创建多个录音', (t) => {
  const f = fixture(t);
  assert.equal(key(f, 'keydown').defaultPrevented, true);
  key(f, 'keydown', { repeat: true });
  key(f, 'keydown');
  key(f, 'keyup');
  key(f, 'keyup');
  assert.deepEqual(f.calls, ['press', 'release']);
});

test('输入框、可编辑内容、输入法和组合快捷键保留正常空格行为', (t) => {
  const f = fixture(t);
  for (const options of [
    { target: input },
    { target: { isContentEditable: true } },
    { isComposing: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { shiftKey: true },
    { code: 'Enter', key: 'Enter' },
  ]) {
    assert.equal(key(f, 'keydown', options).defaultPrevented, false);
  }
  f.disable();
  assert.equal(key(f, 'keydown').defaultPrevented, false);
  assert.deepEqual(f.calls, []);
});

test('松开时焦点或修饰键已变化仍会结束当前录音', (t) => {
  const f = fixture(t);
  key(f, 'keydown');
  key(f, 'keyup', { target: input, ctrlKey: true });
  assert.deepEqual(f.calls, ['press', 'release']);
});

test('窗口失焦、页面隐藏和焦点进入输入框均取消，返回时不会自动继续录音', (t) => {
  const f = fixture(t);
  key(f, 'keydown');
  f.window.dispatchEvent(new Event('blur'));
  key(f, 'keyup');
  assert.deepEqual(f.calls, ['press', 'cancel']);
  key(f, 'keydown');
  f.document.hidden = true;
  f.document.dispatchEvent(new Event('visibilitychange'));
  f.document.hidden = false;
  f.document.dispatchEvent(new Event('visibilitychange'));
  key(f, 'keyup');
  assert.deepEqual(f.calls, ['press', 'cancel', 'press', 'cancel']);
  key(f, 'keydown');
  const focus = new Event('focusin');
  Object.defineProperty(focus, 'target', { value: input });
  f.document.dispatchEvent(focus);
  key(f, 'keyup');
  assert.equal(f.calls.at(-1), 'cancel');
  f.dispose();
  const count = f.calls.length;
  key(f, 'keydown');
  key(f, 'keyup');
  assert.equal(f.calls.length, count);
});
