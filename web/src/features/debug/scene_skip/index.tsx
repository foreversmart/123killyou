import { useCallback, useEffect, useRef, useState } from 'react';
import { bindSceneSkipKey } from './keys';
import styles from './style.module.css';

export function SceneSkip({ onSkip }: { onSkip: () => Promise<void> }) {
  const action = useRef(onSkip);
  action.current = onSkip;
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const advance = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await action.current();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, []);
  useEffect(() => bindSceneSkipKey(window, () => void advance()), [advance]);
  return (
    <button
      className={styles.skip}
      type="button"
      onClick={() => void advance()}
      disabled={busy}
      title="跳到下一个剧情场景（Ctrl+E）；会保存调试后的进度"
    >
      {busy ? '跳转中…' : '下一场景'} <kbd>Ctrl+E</kbd>
    </button>
  );
}
