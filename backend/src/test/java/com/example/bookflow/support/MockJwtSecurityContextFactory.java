package com.example.bookflow.support;

import java.time.Instant;
import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** {@code @WithMock*} アノテーション用のモック JWT セキュリティコンテキストファクトリ共通ロジック。 */
public final class MockJwtSecurityContextFactory {

  private MockJwtSecurityContextFactory() {}

  /**
   * 指定ロールを持つモック JWT の {@link SecurityContext} を生成する。
   *
   * <p>JWT の {@code custom:role} クレームと {@link SecurityConfig} の {@code
   * RoleJwtAuthenticationConverter} が付与する {@code ROLE_*} 権限を一致させる。
   *
   * @param sub JWT {@code sub} クレーム（ユーザー識別子）
   * @param role ロール文字列（{@code MEMBER} / {@code APPROVER} / {@code ADMIN}）
   * @return モック JWT を認証として持つ {@link SecurityContext}
   */
  public static SecurityContext createSecurityContext(String sub, String role) {
    Jwt jwt =
        Jwt.withTokenValue("mock-token")
            .header("alg", "none")
            .subject(sub)
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .claim("custom:role", role)
            .build();

    JwtAuthenticationToken auth =
        new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_" + role)));

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(auth);
    return context;
  }
}
