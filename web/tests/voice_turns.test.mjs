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

test('云端最终字幕与流式播放标记一起交给播放器', async () => {
  const answer = { text: '云端回应', streamed: true };
  const { turns, answers, problems } = fixture(async () => answer);
  await turns.submit('你是谁');
  assert.deepEqual(answers, [answer]);
  assert.deepEqual(problems, []);
});

test('有意通过画面和环境声反馈时允许没有对白，真实空回应仍报错', async () => {
  const answer = { text: '', sceneOnly: true };
  const { turns, answers, problems } = fixture(async (text) =>
    text === '看烛芯' ? answer : { text: '', streamed: false },
  );
  await turns.submit('看烛芯');
  await turns.submit('空回应');
  assert.deepEqual(answers, [answer]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /没有收到完整回应/);
});

test('打断会取消上游请求，旧音频和字幕事件不能进入新回合', async () => {
  let controls;
  let resolve;
  const events = [];
  let cancelled = 0;
  const turns = createVoiceTurns({
    process: (_text, value) => {
      controls = value;
      return new Promise((done) => {
        resolve = done;
      });
    },
    start() {},
    answer() {
      assert.fail('stale answer');
    },
    problem() {
      assert.fail('stale error');
    },
    stream: (event) => events.push(event),
    cancel: () => cancelled++,
  });
  const pending = turns.submit('你是谁');
  controls.onSpeech({ kind: 'text', text: '守夜人' });
  turns.interrupt();
  assert.equal(controls.signal.aborted, true);
  controls.onSpeech({ kind: 'audio', pcm: 'AAA=' });
  resolve({ text: '旧回应', streamed: true });
  await pending;
  assert.deepEqual(events, [{ kind: 'text', text: '守夜人' }]);
  assert.equal(cancelled, 2);
});

test('音频服务失败显示原因，不播放本地替代读白', async () => {
  const { turns, answers, problems } = fixture(async () => ({
    text: '已记录的动作',
    problem: '灵矽音频生成失败',
  }));
  await turns.submit('去走廊');
  assert.deepEqual(answers, []);
  assert.deepEqual(problems, ['灵矽音频生成失败']);
});
