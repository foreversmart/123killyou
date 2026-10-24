export type CanvasEnvironment = {
  HTMLCanvasElement?: { prototype: { requestPaint?: unknown } };
  CanvasRenderingContext2D?: { prototype: { drawElementImage?: unknown } };
};

export type HtmlCanvasSupport = {
  supported: boolean;
  missing: string[];
  error?: string;
};

// Test the APIs used by the renderer, rather than assuming a browser/version enabled them.
export function checkHtmlCanvasSupport(
  environment: CanvasEnvironment = globalThis as unknown as CanvasEnvironment,
): HtmlCanvasSupport {
  const checks = [
    ['HTMLCanvasElement.requestPaint', environment.HTMLCanvasElement?.prototype?.requestPaint],
    [
      'CanvasRenderingContext2D.drawElementImage',
      environment.CanvasRenderingContext2D?.prototype?.drawElementImage,
    ],
  ] as const;
  const missing = checks.filter(([, method]) => typeof method !== 'function').map(([name]) => name);
  return { supported: missing.length === 0, missing };
}

export function configureHtmlCanvas(canvas: HTMLCanvasElement, element: HTMLElement) {
  if ('content' in canvas) canvas.setAttribute('content', 'drawable');
  else canvas.setAttribute('layoutsubtree', '');
  element.setAttribute('drawable', '');
}
