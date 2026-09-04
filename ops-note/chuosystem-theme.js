/*
 * chuosystem theme — 教材コンテンツの軽量エンハンス
 * markdown書き出しのHTMLに残るクセ（🙋/👨‍🏫の引用、[ ]チェックリスト、
 * 壊れた画像記法）を、見た目の情報として意味づけし直す。
 */
(function () {
  "use strict";

  var doc = document.querySelector("main.doc");
  if (!doc) return;

  /* 1. Q&A吹き出し判定: 🙋受講者 / 👨‍🏫講師 */
  doc.querySelectorAll("blockquote").forEach(function (bq) {
    var text = bq.textContent || "";
    if (!text.trim()) {
      bq.remove();
      return;
    }
    bq.classList.add("qa");
    if (text.indexOf("🙋") !== -1) {
      bq.classList.add("qa-student");
    } else if (text.indexOf("👨‍🏫") !== -1) {
      bq.classList.add("qa-teacher");
    } else {
      bq.classList.remove("qa");
    }
  });

  /* 2. チェックリスト化: 先頭が "[ ]" の <li> */
  doc.querySelectorAll("li").forEach(function (li) {
    var first = li.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE) {
      var m = first.textContent.match(/^\s*\[\s?\]\s*/);
      if (m) {
        first.textContent = first.textContent.slice(m[0].length);
        li.classList.add("is-check");
        var ul = li.parentElement;
        if (ul && (ul.tagName === "UL" || ul.tagName === "OL")) {
          ul.classList.add("checklist");
        }
      }
    }
  });

  /* 3. 壊れた画像記法の処理: <p>!https://...</p> → 実画像
        <p>!キャプションのみ</p>（URLが失われたもの） → プレースホルダー表示 */
  doc.querySelectorAll("p").forEach(function (p) {
    var text = (p.textContent || "").trim();
    if (/^!https?:\/\/\S+$/.test(text)) {
      var url = text.slice(1);
      var img = document.createElement("img");
      img.src = url;
      img.alt = "手順のスクリーンショット";
      img.loading = "lazy";
      p.textContent = "";
      p.appendChild(img);
    } else if (/^!\S/.test(text)) {
      var caption = text.slice(1).trim();
      p.textContent = "";
      p.classList.add("img-placeholder");
      var icon = document.createElement("span");
      icon.className = "img-placeholder__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "🖼";
      var label = document.createElement("span");
      label.className = "img-placeholder__caption";
      label.textContent = caption || "参考画像";
      p.appendChild(icon);
      p.appendChild(label);
    }
  });
})();
