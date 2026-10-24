import { checkHtmlCanvasSupport, configureHtmlCanvas } from './htmlCanvas.ts';
import type { CanvasEnvironment, HtmlCanvasSupport } from './htmlCanvas.ts';

type ExperimentalCanvas = HTMLCanvasElement & { requestPaint: () => void };
type ExperimentalContext = CanvasRenderingContext2D & {
  drawElementImage: (element: HTMLElement, x: number, y: number) => unknown;
};

const samples = [
  { x: 4, color: [176, 143, 82, 255] },
  { x: 12, color: [40, 52, 36, 255] },
];

// Use a visible, laid-out canvas: hidden or detached elements may never receive a paint snapshot.
export function probeHtmlCanvasSupport(
  container: HTMLElement,
  { signal, timeoutMs = 5000 }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<HtmlCanvasSupport> {
  const document = container.ownerDocument;
  const support = checkHtmlCanvasSupport(document.defaultView as unknown as CanvasEnvironment);
  if (!support.supported) return Promise.resolve(support);

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas') as ExperimentalCanvas;
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      settled = true;
      clearTimeout(timeout);
      canvas.removeEventListener('paint', paint);
      signal?.removeEventListener('abort', abort);
      canvas.remove();
    };
    const finish = (result: HtmlCanvasSupport) => {
      if (settled) return;
      cleanup();
      resolve(result);
    };
    const fail = (error: string) => finish({ supported: false, missing: [], error });
    const abort = () => {
      if (settled) return;
      cleanup();
      reject(signal?.reason ?? new DOMException('检测已取消', 'AbortError'));
    };
    const paint = () => {
      if (settled) return;
      try {
        const context = canvas.getContext('2d') as ExperimentalContext | null;
        if (!context) {
          fail('无法创建 Canvas 2D 绘制上下文。');
          return;
        }
        context.clearRect(0, 0, 16, 16);
        context.drawElementImage(element, 0, 0);
        const matches = samples.every(({ x, color }) => {
          const pixel = context.getImageData(x, 8, 1, 1).data;
          return color.every((value, channel) => Math.abs(pixel[channel] - value) <= 2);
        });
        if (!matches) {
          fail('HTML 元素绘制后的像素与预期不符，未通过实际绘制校验。');
          return;
        }
        finish({ supported: true, missing: [] });
      } catch (error) {
        fail(`HTML-in-Canvas 绘制失败：${error instanceof Error ? error.message : String(error)}`);
      }
    };
    const element = document.createElement('div');

    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    try {
      canvas.width = canvas.height = 16;
      canvas.style.cssText = 'display:block;width:16px;height:16px';
      canvas.setAttribute('aria-hidden', 'true');
      element.style.cssText =
        'display:block;width:16px;height:16px;box-sizing:border-box;margin:0;padding:0;border:0;' +
        'background:rgb(176,143,82);color-scheme:light;forced-color-adjust:none';
      const right = document.createElement('div');
      right.style.cssText =
        'display:block;width:8px;height:16px;margin:0 0 0 8px;padding:0;border:0;' +
        'background:rgb(40,52,36)';
      element.append(right);
      configureHtmlCanvas(canvas, element);
      canvas.append(element);
      canvas.addEventListener('paint', paint);
      container.append(canvas);
      timeout = setTimeout(
        () => fail('等待 HTML-in-Canvas 的 paint 事件超时。请保持页面在前台后重新检测。'),
        timeoutMs,
      );
      canvas.requestPaint();
    } catch (error) {
      fail(`无法启动实际绘制检测：${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
