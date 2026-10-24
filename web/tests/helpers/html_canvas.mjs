// A controllable paint source for probe failures and lifecycle tests, not a browser renderer.
export function canvasFixture(mode = 'success') {
  const calls = { requests: 0, draws: 0, reads: 0 };
  class Element extends EventTarget {
    style = {};
    attributes = new Map();
    children = [];
    ownerDocument;
    parent;
    constructor(document) {
      super();
      this.ownerDocument = document;
    }
    setAttribute(key, value) {
      this.attributes.set(key, value);
    }
    append(element) {
      element.parent = this;
      this.children.push(element);
    }
    remove() {
      if (this.parent) {
        this.parent.children = this.parent.children.filter((element) => element !== this);
        this.parent = undefined;
      }
    }
  }
  class Context {
    clearRect() {}
    drawElementImage(element) {
      calls.draws++;
      if (mode === 'draw-error') throw new Error('snapshot unavailable');
      if (!canvas.painting) throw new Error('drawn before paint');
      if (!element.attributes.has('drawable') || element.parent !== canvas) {
        throw new Error('invalid drawable subtree');
      }
    }
    getImageData(x) {
      calls.reads++;
      if (mode === 'read-error') throw new Error('pixel read failed');
      if (mode === 'blank') return { data: new Uint8ClampedArray(4) };
      if (mode === 'wrong-color') return { data: new Uint8ClampedArray([80, 60, 40, 255]) };
      return { data: new Uint8ClampedArray(x === 4 ? [176, 143, 82, 255] : [40, 52, 36, 255]) };
    }
  }
  class Canvas extends Element {
    content = 'fallback';
    painting = false;
    getContext() {
      return mode === 'no-context' ? null : new Context();
    }
    requestPaint() {
      calls.requests++;
      if (mode === 'request-error') throw new Error('requestPaint failed');
      if (mode !== 'timeout') queueMicrotask(() => this.paint());
    }
    paint() {
      this.painting = true;
      this.dispatchEvent(new Event('paint'));
      this.painting = false;
    }
  }
  let canvas;
  const document = {
    defaultView: { HTMLCanvasElement: Canvas, CanvasRenderingContext2D: Context },
    createElement(tag) {
      const element = tag === 'canvas' ? new Canvas(this) : new Element(this);
      if (tag === 'canvas') canvas = element;
      return element;
    },
  };
  const host = new Element(document);
  return {
    host,
    calls,
    document,
    get canvas() {
      return canvas;
    },
  };
}
