export async function json<T>(url: string, init?: RequestInit, timeoutMs = 10000): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    const response = await fetch(url, { ...init, signal });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(body.error || `游戏服务暂时没有回应（${response.status}）`);
    }
    return (await response.json()) as T;
  } catch (cause) {
    if (timeout.aborted)
      throw new Error('回应暂时没有传回来。操作可能已保存，请稍后询问当前情况。');
    if (cause instanceof TypeError)
      throw new Error('游戏连接暂时中断。恢复连接后，请先询问当前情况。');
    throw cause;
  }
}
