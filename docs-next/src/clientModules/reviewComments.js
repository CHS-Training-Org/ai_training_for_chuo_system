/**
 * 開発サーバー専用: 文言を選択してコメントを残す。
 * 保存先は plugins/review-comments.js。本番ビルドでは何もしない。
 */
const ENDPOINT = '/__review-comments';

function setup() {
  const style = document.createElement('style');
  style.textContent = `
    .rc-btn,.rc-box{position:absolute;z-index:9999;font:14px/1.5 system-ui,sans-serif}
    .rc-btn{background:#d9480f;color:#fff;border:0;border-radius:6px;padding:4px 10px;cursor:pointer;box-shadow:0 2px 8px #0004}
    .rc-box{width:320px;background:#fff;color:#222;border:1px solid #ccc;border-radius:8px;padding:10px;box-shadow:0 4px 16px #0004}
    .rc-box blockquote{margin:0 0 6px;padding:4px 8px;border-left:3px solid #d9480f;background:#fff4e6;max-height:5em;overflow:auto;font-size:12px}
    .rc-box textarea{width:100%;height:80px;box-sizing:border-box}
    .rc-box .rc-row{display:flex;gap:6px;justify-content:flex-end;margin-top:6px}
    .rc-mark{background:#ffe066;cursor:pointer}
  `;
  document.head.appendChild(style);

  let ui = null;
  const clear = () => {
    ui?.remove();
    ui = null;
  };

  const headingOf = (node) => {
    const el = node.nodeType === 1 ? node : node.parentElement;
    let cur = el;
    while (cur && cur !== document.body) {
      let prev = cur;
      while ((prev = prev.previousElementSibling)) {
        const h = prev.matches?.('h1,h2,h3,h4,h5,h6') ? prev : prev.querySelector?.('h1,h2,h3,h4,h5,h6:last-of-type');
        if (h) return h.id ? `${h.textContent.trim()} (#${h.id})` : h.textContent.trim();
      }
      cur = cur.parentElement;
    }
    return '';
  };

  document.addEventListener('mouseup', (e) => {
    if (ui?.contains(e.target)) return;
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || !sel.rangeCount) return clear();
      const range = sel.getRangeAt(0);
      if (!range.commonAncestorContainer.parentElement?.closest('article, .theme-doc-markdown, main')) return clear();
      const rect = range.getBoundingClientRect();
      const heading = headingOf(range.startContainer);
      clear();
      const btn = document.createElement('button');
      btn.className = 'rc-btn';
      btn.textContent = 'コメント';
      btn.style.left = `${rect.left + window.scrollX}px`;
      btn.style.top = `${rect.bottom + window.scrollY + 6}px`;
      btn.onmousedown = (ev) => ev.preventDefault();
      btn.onclick = () => {
        const box = document.createElement('div');
        box.className = 'rc-box';
        box.style.left = btn.style.left;
        box.style.top = btn.style.top;
        const q = document.createElement('blockquote');
        q.textContent = text;
        const ta = document.createElement('textarea');
        ta.placeholder = '直したい内容（Ctrl+Enter で送信）';
        const row = document.createElement('div');
        row.className = 'rc-row';
        const cancel = document.createElement('button');
        cancel.textContent = '閉じる';
        cancel.onclick = clear;
        const send = document.createElement('button');
        send.textContent = '送信';
        const submit = async () => {
          if (!ta.value.trim()) return;
          send.disabled = true;
          try {
            const r = await fetch(ENDPOINT, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                pathname: location.pathname,
                heading,
                selectedText: text,
                comment: ta.value.trim(),
              }),
            });
            if (!r.ok) throw new Error(r.status);
            clear();
            sel.removeAllRanges();
          } catch (err) {
            send.disabled = false;
            alert(`保存に失敗しました: ${err}`);
          }
        };
        send.onclick = submit;
        ta.onkeydown = (ev) => {
          if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) submit();
        };
        row.append(cancel, send);
        box.append(q, ta, row);
        btn.replaceWith(box);
        ui = box;
        ta.focus();
      };
      document.body.appendChild(btn);
      ui = btn;
    }, 0);
  });
}

if (process.env.NODE_ENV === 'development' && typeof document !== 'undefined') {
  setup();
}
