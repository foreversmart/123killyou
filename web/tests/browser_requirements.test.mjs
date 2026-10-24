import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkHtmlCanvasSupport } from '../src/shared/lib/htmlCanvas.ts';

test('不提供实验接口的浏览器不能进入游戏', () => {
  const result = checkHtmlCanvasSupport({});
  assert.equal(result.supported, false);
  assert.deepEqual(result.missing, [
    'HTMLCanvasElement.requestPaint',
    'CanvasRenderingContext2D.drawElementImage',
  ]);
});

test('只提供部分实验接口时继续阻止进入，并指出缺少哪一项', () => {
  for (const [environment, missing] of [
    [
      { HTMLCanvasElement: { prototype: { requestPaint() {} } } },
      ['CanvasRenderingContext2D.drawElementImage'],
    ],
    [
      { CanvasRenderingContext2D: { prototype: { drawElementImage() {} } } },
      ['HTMLCanvasElement.requestPaint'],
    ],
  ]) {
    const result = checkHtmlCanvasSupport(environment);
    assert.equal(result.supported, false);
    assert.deepEqual(result.missing, missing);
  }
});

test('同名属性存在但不能调用，不算已开启', () => {
  const result = checkHtmlCanvasSupport({
    HTMLCanvasElement: { prototype: { requestPaint: true } },
    CanvasRenderingContext2D: { prototype: { drawElementImage: 'enabled' } },
  });
  assert.equal(result.supported, false);
  assert.equal(result.missing.length, 2);
});

test('全部必需接口可调用只通过前置检查，不依赖浏览器名称或缓存确认', () => {
  const environment = {
    HTMLCanvasElement: { prototype: { requestPaint() {} } },
    CanvasRenderingContext2D: { prototype: { drawElementImage() {} } },
  };
  assert.deepEqual(checkHtmlCanvasSupport(environment), { supported: true, missing: [] });
  delete environment.HTMLCanvasElement.prototype.requestPaint;
  assert.equal(checkHtmlCanvasSupport(environment).supported, false);
});
