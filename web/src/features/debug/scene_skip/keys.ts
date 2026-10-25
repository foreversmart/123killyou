export function bindSceneSkipKey(window: Window, advance: () => void) {
  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      !(event.ctrlKey && event.code === 'KeyE') ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isComposing ||
      target?.isContentEditable ||
      target?.closest?.('input, textarea, select, [role="textbox"]')
    )
      return;
    event.preventDefault();
    if (event.repeat) return;
    advance();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
