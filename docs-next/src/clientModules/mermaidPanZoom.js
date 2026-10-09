/**
 * Mermaid の図に、拡大縮小のボタンと全画面表示を付ける。
 *
 * docusaurus-plugin-mermaid-pan-zoom はビルド時に webpack の DefinePlugin を使うため、
 * Rspack でビルドするこのサイトでは失敗する。同プラグインの client module と同じ処理を、
 * SDK（mermaid-diagram-pan-zoom）を直接読み込んで行う。
 */
import { init, enhance } from 'mermaid-diagram-pan-zoom';
import 'mermaid-diagram-pan-zoom/styles/mermaid-enhancements.css';

init({
  containerSelector: '.docusaurus-mermaid-container',
  sourceAttribute: 'data-mermaid-source',
  enableCopy: false,
  enableExpand: true,
  enableZoomControls: true,
  enableWheelZoom: true,
  // ページ内の図の上でホイールを回したときは、拡大せずページをスクロールさせる。
  enableInlineWheelZoom: false,
});

export function onRouteDidUpdate() {
  // Mermaid の描画は非同期なので、描き終わるまで何度か付け直す。
  setTimeout(enhance, 100);
  setTimeout(enhance, 500);
  setTimeout(enhance, 1500);
  setTimeout(enhance, 3000);
}
