import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

// Execute the production hook with deterministic effects and timers, without a DOM or microphone.
export async function loadHook(path, name, runtime, dependencies = {}) {
  const source = stripTypeScriptTypes(await readFile(new URL(path, import.meta.url), 'utf8'))
    .replace(/^import\s[\s\S]*?\sfrom\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|class)\b)/g, '');
  const bindings = { ...runtime.bindings, ...dependencies };
  return new Function(...Object.keys(bindings), `${source}\nreturn ${name};`)(
    ...Object.values(bindings),
  );
}

export function hookRuntime() {
  const slots = [],
    effects = [],
    timers = new Map();
  let cursor = 0,
    nextTimer = 0;
  const changed = (previous, next) =>
    !previous ||
    !next ||
    previous.length !== next.length ||
    next.some((value, i) => !Object.is(value, previous[i]));
  const useMemo = (factory, dependencies) => {
    const index = cursor++;
    if (!slots[index] || changed(slots[index].dependencies, dependencies))
      slots[index] = { value: factory(), dependencies };
    return slots[index].value;
  };
  return {
    bindings: {
      useMemo,
      useCallback: (callback, dependencies) => useMemo(() => callback, dependencies),
      useRef(value) {
        const index = cursor++;
        slots[index] ||= { current: value };
        return slots[index];
      },
      useState(initial) {
        const index = cursor++;
        if (!slots[index]) {
          slots[index] = { value: typeof initial === 'function' ? initial() : initial };
          slots[index].set = (value) => {
            slots[index].value = typeof value === 'function' ? value(slots[index].value) : value;
          };
        }
        return [slots[index].value, slots[index].set];
      },
      useEffect(effect, dependencies) {
        const index = cursor++;
        if (!slots[index] || changed(slots[index].dependencies, dependencies)) {
          const previous = slots[index];
          effects.push(() => {
            previous?.cleanup?.();
            slots[index] = { dependencies, cleanup: effect() };
          });
        }
      },
      setTimeout(callback) {
        const id = ++nextTimer;
        timers.set(id, callback);
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
    render(hook, ...args) {
      cursor = 0;
      const result = hook(...args);
      effects.splice(0).forEach((effect) => effect());
      return result;
    },
    flushTimers() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((callback) => callback());
    },
    get pendingTimers() {
      return timers.size;
    },
    dispose() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

export function audioFixture() {
  const sources = [],
    calls = [];
  class AudioContext {
    state = 'suspended';
    currentTime = 1;
    destination = {};
    constructor(options) {
      calls.push(['create', options?.sampleRate]);
    }
    resume() {
      calls.push(['resume']);
      this.state = 'running';
      return Promise.resolve();
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
    createBuffer(_channels, length, rate) {
      const data = new Float32Array(length);
      return { duration: length / rate, getChannelData: () => data };
    }
    createBufferSource() {
      const source = {
        connect() {},
        disconnect() {},
        start() {},
        stop() {
          this.stopped = true;
        },
        end() {
          this.onended?.();
        },
      };
      sources.push(source);
      return source;
    }
  }
  return { AudioContext, sources, calls };
}
