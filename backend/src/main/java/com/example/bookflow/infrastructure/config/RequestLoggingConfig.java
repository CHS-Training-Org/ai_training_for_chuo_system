package com.example.bookflow.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.CommonsRequestLoggingFilter;

@Configuration
public class RequestLoggingConfig {

  @Bean
  public CommonsRequestLoggingFilter requestLoggingFilter() {
    var filter = new CommonsRequestLoggingFilter();
    filter.setIncludeQueryString(true);
    filter.setIncludeClientInfo(false);
    filter.setIncludeHeaders(false);
    filter.setIncludePayload(false);
    return filter;
  }
}
