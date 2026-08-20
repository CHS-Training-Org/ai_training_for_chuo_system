import React, {type ReactNode} from 'react';
import {PageMetadata} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import LastUpdated from '@site/src/components/LastUpdated';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function DocItemMetadata(): ReactNode {
  const {metadata, frontMatter, assets} = useDoc();
  return (
    <>
      <PageMetadata
        title={metadata.title}
        description={metadata.description}
        keywords={frontMatter.keywords}
        image={assets.image ?? frontMatter.image}
      />
      {frontMatter.last_updated && (
        <div className={styles.lastUpdatedContainer} aria-label="最終更新日">
          <LastUpdated lastUpdated={frontMatter.last_updated} />
        </div>
      )}
    </>
  );
}