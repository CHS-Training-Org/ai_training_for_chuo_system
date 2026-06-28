package com.example.bookflow.infrastructure.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security 設定。OAuth2 Resource Server（JWT 検証）・{@code @PreAuthorize} 有効化・ 統一エラーレスポンスを構成する。
 *
 * <p>JWT 検証は {@code application.yml} の {@code spring.security.oauth2.resourceserver.jwt
 * .jwk-set-uri} に委ね、{@code JwtDecoder} Bean の明示定義は行わない（Spring Boot 自動構成に任せる）。
 *
 * <p>ADR-016 補足：{@code issuer-uri} ではなく {@code jwk-set-uri} を使用するのは、 cognito-local
 * が停止中でも起動できるようにするため（起動時の OIDC discovery を回避）。 {@code custom:role} クレームを {@code ROLE_*}
 * 権限にマッピングするため、{@code hasRole()} を使用する （ADR-016 が例示する {@code hasAuthority("SCOPE_xxx")} とは異なる）。
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth
                    // Swagger UI・API ドキュメント・ヘルスチェックは認証不要
                    .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**")
                    .permitAll()
                    .requestMatchers("/actuator/health")
                    .permitAll()
                    // サインアウトは JWT なしでも受け付ける
                    .requestMatchers(HttpMethod.POST, "/api/auth/signout")
                    .permitAll()
                    // それ以外は認証必須
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            oauth2 ->
                oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
        .exceptionHandling(
            ex ->
                ex.authenticationEntryPoint(new RestAuthenticationEntryPoint())
                    .accessDeniedHandler(new RestAccessDeniedHandler()))
        .build();
  }

  @Bean
  JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(new RoleJwtAuthenticationConverter());
    return converter;
  }
}
