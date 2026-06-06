package com.example.bookflow.infrastructure.security;

import java.util.Collection;
import java.util.List;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Cognito JWT の {@code custom:role} クレームを Spring Security の {@code ROLE_*} 権限に変換する。
 *
 * <p>{@code requirements.md} AUTH-03 準拠：クレーム値は {@code MEMBER} / {@code APPROVER} / {@code ADMIN}
 * のスカラー文字列。1 クレーム → 1 権限（{@code ROLE_MEMBER} 等）に変換し、 {@code @PreAuthorize("hasRole('ADMIN')")}
 * などで参照できるようにする。
 */
class RoleJwtAuthenticationConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

  @Override
  public Collection<GrantedAuthority> convert(Jwt jwt) {
    String role = jwt.getClaimAsString("custom:role");
    if (role == null || role.isBlank()) {
      return List.of();
    }
    return List.of(new SimpleGrantedAuthority("ROLE_" + role));
  }
}
