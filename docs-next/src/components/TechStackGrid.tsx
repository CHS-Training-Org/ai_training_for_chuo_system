import React from 'react';
import clsx from 'clsx';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import styles from './TechStackGrid.module.css';

interface TechStackItem {
  name: string;
  logo: string;
  alt: string;
}

interface TechStackGridProps {
  category: string;
  items: TechStackItem[];
}

export default function TechStackGrid({ category, items }: TechStackGridProps) {
  const { withBaseUrl } = useBaseUrlUtils();
  return (
    <section className={styles.section} aria-labelledby={`${category}-heading`}>
      <h3 id={`${category}-heading`} className={styles.categoryLabel}>{category}</h3>
      <div className={styles.grid} role="list">
        {items.map((item) => (
          <div key={item.name} className={styles.card} role="listitem">
            <img
              src={withBaseUrl(item.logo)}
              alt={item.alt}
              className={styles.logo}
              loading="lazy"
              width="32"
              height="32"
            />
            <span className={styles.name}>{item.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}