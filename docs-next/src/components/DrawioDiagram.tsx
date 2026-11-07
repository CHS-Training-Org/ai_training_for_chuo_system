/**
 * draw.io の元ファイル（.drawio）を、ブラウザで draw.io 公式の閲覧用 JS により描画する（Issue #178）。
 *
 * Markdown からは plugins/remark-drawio.js が `![説明](/diagrams/xxx.drawio)` をこのコンポーネントに置き換え、
 * 元ファイルから求めた幅と高さも渡す。描画される前にその大きさで場所を確保し、読み込み後に本文がずれないようにする。
 *
 * - 閲覧用 JS（static/js/drawio-viewer/）は大きいので、図のあるページで初めて読み込み、以後は読み込み直さない。
 * - 図をクリックするか、ツールバーのボタンを押すと、ページの中で拡大表示を開く（外部のサイトは開かない）。
 * - 図は常にライトの配色で描く。ダークモードでは CSS（src/css/custom.css）で白い背景を敷く。
 */
import React, {useEffect, useRef, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

// 閲覧用 JS を更新したら上げる（ブラウザのキャッシュに古い JS が残らないように）。
const VIEWER_VERSION = '32.7.0';

type GraphViewerApi = {createViewerForElement: (el: HTMLElement) => void};
type ViewerWindow = Window & {GraphViewer?: GraphViewerApi; onDrawioViewerLoad?: () => void};

let viewerLoader: Promise<void> | null = null;

function loadViewer(url: string): Promise<void> {
  if (!viewerLoader) {
    viewerLoader = new Promise((resolve, reject) => {
      // 閲覧用 JS は、読み込まれた時点でページにある .mxgraph をすべて自動で描画する。
      // 描画はこのコンポーネントが行うので、自動の処理を止める。
      (window as ViewerWindow).onDrawioViewerLoad = () => {};
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => {
        viewerLoader = null;
        reject(new Error('図を表示するためのスクリプトを読み込めませんでした。'));
      };
      document.head.appendChild(script);
    });
  }
  return viewerLoader;
}

type Props = {src: string; alt: string; width: string; height: string};

export default function DrawioDiagram({src, alt, width, height}: Props): React.ReactElement {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileUrl = useBaseUrl(src);
  const viewerUrl = useBaseUrl(`/js/drawio-viewer/viewer-static.min.js?v=${VIEWER_VERSION}`);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    (async () => {
      try {
        const [xml] = await Promise.all([
          fetch(fileUrl).then((res) => {
            if (!res.ok) throw new Error(`図を読み込めませんでした（${res.status}）。`);
            return res.text();
          }),
          loadViewer(viewerUrl),
        ]);
        if (cancelled || !canvas) return;
        const el = document.createElement('div');
        el.className = 'mxgraph';
        el.setAttribute(
          'data-mxgraph',
          JSON.stringify({xml, 'auto-fit': true, nav: false, toolbar: 'lightbox', 'dark-mode': false}),
        );
        canvas.replaceChildren(el);
        (window as ViewerWindow).GraphViewer!.createViewerForElement(el);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      canvas?.replaceChildren();
    };
  }, [fileUrl, viewerUrl]);

  const label = status === 'error' ? `${alt}（${error}）` : alt;
  return (
    <div
      className="drawio-diagram"
      role="img"
      aria-label={label}
      data-status={status}
      // 描画されるまでは、元ファイルから求めた大きさで場所を確保する。描画した後は閲覧用 JS が大きさを決める。
      style={status === 'ready' ? undefined : {maxWidth: `${width}px`, aspectRatio: `${width} / ${height}`}}>
      <div ref={canvasRef} />
      {status !== 'ready' && <span className="drawio-diagram__fallback">{label}</span>}
    </div>
  );
}
