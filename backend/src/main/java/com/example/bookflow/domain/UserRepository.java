package com.example.bookflow.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * ユーザー Repository インターフェース。
 *
 * <p>{@code open-in-view: false} のため、{@link Department} を遅延ロードせず JOIN FETCH で一括取得する。 遅延ロードを行う場合は
 * {@code LazyInitializationException} が発生するため注意。
 */
public interface UserRepository extends JpaRepository<User, UUID> {

  /**
   * Cognito sub でユーザーを取得する（department を JOIN FETCH）。
   *
   * <p>{@link com.example.bookflow.infrastructure.security.CurrentUserArgumentResolver} が JWT sub
   * から {@link User} を解決するために使用する。
   *
   * @param cognitoSub JWT {@code sub} クレーム値
   * @return 一致するユーザー（未登録の場合は empty）
   */
  @Query("select u from User u join fetch u.department where u.cognitoSub = :cognitoSub")
  Optional<User> findByCognitoSub(@Param("cognitoSub") String cognitoSub);

  /**
   * 全ユーザーを department JOIN FETCH でページ取得する（カテゴリ 5/8 ユーザー一覧用）。
   *
   * <p>JOIN FETCH と Page の組み合わせでは count クエリを明示する必要がある。
   *
   * @param pageable ページング条件
   * @return ユーザーのページ（department 読み込み済み）
   */
  @Query(
      value = "select u from User u join fetch u.department",
      countQuery = "select count(u) from User u")
  Page<User> findAllWithDepartment(Pageable pageable);

  /**
   * 指定ロールのユーザーを 1 件取得する（承認者割当用）。
   *
   * <p>ベース実装では {@code role = 'APPROVER'} のユーザーが seed に 1 名存在することを前提とする。 複数存在する場合は最初の 1 件を返す（順序未定義）。
   * 承認者が存在しない場合は {@link java.util.Optional#empty()} を返す。
   *
   * @param role 対象ロール
   * @return 該当ロールのユーザー（存在しない場合は empty）
   */
  Optional<User> findFirstByRole(Role role);
}
