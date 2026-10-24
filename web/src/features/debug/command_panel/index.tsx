import { useState } from 'react';
import styles from './style.module.css';

export function CommandPanel({ onSubmit }: { onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState('');
  return (
    <form
      className={styles['debug-panel']}
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) {
          void onSubmit(text);
          setText('');
        }
      }}
    >
      <label htmlFor="debug-command">开发调试 · 语音转写注入</label>
      <input
        id="debug-command"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="例如：看看地图 / 去走廊"
      />
      <button type="submit">执行</button>
      <span>仅 ?debug=1 可见</span>
    </form>
  );
}
