# Services

## ResourceService.list のオーケストレーション
1. Controller が `keyword` を正規化して渡す（空は null）
2. Service が `ResourceSpecifications.forList(category, keyword, isAdmin)` を生成
3. 分岐
   - `from`/`to` なし: `resourceRepository.findAll(spec, pageable)` → `ResourceResponse::from`
   - `from`/`to` あり: `resourceRepository.findAll(spec)` で候補取得 → `findByResource_IdInAndStatusIn` で占有 ID を 1 クエリ取得 → `overlaps` で除外 → 手動ページング（現状維持。Q4=A）

## 変更しないもの
- `overlaps`、`availability`、`create`、`update`、`changeStatus`、`get`
- `ReservationRepository` の呼び出し
