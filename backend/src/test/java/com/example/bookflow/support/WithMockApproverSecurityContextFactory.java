package com.example.bookflow.support;

import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

/** {@link WithMockApprover} のセキュリティコンテキストファクトリ。 */
public class WithMockApproverSecurityContextFactory
    implements WithSecurityContextFactory<WithMockApprover> {

  @Override
  public SecurityContext createSecurityContext(WithMockApprover annotation) {
    return MockJwtSecurityContextFactory.createSecurityContext(annotation.sub(), "APPROVER");
  }
}
