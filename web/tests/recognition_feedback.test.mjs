import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRecognitionFeedback } from '../src/features/voice/recognitionFeedback.ts';

test('静音和正常收句不产生误报；听到一半后中断会澄清一次', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const messages = [];
  const feedback = createRecognitionFeedback((message) => messages.push(message));
  feedback.unfinished();
  t.mock.timers.tick(10000);
  assert.equal(messages.length, 0);
  feedback.heard();
  feedback.settle();
  t.mock.timers.tick(10000);
  assert.equal(messages.length, 0);
  feedback.heard();
  feedback.unfinished();
  feedback.unfinished();
  t.mock.timers.tick(10000);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /再说一遍/);
});

test('持续发言延后澄清；一直没有最终转写时给反馈', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const messages = [];
  const feedback = createRecognitionFeedback((message) => messages.push(message));
  feedback.heard();
  t.mock.timers.tick(6000);
  feedback.heard();
  t.mock.timers.tick(6000);
  assert.equal(messages.length, 0);
  t.mock.timers.tick(2000);
  assert.equal(messages.length, 1);
});

test('识别无匹配会回应；结束会话后取消迟到的澄清', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const messages = [];
  const feedback = createRecognitionFeedback((message) => messages.push(message));
  feedback.unmatched();
  assert.equal(messages.length, 1);
  feedback.heard();
  feedback.dispose();
  t.mock.timers.tick(10000);
  feedback.unmatched();
  feedback.unfinished();
  assert.equal(messages.length, 1);
});
