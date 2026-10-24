import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { json } from '../src/features/session/api.ts';

test('服务不返回或响应体卡住时都在期限内给出可理解的错误', async (t) => {
  const server = createServer((request, response) => {
    if (request.url === '/body') {
      response.setHeader('Content-Type', 'application/json');
      response.flushHeaders();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/headers', '/body']) {
    await assert.rejects(json(base + path, undefined, 100), /操作可能已保存/);
  }
});

test('游戏规则返回的具体失败原因会保留', async (t) => {
  const server = createServer((_request, response) => {
    response.writeHead(409, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: '进度已经改变，请先确认当前房间。' }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  await assert.rejects(json(`http://127.0.0.1:${server.address().port}`), /先确认当前房间/);
});
