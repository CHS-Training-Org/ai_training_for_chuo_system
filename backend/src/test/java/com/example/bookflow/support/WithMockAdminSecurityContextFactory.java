package com.example.bookflow.support;

import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

/** {@link WithMockAdmin} のセキュリティコンテキストファクトリ。 */
public class WithMockAdminSecurityContextFactory
    implements WithSecurityContextFactory<WithMockAdmin> {

  @Override
  public SecurityContext createSecurityContext(WithMockAdmin annotation) {
    return MockJwtSecurityContextFactory.createSecurityContext(annotation.sub(), "ADMIN");
  }
}
