import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const children = [];
let closing = false;
function launch(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', env: process.env, detached: process.platform !== 'win32' });
  children.push(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!closing) stop(code ?? 1); });
  return child;
}
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) {
    try {
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch { /* The child may already have exited. */ }
  }
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
launch('go', ['run', './cmd/server']);
let ready = false;
for (let attempt = 0; attempt < 240 && !closing; attempt++) {
  try {
    const response = await fetch('http://127.0.0.1:8787/api/health');
    if (response.ok) { ready = true; break; }
  } catch { /* Go may still be compiling. */ }
  await setTimeout(500);
}
if (ready && !closing) {
  launch(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1']);
} else if (!closing) {
  console.error('Go 服务没有成功启动，请检查 8787 端口和终端输出。');
  stop(1);
}
