package com.example.bookflow.infrastructure.config;

import com.example.bookflow.domain.UserRepository;
import com.example.bookflow.infrastructure.security.CurrentUserArgumentResolver;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVC 拡張設定。
 *
 * <p>{@link CurrentUserArgumentResolver} を登録し、{@link
 * com.example.bookflow.infrastructure.security.CurrentUser} アノテーション付き Controller 引数に {@link
 * com.example.bookflow.domain.User} を注入できるようにする。
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  private final UserRepository userRepository;

  public WebMvcConfig(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
    resolvers.add(new CurrentUserArgumentResolver(userRepository));
  }
}
