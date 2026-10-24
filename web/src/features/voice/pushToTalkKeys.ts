type PushToTalkKeys = {
  enabled: () => boolean;
  press: () => void;
  release: () => void;
  cancel: () => void;
};
const editable = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.isContentEditable || element?.closest?.('input, textarea, select, [role="textbox"]'),
  );
};
const space = (event: KeyboardEvent) => event.code === 'Space' || event.key === ' ';

export function bindPushToTalkKeys(window: Window, document: Document, controls: PushToTalkKeys) {
  let pressed = false;
  const cancel = () => {
    pressed = false;
    controls.cancel();
  };
  const down = (event: KeyboardEvent) => {
    if (
      !space(event) ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      editable(event.target) ||
      !controls.enabled()
    )
      return;
    event.preventDefault();
    if (pressed || event.repeat) return;
    pressed = true;
    controls.press();
  };
  const up = (event: KeyboardEvent) => {
    if (!space(event) || !pressed) return;
    event.preventDefault();
    pressed = false;
    controls.release();
  };
  const visibility = () => {
    if (document.hidden) cancel();
  };
  const focus = (event: FocusEvent) => {
    if (editable(event.target)) cancel();
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', visibility);
  document.addEventListener('focusin', focus);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', cancel);
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('focusin', focus);
    cancel();
  };
}
