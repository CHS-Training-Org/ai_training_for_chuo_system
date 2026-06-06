package com.example.bookflow.support;

import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

/** {@link WithMockMember} のセキュリティコンテキストファクトリ。 */
public class WithMockMemberSecurityContextFactory
    implements WithSecurityContextFactory<WithMockMember> {

  @Override
  public SecurityContext createSecurityContext(WithMockMember annotation) {
    return MockJwtSecurityContextFactory.createSecurityContext(annotation.sub(), "MEMBER");
  }
}
