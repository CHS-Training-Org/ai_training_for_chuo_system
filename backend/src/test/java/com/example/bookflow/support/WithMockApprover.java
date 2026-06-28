package com.example.bookflow.support;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.test.context.support.WithSecurityContext;

/**
 * {@code APPROVER} ロールのモック JWT を注入するテストアノテーション。
 *
 * <p>使用例：
 *
 * <pre>{@code
 * @Test
 * @WithMockApprover
 * void someTest() { ... }
 * }</pre>
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
@WithSecurityContext(factory = WithMockApproverSecurityContextFactory.class)
public @interface WithMockApprover {

  /** モック JWT の {@code sub} クレーム値。 */
  String sub() default "test-approver-sub";
}
