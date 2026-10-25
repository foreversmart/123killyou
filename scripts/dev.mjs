import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { hasOpeningContract, isOpeningState } from './dev-contract.mjs';

const children = [];
let closing = false;
function launch(command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform !== 'win32',
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!closing) stop(code ?? 1);
  });
  return child;
}
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) {
    try {
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {
      /* The child may already have exited. */
    }
  }
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
let ready = false;
let staleService = false;
async function health() {
  try {
    const response = await fetch('http://127.0.0.1:8787/api/health', {
      signal: AbortSignal.timeout(400),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
const existingHealth = await health();
if (existingHealth && !hasOpeningContract(existingHealth)) {
  staleService = true;
} else if (!existingHealth) {
  launch('go', ['run', './cmd/server']);
}
for (let attempt = 0; attempt < 240 && !closing; attempt++) {
  if (staleService) break;
  const currentHealth = await health();
  if (hasOpeningContract(currentHealth)) {
    try {
      const opening = await fetch('http://127.0.0.1:8787/api/story/opening', {
        signal: AbortSignal.timeout(1200),
      });
      if (opening.ok) {
        const state = await opening.json();
        if (isOpeningState(state)) {
          ready = true;
          break;
        }
      }
    } catch {
      /* Wait until the backend can serve the real opening. No save is touched. */
    }
  }
  await setTimeout(500);
}
if (ready && !closing) {
  launch(process.execPath, ['node_modules/vite/bin/vite.js']);
} else if (!closing) {
  console.error(
    staleService
      ? '8787 端口仍由旧版游戏服务占用，请先停止旧的 go server 后再运行 npm run dev。'
      : 'Go 服务没有成功启动，请检查 8787 端口和终端输出。',
  );
  stop(1);
}
