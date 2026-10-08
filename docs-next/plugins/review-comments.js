/**
 * 開発サーバー専用のレビューコメント保存先。
 *
 * ブラウザ上で選んだ文言へのコメントを、dev サーバーと同じポートの
 * `/__review-comments` で受け取り、`.review-comments.json` に書き出す。
 * 本番ビルドには何も加えない。ファイルは git 管理外（.gitignore）。
 */
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.resolve(__dirname, '..', '.review-comments.json');
const ROUTE = '/__review-comments';

function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

function write(items) {
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2) + '\n');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

module.exports = function reviewCommentsPlugin() {
  return {
    name: 'review-comments',
    configureWebpack(_config, isServer) {
      if (isServer || process.env.NODE_ENV === 'production') return {};
      return {
        devServer: {
          setupMiddlewares: (middlewares) => {
            middlewares.unshift({
              name: 'review-comments',
              path: ROUTE,
              middleware: async (req, res) => {
                const send = (code, body) => {
                  res.statusCode = code;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(body));
                };
                try {
                  if (req.method === 'GET') return send(200, read());
                  if (req.method === 'POST') {
                    const b = await readBody(req);
                    if (!b.comment || !b.pathname) return send(400, {error: 'invalid'});
                    const items = read();
                    const item = {
                      id: `c${Date.now().toString(36)}`,
                      createdAt: new Date().toISOString(),
                      status: 'open',
                      pathname: String(b.pathname),
                      heading: String(b.heading || ''),
                      selectedText: String(b.selectedText || ''),
                      comment: String(b.comment),
                    };
                    items.push(item);
                    write(items);
                    return send(200, item);
                  }
                  if (req.method === 'DELETE') {
                    const id = new URL(req.url, 'http://x').searchParams.get('id');
                    write(read().filter((i) => i.id !== id));
                    return send(200, {ok: true});
                  }
                  send(405, {error: 'method'});
                } catch (e) {
                  send(500, {error: String(e)});
                }
              },
            });
            return middlewares;
          },
        },
      };
    },
  };
};
