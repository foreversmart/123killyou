import assert from 'node:assert/strict';
import { test } from 'node:test';
import { probeHtmlCanvasSupport } from '../src/shared/lib/htmlCanvasProbe.ts';
import { canvasFixture } from './helpers/html_canvas.mjs';

test('在 paint 事件中绘制并校验两处像素，成功后清除探针', async () => {
  const fixture = canvasFixture();
  const result = await probeHtmlCanvasSupport(fixture.host);
  assert.deepEqual(result, { supported: true, missing: [] });
  assert.deepEqual(fixture.calls, { requests: 1, draws: 1, reads: 2 });
  assert.equal(fixture.canvas.attributes.get('content'), 'drawable');
  assert.equal(fixture.host.children.length, 0);
  fixture.canvas.paint();
  assert.equal(fixture.calls.draws, 1, '完成后必须移除 paint 监听');
});

test('接口缺失时拦截，不能用像素自检绕过前置检查', async () => {
  const fixture = canvasFixture();
  fixture.document.defaultView = {};
  const result = await probeHtmlCanvasSupport(fixture.host);
  assert.equal(result.supported, false);
  assert.equal(result.missing.length, 2);
  assert.equal(fixture.canvas, undefined);
  assert.equal(fixture.calls.requests, 0);
});

test('接口存在但绘制为空白或错误颜色，仍然阻止进入', async () => {
  for (const mode of ['blank', 'wrong-color']) {
    const fixture = canvasFixture(mode);
    const result = await probeHtmlCanvasSupport(fixture.host);
    assert.equal(result.supported, false);
    assert.deepEqual(result.missing, []);
    assert.match(result.error, /像素与预期不符/);
    assert.equal(fixture.host.children.length, 0);
  }
});

test('创建上下文、请求绘制、绘制与读取像素失败均拦截并清理', async () => {
  for (const mode of ['no-context', 'request-error', 'draw-error', 'read-error']) {
    const fixture = canvasFixture(mode);
    const result = await probeHtmlCanvasSupport(fixture.host);
    assert.equal(result.supported, false, mode);
    assert.ok(result.error, mode);
    assert.equal(fixture.host.children.length, 0, mode);
    const draws = fixture.calls.draws;
    fixture.canvas.paint();
    assert.equal(fixture.calls.draws, draws, mode);
  }
});

test('没有 paint 事件时在期限内失败，迟到的事件不能变为成功', async () => {
  const fixture = canvasFixture('timeout');
  const result = await probeHtmlCanvasSupport(fixture.host, { timeoutMs: 15 });
  assert.equal(result.supported, false);
  assert.match(result.error, /超时/);
  assert.equal(fixture.host.children.length, 0);
  fixture.canvas.paint();
  assert.equal(fixture.calls.draws, 0);
});

test('离开检测页时可取消，释放 DOM、监听和等待，不回报成功', async () => {
  const fixture = canvasFixture('timeout');
  const controller = new AbortController();
  const pending = probeHtmlCanvasSupport(fixture.host, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(fixture.host.children.length, 0);
  fixture.canvas.paint();
  assert.equal(fixture.calls.draws, 0);
});

test('已取消的检测不会挂载或请求绘制', async () => {
  const fixture = canvasFixture();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(probeHtmlCanvasSupport(fixture.host, { signal: controller.signal }), {
    name: 'AbortError',
  });
  assert.equal(fixture.calls.requests, 0);
  assert.equal(fixture.host.children.length, 0);
});
