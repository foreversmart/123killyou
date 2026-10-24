import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function PaperPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <article className={cx(styles['paper-panel'], className)}>{children}</article>;
}
export function PaperEyebrow({ children }: { children: ReactNode }) {
  return <span className={styles['paper-eyebrow']}>{children}</span>;
}
export function PaperInstruction({ children }: { children: ReactNode }) {
  return (
    <p className={styles['paper-instruction']} data-paper-instruction>
      {children}
    </p>
  );
}
