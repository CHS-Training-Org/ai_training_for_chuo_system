package com.example.bookflow.infrastructure.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Controller メソッド引数に {@link com.example.bookflow.domain.User} を注入するマーカーアノテーション。
 *
 * <p>{@link CurrentUserArgumentResolver} がこのアノテーション付き引数を解決する。
 *
 * <p>使用例：
 *
 * <pre>{@code
 * @GetMapping("/api/users/me")
 * public UserResponse getMe(@CurrentUser User user) { ... }
 * }</pre>
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.PARAMETER)
public @interface CurrentUser {}
