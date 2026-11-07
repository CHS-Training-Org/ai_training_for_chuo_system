/**
 * Markdown の `![説明](/diagrams/xxx.drawio)` を、draw.io の図を描画する `<DrawioDiagram>` に置き換える。
 *
 * 図の元ファイル（.drawio）だけをリポジトリに置き、ブラウザで描画する（Issue #178）。
 * 書き出した画像（.drawio.svg）を別に持つと、元ファイルを直して書き出し忘れたときに、
 * 公開している図が古いままになるため。
 *
 * - パスは static/ からの絶対パスで書く。ファイルが無い、または draw.io の図として読めないときはビルドを失敗させる。
 * - 図は <div> で描画するので、図だけの段落（前後を空行で区切った 1 行）として書く。段落ごと置き換える。
 * - 描画される前に場所を確保できるよう、図の幅と高さを元ファイルから求めて渡す（読み込み後に本文がずれないように）。
 */
const fs = require('fs');
const path = require('path');

const STATIC_DIR = path.join(__dirname, '..', 'static');
// 閲覧用 JS が図の周りに付ける余白（両側の合計）。求めた大きさに足す。20 枚を描画して測った値。
const VIEWER_PADDING = 28;

function fail(message, node, vfile) {
  throw new Error(`${message}（${vfile.path}、${node.url}）`);
}

/**
 * 図形（vertex）の位置と大きさ、線（edge）の端点と折れ点から、図全体の幅と高さを求める。
 * グループやコンテナの中の要素は、座標が親からの相対位置なので、親の位置を足して絶対位置にする。
 * 文字のはみ出しなどは計算に入らないので、実際に描かれる大きさとは少しずれる（場所を確保するための目安）。
 */
function measure(xml) {
  const num = (attrs, name) => {
    const m = attrs.match(new RegExp(`\\s${name}="(-?[\\d.]+)"`));
    return m ? Number(m[1]) : 0;
  };
  const str = (attrs, name) => attrs.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const cells = new Map();
  for (const [, attrs, body = ''] of xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)) {
    const geometry = body.match(/<mxGeometry\b([^>]*?)\/?>/)?.[1] ?? '';
    cells.set(str(attrs, 'id'), {
      parent: str(attrs, 'parent'),
      vertex: str(attrs, 'vertex') === '1',
      relative: str(geometry, 'relative') === '1',
      edge: str(attrs, 'edge') === '1',
      points: [...body.matchAll(/<mxPoint\b([^>]*?)\/?>/g)].map(([, a]) => ({x: num(a, 'x'), y: num(a, 'y')})),
      x: num(geometry, 'x'),
      y: num(geometry, 'y'),
      width: num(geometry, 'width'),
      height: num(geometry, 'height'),
    });
  }
  const origin = (id) => {
    const cell = cells.get(id);
    if (!cell || !cell.vertex) return {x: 0, y: 0};
    const p = origin(cell.parent);
    return {x: p.x + cell.x, y: p.y + cell.y};
  };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x1, y1, x2, y2) => {
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  };
  for (const cell of cells.values()) {
    const p = origin(cell.parent);
    if (cell.edge) {
      for (const point of cell.points) include(p.x + point.x, p.y + point.y, p.x + point.x, p.y + point.y);
      continue;
    }
    if (!cell.vertex || cell.relative || (cell.width === 0 && cell.height === 0)) continue;
    include(p.x + cell.x, p.y + cell.y, p.x + cell.x + cell.width, p.y + cell.y + cell.height);
  }
  if (!Number.isFinite(minX)) return null;
  return {
    width: Math.round(maxX - minX + VIEWER_PADDING),
    height: Math.round(maxY - minY + VIEWER_PADDING),
  };
}

/** mdast を深さ優先でたどり、画像のノードとその親を渡す。 */
function visitImages(node, fn) {
  if (!node.children) return;
  for (const child of node.children) {
    if (child.type === 'image') fn(child, node);
    else visitImages(child, fn);
  }
}

function plugin() {
  return (root, vfile) => {
    visitImages(root, (node, parent) => {
      if (!/\.drawio([?#].*)?$/.test(node.url)) return;
      if (/[?#]/.test(node.url)) fail('draw.io の図の URL に ? や # は付けられません', node, vfile);
      if (!node.url.startsWith('/')) fail('draw.io の図は static/ からの絶対パスで書いてください', node, vfile);
      let file;
      try {
        file = path.join(STATIC_DIR, decodeURIComponent(node.url));
      } catch {
        fail('draw.io の図のパスを解釈できません', node, vfile);
      }
      if (!fs.existsSync(file)) fail('draw.io の図が見つかりません', node, vfile);
      const xml = fs.readFileSync(file, 'utf8');
      if (!/<mxGraphModel\b/.test(xml)) {
        fail('draw.io の図として読めません（圧縮されていない <mxGraphModel> が必要です）', node, vfile);
      }
      const size = measure(xml);
      if (!size) fail('draw.io の図に図形がありません', node, vfile);
      if (parent.type !== 'paragraph' || parent.children.length !== 1) {
        fail('draw.io の図は、前後を空行で区切った単独の行に書いてください', node, vfile);
      }
      parent.type = 'mdxJsxFlowElement';
      parent.name = 'DrawioDiagram';
      parent.attributes = [
        { type: 'mdxJsxAttribute', name: 'src', value: node.url },
        { type: 'mdxJsxAttribute', name: 'alt', value: node.alt ?? '' },
        { type: 'mdxJsxAttribute', name: 'width', value: String(size.width) },
        { type: 'mdxJsxAttribute', name: 'height', value: String(size.height) },
      ];
      parent.children = [];
    });
  };
}

module.exports = plugin;
