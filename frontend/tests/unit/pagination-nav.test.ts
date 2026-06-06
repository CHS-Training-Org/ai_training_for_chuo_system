/**
 * PaginationNav の buildHref ユーティリティ単体テスト
 *
 * Server Component 本体のレンダリングテストは Next.js のサーバー実行環境が必要なため、
 * ここでは URL 生成ロジック（buildHref）を純関数として検証する。
 */
import { describe, it, expect } from 'vitest'
import { buildHref } from '@/components/ui/pagination-nav'

describe('buildHref', () => {
  describe('基本動作', () => {
    it('page=0 の場合は query に page を含めない（デフォルト扱い）', () => {
      const href = buildHref('/reservations', {}, 0)
      expect(href).toBe('/reservations')
    })

    it('page > 0 の場合は ?page=N を付与する', () => {
      const href = buildHref('/reservations', {}, 2)
      expect(href).toBe('/reservations?page=2')
    })

    it('query が空でも basePath だけ返す（page=0）', () => {
      expect(buildHref('/admin/users', {}, 0)).toBe('/admin/users')
    })
  })

  describe('クエリパラメータの保持', () => {
    it('既存の status フィルタ（文字列）を引き継ぐ', () => {
      const href = buildHref('/reservations', { status: 'PENDING' }, 1)
      expect(href).toBe('/reservations?status=PENDING&page=1')
    })

    it('status が配列の場合、複数の status= を展開する', () => {
      const href = buildHref('/reservations', { status: ['PENDING', 'APPROVED'] }, 1)
      // URLSearchParams は append 順で出力される
      expect(href).toBe('/reservations?status=PENDING&status=APPROVED&page=1')
    })

    it('category フィルタを引き継ぐ', () => {
      const href = buildHref('/resources', { category: 'ROOM' }, 2)
      expect(href).toBe('/resources?category=ROOM&page=2')
    })

    it('undefined 値は除外する', () => {
      const href = buildHref('/resources', { category: undefined, from: undefined }, 1)
      expect(href).toBe('/resources?page=1')
    })

    it('query に page が含まれていても無視して targetPage で上書きする', () => {
      const href = buildHref('/reservations', { page: '3', status: 'APPROVED' }, 2)
      expect(href).toBe('/reservations?status=APPROVED&page=2')
    })

    it('page=0 への遷移（前へ）で元の page キーを消す', () => {
      // page=1 から前へ → page=0 → query に page を含まない
      const href = buildHref('/reservations', { page: '1', status: 'PENDING' }, 0)
      expect(href).toBe('/reservations?status=PENDING')
    })
  })

  describe('from / to を持つリソース一覧', () => {
    it('from・to・category を引き継ぐ', () => {
      const href = buildHref(
        '/resources',
        { category: 'ROOM', from: '2026-06-10T09:00', to: '2026-06-10T12:00' },
        1,
      )
      expect(href).toBe(
        '/resources?category=ROOM&from=2026-06-10T09%3A00&to=2026-06-10T12%3A00&page=1',
      )
    })
  })
})
