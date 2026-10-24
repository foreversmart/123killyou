import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createVoiceTurns } from '../src/features/voice/voiceTurns.ts';

function fixture(process) {
  const answers = [],
    problems = [];
  return {
    answers,
    problems,
    turns: createVoiceTurns({
      process,
      start() {},
      answer: (text) => answers.push(text),
      problem: (text) => problems.push(text),
    }),
  };
}

test('玩家开口打断后，等待中的旧回复不播出，也不误报失败', async () => {
  let resolve;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const { turns, answers, problems } = fixture(() => pending);
  const first = turns.submit('去走廊');
  turns.interrupt();
  resolve('你已经来到走廊。');
  await first;
  assert.deepEqual(answers, []);
  assert.deepEqual(problems, []);
});

test('新回合先返回，旧回合迟到失败不能覆盖它', async () => {
  let reject;
  const pending = new Promise((_resolve, fail) => {
    reject = fail;
  });
  const { turns, answers, problems } = fixture((text) =>
    text === '旧问题' ? pending : Promise.resolve('新的回答'),
  );
  const first = turns.submit('旧问题');
  await turns.submit('新问题');
  reject(new Error('旧回合连接错误'));
  await first;
  assert.deepEqual(answers, ['新的回答']);
  assert.deepEqual(problems, []);
});

test('空回应和当前回合的失败都有明确反馈', async () => {
  const { turns, answers, problems } = fixture(async (text) => {
    if (text === '失败') throw new Error('连接暂时中断');
    return '   ';
  });
  await turns.submit('空回应');
  await turns.submit('失败');
  assert.deepEqual(answers, []);
  assert.match(problems[0], /没有收到完整回应/);
  assert.equal(problems[1], '连接暂时中断');
});
