package com.example.bookflow.infrastructure.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Springdoc OpenAPI 設定。Swagger UI に Bearer JWT 認証入力欄を追加する（ADR-015 準拠）。
 *
 * <p>{@code http://localhost:8080/swagger-ui.html} で確認可能。
 */
@Configuration
public class OpenApiConfig {

  private static final String BEARER_SCHEME_NAME = "bearerAuth";

  @Bean
  public OpenAPI openApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("BookFlow API")
                .description("施設・備品予約システム BookFlow のバックエンド REST API")
                .version("1.0.0"))
        .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME_NAME))
        .components(
            new Components()
                .addSecuritySchemes(
                    BEARER_SCHEME_NAME,
                    new SecurityScheme()
                        .name(BEARER_SCHEME_NAME)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
  }
}
