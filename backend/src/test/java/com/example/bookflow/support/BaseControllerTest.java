package com.example.bookflow.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * 全 Controller 結合テストの基底クラス。
 *
 * <p>継承することで {@link MockMvc}・{@link ObjectMapper}・H2 テストプロファイルが自動的に設定される。 ロール別認証には {@link
 * WithMockMember} / {@link WithMockApprover} / {@link WithMockAdmin} アノテーションを使用する。
 *
 * <p>{@code objectMapper} は Spring Boot 4.0 が Jackson 3.x（{@code tools.jackson.databind}）を
 * オートコンフィグするため、Jackson 2.x 互換インスタンスを直接生成して使用する。
 *
 * <p>注意：{@link BaseControllerTest} 自体のテストはカテゴリ 1 時点では存在しない。 最初の Controller（カテゴリ 3）が実装された時点で初めて
 * exercise される。
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class BaseControllerTest {

  @Autowired private WebApplicationContext webApplicationContext;

  /**
   * テスト用 Jackson 2.x ObjectMapper。
   *
   * <p>Spring Boot 4.0 では Jackson 3.x ({@code tools.jackson.databind.ObjectMapper}) が Bean
   * として登録されるため、Jackson 2.x の {@code ObjectMapper} を直接インスタンス化して使用する。 JSON のワイヤーフォーマット（文字列）は互換。
   */
  protected final ObjectMapper objectMapper =
      new ObjectMapper()
          .registerModule(new JavaTimeModule())
          .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

  protected MockMvc mockMvc;

  @BeforeEach
  void setUpMockMvc() {
    mockMvc =
        MockMvcBuilders.webAppContextSetup(webApplicationContext)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();
  }
}
