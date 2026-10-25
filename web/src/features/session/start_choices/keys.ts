function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.isContentEditable || element?.closest?.('input, textarea, select, [role="textbox"]'),
  );
}

/** Bind the shortcut that skips only the opening reel. */
export function bindOpeningSkipKey(window: Window, skip: () => void) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      !(event.ctrlKey && event.code === 'KeyE') ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isComposing ||
      isEditableTarget(event.target)
    )
      return;
    event.preventDefault();
    // SceneSkip also listens for Ctrl+E in development. The opening shortcut
    // owns the event while the reel is mounted so it cannot submit a story turn.
    event.stopImmediatePropagation();
    if (!event.repeat) skip();
  };
  const capture = { capture: true };
  window.addEventListener('keydown', onKeyDown, capture);
  return () => window.removeEventListener('keydown', onKeyDown, capture);
}
