import assert from 'node:assert/strict';
import { test } from 'node:test';
import { soundSettingFor } from '../src/features/voice/soundSetting.ts';

test('明确要求才切换声音，不从否定、假设和闲聊中执行静音', () => {
  for (const text of ['不要静音', '别关闭声音', '如果我关闭声音会怎么样', '你刚才说了静音吗？']) {
    assert.equal(soundSettingFor(text), undefined, text);
  }
  assert.equal(soundSettingFor('请关闭声音。'), false);
  assert.equal(soundSettingFor('静音'), false);
  assert.equal(soundSettingFor('打开声音！'), true);
  assert.equal(soundSettingFor('取消静音'), true);
});
