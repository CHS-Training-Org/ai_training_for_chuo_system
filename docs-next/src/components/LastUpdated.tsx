import React from 'react';
import clsx from 'clsx';
import styles from './LastUpdated.module.css';

interface LastUpdatedProps {
  lastUpdated?: string;
  className?: string;
}

export default function LastUpdated({ lastUpdated, className }: LastUpdatedProps) {
  if (!lastUpdated) return null;
  
  const date = new Date(lastUpdated);
  const formatted = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  return (
    <div className={clsx(styles.container, className)}>
      <span className={styles.label}>最終更新</span>
      <time className={styles.date} dateTime={lastUpdated}>{formatted}</time>
    </div>
  );
}