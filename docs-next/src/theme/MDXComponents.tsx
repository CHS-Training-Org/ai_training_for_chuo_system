/**
 * Markdown から使えるコンポーネントを足す。
 * DrawioDiagram は plugins/remark-drawio.js が `![説明](/diagrams/xxx.drawio)` から生成する。
 */
import MDXComponents from '@theme-original/MDXComponents';
import DrawioDiagram from '@site/src/components/DrawioDiagram';

export default {
  ...MDXComponents,
  DrawioDiagram,
};
